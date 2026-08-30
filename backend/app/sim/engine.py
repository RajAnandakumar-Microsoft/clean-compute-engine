"""Simulation engine: builds a deterministic 24-hour timeline for a design and
serves interpolated telemetry frames. Holds the current control state.

The whole day is precomputed (seeded) when a design is built or the scenario
changes, so scrubbing and streaming are just lookups + interpolation.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .. import config as cfg
from ..curves import build_curves
from ..generator import build_model
from ..models import (
    CompareDimension,
    CompareResult,
    ControlState,
    DCModel,
    DesignConfig,
    EnergyBuild,
    EnergyFrame,
    FacilityKPIs,
    FinanceReport,
    GpuTelemetry,
    HallTelemetry,
    LifetimeReport,
    RackTelemetry,
    ScheduleResult,
    ServerTelemetry,
    TelemetryFrame,
)
from .aggregate import hall_rollup, rack_rollup
from .dispatch import run_dispatch
from .finance import compute_finance
from .generation import source_outputs
from .jobs import activity_matrix
from .physics import effective_pue, gpu_power_w, gpu_temp_c, water_l_s, workload_util

GAS_OPEX = cfg.SOURCE_SPECS["gas"]["opex_per_mwh"]


@dataclass
class Timeline:
    scenario: str
    frames: list[EnergyFrame]
    kpis: list[FacilityKPIs]
    hall: dict[str, np.ndarray]
    rack: dict[str, np.ndarray]
    gpu_power_w: np.ndarray
    gpu_util: np.ndarray
    gpu_temp: np.ndarray
    daily: dict


def _build_timeline(model: DCModel, config: DesignConfig, scenario: str) -> Timeline:
    loc = cfg.get_location(config.location)
    curves = build_curves(loc, scenario, config.seed)
    cooling = config.it_build.cooling
    n = model.total_gpus

    util_frac = workload_util(config, curves)
    active, gpu_util = activity_matrix(
        n, util_frac, config.toggles.placement, config.seed
    )
    tdp = np.array([g.tdp_w for g in model.gpus])
    p_w = gpu_power_w(active, gpu_util, tdp)
    t_c = gpu_temp_c(active, gpu_util, curves.ambient_c, cooling)

    rack_index = {r.id: i for i, r in enumerate(model.racks)}
    rack_of_gpu = np.array([rack_index[g.rack_id] for g in model.gpus])
    R = len(model.racks)

    rack = rack_rollup(
        p_w,
        gpu_util,
        t_c,
        active,
        rack_of_gpu,
        R,
        config.it_build.servers_per_rack,
        curves.ambient_c,
    )
    hall = hall_rollup(rack)

    it_kw = hall["it_kw"]
    pue = effective_pue(model.facility.design_pue, curves.ambient_c, cooling)
    facility_kw = it_kw * pue
    served_load_mw = facility_kw / 1000.0

    outputs = source_outputs(model, curves)
    frames, acc, cue = run_dispatch(model, served_load_mw, outputs, curves)
    water = water_l_s(facility_kw, cooling, curves.water_stress, curves.ambient_c)

    # per-hour facility KPIs
    kpis: list[FacilityKPIs] = []
    energy_cum = 0.0
    for h in range(24):
        f = frames[h]
        cue_h = float(cue[h])
        dollars_hr = (
            f.grid_import_mw * 1000 * f.import_price
            - f.grid_export_mw * 1000 * config.finance.export_price
            + f.gas_mw * GAS_OPEX
        )
        energy_cum += facility_kw[h]
        wue = float(water[h] * 3600 / max(facility_kw[h], 1e-6))
        kpis.append(
            FacilityKPIs(
                it_kw=round(float(it_kw[h]), 1),
                facility_kw=round(float(facility_kw[h]), 1),
                pue=round(float(pue[h]), 3),
                wue=round(wue, 3),
                cue=round(cue_h, 1),
                live_carbon_g_s=round(float(facility_kw[h] * cue_h / 3600), 2),
                water_l_s=round(float(water[h]), 3),
                dollars_per_hr=round(float(dollars_hr), 1),
                pct_renewable=round(f.clean_frac * 100, 1),
                energy_today_kwh=round(energy_cum, 1),
                util=round(float(gpu_util[h].mean()), 3),
            )
        )

    daily = dict(acc)
    daily["it_mwh"] = float(it_kw.sum()) / 1000.0
    daily["water_l"] = float(water.sum() * 3600)
    return Timeline(
        scenario=scenario,
        frames=frames,
        kpis=kpis,
        hall=hall,
        rack=rack,
        gpu_power_w=p_w,
        gpu_util=gpu_util,
        gpu_temp=t_c,
        daily=daily,
    )


def _lerp(a: float, b: float, f: float) -> float:
    return a * (1 - f) + b * f


class Engine:
    def __init__(self, config: DesignConfig):
        self.set_config(config)

    def set_config(self, config: DesignConfig) -> None:
        self.config = config
        self.model = build_model(config)
        # finance is a design property: always evaluated on a normal day
        normal = _build_timeline(self.model, config, "normal")
        self.finance: FinanceReport = compute_finance(self.model, config, normal.daily)
        self._timelines: dict[str, Timeline] = {"normal": normal}
        self.control = ControlState(
            playing=True, speed=10.0, hour=13.0, scenario="normal", detail_rack_id=None
        )
        # cache gpu grouping for detail path
        self._gpu_of_rack: dict[str, list[int]] = {}
        self._servers: dict[str, list] = {}
        for i, g in enumerate(self.model.gpus):
            self._gpu_of_rack.setdefault(g.rack_id, []).append(i)
        for s in self.model.servers:
            self._servers.setdefault(s.rack_id, []).append(s)

    def _timeline(self, scenario: str | None = None) -> Timeline:
        sc = scenario or self.control.scenario
        if sc not in self._timelines:
            self._timelines[sc] = _build_timeline(self.model, self.config, sc)
        return self._timelines[sc]

    def curve_data(self) -> dict:
        c = build_curves(
            cfg.get_location(self.config.location),
            self.control.scenario,
            self.config.seed,
        )
        return {
            "grid_carbon": [round(x, 1) for x in c.grid_carbon.tolist()],
            "price": [round(x, 4) for x in c.price.tolist()],
            "solar_cf": [round(x, 3) for x in c.solar_cf.tolist()],
            "wind_cf": [round(x, 3) for x in c.wind_cf.tolist()],
        }

    # -- control --------------------------------------------------------------
    def apply_control(self, action: str, **kw) -> None:
        c = self.control
        if action == "play":
            c.playing = True
        elif action == "pause":
            c.playing = False
        elif action == "speed" and kw.get("speed") is not None:
            c.speed = float(kw["speed"])
        elif action == "scrub" and kw.get("hour") is not None:
            c.hour = float(kw["hour"]) % 24
        elif action == "scenario" and kw.get("scenario"):
            c.scenario = kw["scenario"]
        elif action == "subscribe":
            c.detail_rack_id = kw.get("rack_id")

    def advance(self, sim_hours: float) -> None:
        if self.control.playing:
            self.control.hour = (self.control.hour + sim_hours) % 24

    # -- frame assembly -------------------------------------------------------
    def frame(self) -> TelemetryFrame:
        tl = self._timeline()
        hour = self.control.hour
        h0 = int(math.floor(hour)) % 24
        h1 = (h0 + 1) % 24
        f = hour - math.floor(hour)

        k0, k1 = tl.kpis[h0], tl.kpis[h1]
        kpis = FacilityKPIs(
            **{
                key: round(_lerp(getattr(k0, key), getattr(k1, key), f), 3)
                for key in k0.model_fields
            }
        )
        energy = self._lerp_energy(tl.frames[h0], tl.frames[h1], f)

        halls = [
            HallTelemetry(
                id="hall-0",
                it_kw=round(_lerp(tl.hall["it_kw"][h0], tl.hall["it_kw"][h1], f), 1),
                avg_temp_c=round(
                    _lerp(tl.hall["avg_temp"][h0], tl.hall["avg_temp"][h1], f), 1
                ),
                max_temp_c=round(
                    _lerp(tl.hall["max_temp"][h0], tl.hall["max_temp"][h1], f), 1
                ),
                util=round(_lerp(tl.hall["util"][h0], tl.hall["util"][h1], f), 3),
                active_racks=int(
                    round(
                        _lerp(
                            tl.hall["active_racks"][h0], tl.hall["active_racks"][h1], f
                        )
                    )
                ),
            )
        ]

        cue = kpis.cue
        racks: list[RackTelemetry] = []
        rp0, rp1 = tl.rack["power_kw"][h0], tl.rack["power_kw"][h1]
        ru0, ru1 = tl.rack["util"][h0], tl.rack["util"][h1]
        ro0, ro1 = tl.rack["outlet_c"][h0], tl.rack["outlet_c"][h1]
        ri0, ri1 = tl.rack["inlet_c"][h0], tl.rack["inlet_c"][h1]
        for i, rk in enumerate(self.model.racks):
            power = _lerp(rp0[i], rp1[i], f)
            outlet = _lerp(ro0[i], ro1[i], f)
            inlet = _lerp(ri0[i], ri1[i], f)
            util = _lerp(ru0[i], ru1[i], f)
            racks.append(
                RackTelemetry(
                    id=rk.id,
                    power_kw=round(power, 2),
                    pct_capacity=round(power / max(rk.breaker_kw, 1e-6) * 100, 1),
                    inlet_c=round(inlet, 1),
                    outlet_c=round(outlet, 1),
                    delta_t=round(outlet - inlet, 1),
                    util=round(util, 3),
                    live_carbon_g_s=round(power * cue / 3600, 3),
                    cooling_load_kw=round(power * (kpis.pue - 1), 2),
                )
            )

        frame = TelemetryFrame(
            hour=round(hour, 3),
            scenario=tl.scenario,
            kpis=kpis,
            energy=energy,
            halls=halls,
            racks=racks,
        )
        if self.control.detail_rack_id:
            self._attach_detail(frame, tl, self.control.detail_rack_id, h0, h1, f, cue)
        return frame

    def _attach_detail(self, frame, tl, rack_id, h0, h1, f, cue) -> None:
        idxs = self._gpu_of_rack.get(rack_id, [])
        if not idxs:
            return
        frame.detail_rack_id = rack_id
        gpu_objs = {i: self.model.gpus[i] for i in idxs}
        server_active: dict[str, list[float]] = {}
        for i in idxs:
            g = gpu_objs[i]
            power = _lerp(tl.gpu_power_w[h0, i], tl.gpu_power_w[h1, i], f)
            util = _lerp(tl.gpu_util[h0, i], tl.gpu_util[h1, i], f)
            temp = _lerp(tl.gpu_temp[h0, i], tl.gpu_temp[h1, i], f)
            idle = util < 0.05
            frame.gpus.append(
                GpuTelemetry(
                    id=g.id,
                    power_w=round(power, 1),
                    util=round(util, 3),
                    temp_c=round(temp, 1),
                    mem_used_gb=round(util * g.memory_gb, 1),
                    job_id=None if idle else f"job-{g.server_id}",
                    idle=idle,
                    live_carbon_g_s=round(power / 1000 * cue / 3600, 4),
                )
            )
            server_active.setdefault(g.server_id, []).append(util)
        for s in self._servers.get(rack_id, []):
            utils = server_active.get(s.id, [0.0])
            mean_u = float(np.mean(utils))
            frame.servers.append(
                ServerTelemetry(
                    id=s.id,
                    power_kw=round(s.rated_power_kw * (0.35 + 0.65 * mean_u), 2),
                    util=round(mean_u, 3),
                    temp_c=round(
                        float(
                            _lerp(tl.hall["avg_temp"][h0], tl.hall["avg_temp"][h1], f)
                        ),
                        1,
                    ),
                    active_jobs=int(sum(1 for u in utils if u > 0.05)),
                    idle=mean_u < 0.05,
                )
            )

    @staticmethod
    def _lerp_energy(a: EnergyFrame, b: EnergyFrame, f: float) -> EnergyFrame:
        return EnergyFrame(
            **{
                key: round(_lerp(getattr(a, key), getattr(b, key), f), 3)
                for key in a.model_fields
            }
        )


# --- helpers used by /schedule and /compare (independent of the live engine) --


def design_finance(config: DesignConfig) -> tuple[DCModel, FinanceReport]:
    model = build_model(config)
    tl = _build_timeline(model, config, "normal")
    return model, compute_finance(model, config, tl.daily)


def compute_schedule(config: DesignConfig, scenario: str) -> ScheduleResult:
    model = build_model(config)
    off = config.model_copy(deep=True)
    off.toggles.smart_scheduling = False
    on = config.model_copy(deep=True)
    on.toggles.smart_scheduling = True
    tl_off = _build_timeline(model, off, scenario)
    tl_on = _build_timeline(model, on, scenario)

    c_before = tl_off.daily["carbon_t"]
    c_after = tl_on.daily["carbon_t"]
    b_before = tl_off.daily["battery_throughput_mwh"]
    b_after = tl_on.daily["battery_throughput_mwh"]
    avg_active_servers = float(
        np.mean([(tl_on.gpu_util[h] > 0.05).sum() for h in range(24)])
    ) / max(config.it_build.gpus_per_server, 1)
    shifted = int(round(config.workload.deferrable_frac * avg_active_servers))

    delta_pct = (c_after - c_before) / max(c_before, 1e-6) * 100
    note = (
        f"Shifting {config.workload.deferrable_frac * 100:.0f}% deferrable load to the "
        f"cleanest hours cuts carbon {abs(delta_pct):.0f}% and trims storage reliance "
        f"from {b_before:.0f} to {b_after:.0f} MWh/day."
    )
    return ScheduleResult(
        enabled=True,
        carbon_before_t=round(c_before, 2),
        carbon_after_t=round(c_after, 2),
        carbon_delta_pct=round(delta_pct, 1),
        battery_need_before_mwh=round(b_before, 1),
        battery_need_after_mwh=round(b_after, 1),
        shifted_jobs=shifted,
        note=note,
    )


def _dim(label, a, b, unit, better) -> CompareDimension:
    delta = b - a
    return CompareDimension(
        label=label,
        a=round(a, 2),
        b=round(b, 2),
        delta=round(delta, 2),
        delta_pct=round(delta / a * 100, 1) if a else 0.0,
        unit=unit,
        better=better,
    )


def compare_designs(
    name_a: str, fin_a: FinanceReport, name_b: str, fin_b: FinanceReport
) -> CompareResult:
    dims = [
        _dim(
            "Net annual cost",
            fin_a.net_annual_cost,
            fin_b.net_annual_cost,
            "$/yr",
            "lower",
        ),
        _dim("Total capex", fin_a.capex.total, fin_b.capex.total, "$", "lower"),
        _dim(
            "Annual carbon",
            fin_a.annual_carbon_t,
            fin_b.annual_carbon_t,
            "tCO2e/yr",
            "lower",
        ),
        _dim(
            "Annual water",
            fin_a.annual_water_ml,
            fin_b.annual_water_ml,
            "ML/yr",
            "lower",
        ),
        _dim(
            "24/7 clean match",
            fin_a.clean_match_pct,
            fin_b.clean_match_pct,
            "%",
            "higher",
        ),
        _dim(
            "Payback",
            fin_a.payback_years or 0.0,
            fin_b.payback_years or 0.0,
            "yr",
            "lower",
        ),
    ]
    return CompareResult(name_a=name_a, name_b=name_b, dimensions=dims)


LIFETIME_YEARS = [0.5, 1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50]
CAR_TCO2_PER_YR = 4.6  # avg passenger car annual emissions (tCO2e)
TREE_TCO2_PER_YR = 0.021  # a mature tree sequesters ~21 kg CO2/yr
HOME_MWH_PER_YR = 10.5  # avg US home annual electricity use


def lifetime_projection(config: DesignConfig) -> LifetimeReport:
    """Project cumulative impact over the years vs a grid-only baseline."""
    d_model = build_model(config)
    d_tl = _build_timeline(d_model, config, "normal")
    d_fin = compute_finance(d_model, config, d_tl.daily)

    base = config.model_copy(deep=True)
    grid_cap = round(
        d_model.installed_it_mw * d_model.facility.design_pue * 1.35 + 1, 1
    )
    base.energy_build = EnergyBuild(
        grid_interconnect_mw=grid_cap,
        solar_mw=0,
        wind_mw=0,
        gas_mw=0,
        nuclear_mw=0,
        battery_mwh=0,
        battery_mw=0,
    )
    b_model = build_model(base)
    b_tl = _build_timeline(b_model, base, "normal")
    b_fin = compute_finance(b_model, base, b_tl.daily)

    embodied = d_model.embodied.total_co2e_t
    d_annual_carbon = d_tl.daily["carbon_t"] * 365
    b_annual_carbon = b_tl.daily["carbon_t"] * 365
    annual_avoided = b_annual_carbon - d_annual_carbon
    annual_clean_gwh = d_tl.daily["clean_mwh"] * 365 / 1000
    annual_water_ml = d_tl.daily["water_l"] * 365 / 1e6

    d_operating = d_fin.net_annual_cost - d_fin.annualized_capex
    b_operating = b_fin.net_annual_cost - b_fin.annualized_capex

    years = LIFETIME_YEARS
    d_carbon = [round(embodied + d_annual_carbon * y) for y in years]
    b_carbon = [round(embodied + b_annual_carbon * y) for y in years]
    avoided = [round(annual_avoided * y) for y in years]
    d_tco = [round(d_fin.capex.total + d_operating * y) for y in years]
    b_tco = [round(b_fin.capex.total + b_operating * y) for y in years]
    saved = [b_tco[i] - d_tco[i] for i in range(len(years))]
    clean = [round(annual_clean_gwh * y, 1) for y in years]
    water = [round(annual_water_ml * y, 1) for y in years]
    cars = [round(max(0.0, annual_avoided * y) / CAR_TCO2_PER_YR) for y in years]
    trees = [round(max(0.0, annual_avoided * y) / TREE_TCO2_PER_YR) for y in years]
    homes = round(annual_clean_gwh * 1000 / HOME_MWH_PER_YR)

    return LifetimeReport(
        years=years,
        design_carbon_t=d_carbon,
        baseline_carbon_t=b_carbon,
        avoided_carbon_t=avoided,
        design_tco=d_tco,
        baseline_tco=b_tco,
        saved_cost=saved,
        clean_gwh=clean,
        water_ml=water,
        cars_equiv=cars,
        trees_equiv=trees,
        homes_equiv=homes,
        embodied_t=round(embodied, 1),
        annual_avoided_carbon_t=round(annual_avoided, 1),
        annual_clean_gwh=round(annual_clean_gwh, 2),
    )
