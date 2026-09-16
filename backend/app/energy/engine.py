"""Compare physical supply and grid-only scenarios on shared hourly demand paths."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from time import perf_counter

import numpy as np

from ..forecast.assumptions import MODEL_VERSION
from ..forecast.engine import (
    FloatArray,
    calculate_facility_power,
    calculate_it_power,
    iter_hourly_demand,
)
from ..forecast.models import QuantileValues
from .dispatch import StorageState, dispatch_hours
from .flexibility import defer_work
from .models import (
    COUPLING_VERSION,
    CoolingWater,
    CouplingProvenance,
    CouplingRequest,
    CouplingResult,
    EnergyHour,
    EnergyMetrics,
    EnergyPeriod,
    PortfolioComparison,
    PortfolioResult,
    SupplyPortfolio,
)
from .resources import GenerationHours, generation_hours, scenario_temperature

LOGGER = logging.getLogger(__name__)
PathTotals = dict[str, FloatArray | None]


def grid_only_portfolio() -> SupplyPortfolio:
    """Remove dedicated generation and storage without altering the grid connection."""
    return SupplyPortfolio(
        solar_mw=0,
        wind_mw=0,
        hydro_mw=0,
        nuclear_mw=0,
        gas_mw=0,
        battery_power_mw=0,
        battery_energy_mwh=0,
    )


def cooling_water_requirement(
    it_power: FloatArray, ambient: FloatArray, water: CoolingWater
) -> FloatArray:
    """Estimate cooling consumption needed to serve all requested IT work."""
    if water.heat_rejection == "dry":
        wet_fraction: float | FloatArray = 0.0
    elif water.heat_rejection == "evaporative":
        wet_fraction = 1.0
    else:
        wet_fraction = np.clip((ambient - 10.0) / 25.0, 0.0, 1.0)
    temperature_factor = np.clip(
        1.0 + water.temperature_sensitivity_per_c * (ambient - 20.0), 0.2, 3.0
    )
    return (
        it_power
        * 1_000.0
        * water.consumption_l_per_it_kwh
        * wet_fraction
        * temperature_factor
    )


def _quantile(values: FloatArray) -> QuantileValues:
    values = np.where(np.abs(values) < 1e-9, 0.0, values)
    low, median, high = np.quantile(values, [0.1, 0.5, 0.9])
    return QuantileValues(
        p10=round(float(low), 6), p50=round(float(median), 6), p90=round(float(high), 6)
    )


def _monthly_totals(
    load: FloatArray,
    work: FloatArray,
    shifted: FloatArray,
    water: FloatArray,
    flow: dict[str, FloatArray],
    request: CouplingRequest,
    supply: SupplyPortfolio,
) -> PathTotals:
    source_metrics = {
        "grid_import_mwh": "grid_to_load",
        "grid_export_mwh": "grid_export",
        "solar_generation_mwh": "solar_generation",
        "wind_generation_mwh": "wind_generation",
        "hydro_generation_mwh": "hydro_generation",
        "nuclear_generation_mwh": "nuclear_generation",
        "gas_generation_mwh": "gas_generation",
        "battery_charge_mwh": "battery_charge",
        "battery_discharge_mwh": "battery_to_load",
        "battery_losses_mwh": "battery_losses",
        "curtailed_mwh": "curtailed",
        "unserved_energy_mwh": "unserved",
        "operational_carbon_t": "operational_carbon",
        "variable_energy_cost_usd": "variable_energy_cost",
        "renewable_served_mwh": "renewable_served",
    }
    totals: PathTotals = {
        metric: flow[source].sum(axis=1) for metric, source in source_metrics.items()
    }
    totals.update(
        {
            "required_energy_mwh": load.sum(axis=1),
            "served_energy_mwh": (load - flow["unserved"]).sum(axis=1),
            "peak_grid_import_mw": flow["grid_to_load"].max(axis=1),
            "renewable_generation_mwh": (
                flow["solar_generation"]
                + flow["wind_generation"]
                + flow["hydro_generation"]
            ).sum(axis=1),
            "shortfall_hours": (flow["unserved"] > 1e-6).sum(axis=1).astype(float),
            "cooling_water_consumption_l": water.sum(axis=1),
            "cooling_water_withdrawal_l": (
                water.sum(axis=1) * request.cooling_water.withdrawal_multiplier
            ),
            "hydro_water_consumption_l": (
                flow["hydro_generation"].sum(axis=1)
                * 1_000
                * supply.hydro_water_consumption_l_per_kwh
                if supply.hydro_water_consumption_l_per_kwh is not None
                else np.zeros(load.shape[0])
                if supply.hydro_mw == 0
                else None
            ),
            "requested_compute_mwh_equivalent": work.sum(axis=1),
            "shifted_compute_mwh_equivalent": shifted.sum(axis=1),
        }
    )
    return totals


def _values(totals: PathTotals, key: str) -> FloatArray:
    values = totals[key]
    if values is None:
        raise ValueError(f"{key} is unknown and cannot be used as an observed zero")
    return values


def _metrics(totals: PathTotals) -> EnergyMetrics:
    metrics = {
        name: _quantile(values) if values is not None else None
        for name, values in totals.items()
    }
    required = _values(totals, "required_energy_mwh")
    matched = _values(totals, "renewable_served_mwh")
    metrics["renewable_match_pct"] = _quantile(
        np.divide(
            matched * 100.0, required, out=np.zeros_like(required), where=required > 0.0
        )
    )
    return EnergyMetrics(**metrics)


def _aggregate(months: list[PathTotals]) -> PathTotals:
    totals: PathTotals = {}
    for name in months[0]:
        if any(month[name] is None for month in months):
            totals[name] = None
            continue
        values = np.stack([_values(month, name) for month in months], axis=1)
        totals[name] = (
            values.max(axis=1) if name == "peak_grid_import_mw" else values.sum(axis=1)
        )
    return totals


def _comparison(proposed: PathTotals, baseline: PathTotals) -> PortfolioComparison:
    proposed_failures = int(np.count_nonzero(_values(proposed, "shortfall_hours")))
    baseline_failures = int(np.count_nonzero(_values(baseline, "shortfall_hours")))
    comparable = proposed_failures == 0 and baseline_failures == 0

    def delta(key: str) -> float | None:
        reference = _values(baseline, key)
        denominator = float(np.median(reference))
        if not comparable or abs(denominator) < 1e-9:
            return None
        difference = float(np.median(_values(proposed, key) - reference))
        return round(100.0 * difference / abs(denominator), 3)

    return PortfolioComparison(
        comparable=comparable,
        explanation=(
            "Both portfolios serve all requested load in every sampled hour. "
            "Changes are paired scenario differences, not validated savings."
            if comparable
            else f"Unserved load occurs in {proposed_failures} proposed and "
            f"{baseline_failures} baseline paths. Savings claims are withheld: "
            "less electricity served is not equivalent computing service."
        ),
        carbon_change_pct_p50=delta("operational_carbon_t"),
        grid_import_change_pct_p50=delta("grid_import_mwh"),
        peak_grid_change_pct_p50=delta("peak_grid_import_mw"),
        variable_cost_change_pct_p50=delta("variable_energy_cost_usd"),
        cooling_water_change_pct_p50=delta("cooling_water_consumption_l"),
    )


def _provenance(path_index: int) -> CouplingProvenance:
    return CouplingProvenance(
        demand_model_version=MODEL_VERSION,
        trace_path_index=path_index,
        trace_label=(
            f"Simulated path {path_index + 1}, selected near median full-horizon "
            "proposed carbon. Hourly components are not independent P50 values."
        ),
        assumptions=[
            "R0 synthetic assumptions; no operational telemetry or external feeds.",
            "Physical on-site/direct supply, not off-site contracts or RECs.",
            "Shared synthetic site clock with no local timezone or DST data.",
            "Same requested work, buildout, cooling, weather, and grid connection.",
            (
                "Deferral is a perfect-foresight heuristic on aggregate work. "
                "It preserves daily work, capacity, and bounded delay; it is not "
                "a job SLA model or a capacity/dispatch optimizer."
            ),
            (
                "Battery starts empty, carries charge across days/months, charges only "
                "from physical surplus, and tracks renewable origin and losses. "
                "Terminal stored energy is not credited as load served."
            ),
            (
                "Dedicated renewable coverage measures delivery to load, including "
                "its stored portion. Nuclear and unspecified grid renewables "
                "are not counted; exports do not offset unmatched hours."
            ),
            (
                "Operational carbon counts grid imports and generation-side gas/hydro "
                "factors, including exported output; discharge is not counted twice. "
                "Solar, wind, and nuclear use a zero-direct-emissions assumption. "
                "No lifecycle, market-based Scope 2, or avoided-emissions claims."
            ),
            (
                "Variable costs use illustrative tariffs and operating costs only. "
                "No capex, demand charges, water tariffs, financing, or price forecast."
            ),
            (
                "Cooling-water values are requirements to serve the full workload, "
                "not savings from unmet demand. Heat rejection is independent of "
                "air/liquid chip cooling and does not automatically change design "
                "PUE. Domestic water and upstream generation water are excluded."
            ),
            (
                "Hydro uses synthetic run-of-river availability or a daily energy "
                "budget. No river routing, dam design, environmental-flow "
                "certification, or unlimited firm hydro assumption. Turbine flow "
                "is not water consumption."
            ),
        ],
    )


def run_coupling(request: CouplingRequest) -> CouplingResult:
    """Evaluate a specified physical portfolio against a same-demand grid baseline."""
    started = perf_counter()
    empty_supply = grid_only_portfolio()
    proposed_state = StorageState.empty(request.sample_count)
    baseline_state = StorageState.empty(request.sample_count)
    proposed_months: list[PathTotals] = []
    baseline_months: list[PathTotals] = []
    periods: list[str] = []
    trace_arrays: dict[str, FloatArray] = {}
    trace_timestamps: list[str] = []

    for index, batch in enumerate(
        iter_hourly_demand(request.demand, request.sample_count, request.seed)
    ):
        ambient = scenario_temperature(request, batch)
        original_load = calculate_facility_power(
            request.demand,
            batch.it_power,
            batch.work,
            batch.capacity,
            ambient,
            batch.pue_offset,
        )
        generation = generation_hours(request, batch, ambient, index)
        available_supply = generation.renewable_available + generation.nuclear
        score = np.divide(
            np.maximum(0.0, original_load - available_supply) * batch.grid_carbon,
            original_load,
            out=np.zeros_like(original_load),
            where=original_load > 0.0,
        )
        phases, shifted = defer_work(batch.phases, score, request.flexibility)
        capacity, work, it_power = calculate_it_power(phases)
        proposed_load = calculate_facility_power(
            request.demand, it_power, work, capacity, ambient, batch.pue_offset
        )
        proposed_flow = dispatch_hours(
            proposed_load,
            generation,
            batch.grid_carbon,
            request.supply,
            request.grid,
            proposed_state,
        )
        zeros = np.zeros_like(original_load)
        empty_generation = GenerationHours(
            zeros,
            zeros,
            zeros,
            zeros,
            zeros,
            zeros,
            np.zeros((request.sample_count, original_load.shape[1] // 24)),
        )
        baseline_flow = dispatch_hours(
            original_load,
            empty_generation,
            batch.grid_carbon,
            empty_supply,
            request.grid,
            baseline_state,
        )
        proposed_water = cooling_water_requirement(
            it_power, ambient, request.cooling_water
        )
        baseline_water = cooling_water_requirement(
            batch.it_power, ambient, request.cooling_water
        )
        proposed_months.append(
            _monthly_totals(
                proposed_load,
                work,
                shifted,
                proposed_water,
                proposed_flow,
                request,
                request.supply,
            )
        )
        baseline_months.append(
            _monthly_totals(
                original_load,
                batch.work,
                zeros,
                baseline_water,
                baseline_flow,
                request,
                empty_supply,
            )
        )
        periods.append(batch.period)
        if index + 1 == request.trace_month:
            mapping = {
                "installed_it_mw": capacity,
                "it_power_mw": it_power,
                "original_it_power_mw": batch.it_power,
                "effective_utilization": np.divide(
                    work, capacity, out=np.zeros_like(work), where=capacity > 0
                ),
                "original_effective_utilization": np.divide(
                    batch.work, capacity, out=np.zeros_like(work), where=capacity > 0
                ),
                "original_load_mw": original_load,
                "required_load_mw": proposed_load,
                "solar_available_mw": generation.solar,
                "wind_available_mw": generation.wind,
                "renewable_available_mw": generation.renewable_available,
                "renewable_to_load_mw": proposed_flow["renewable_served"],
                "baseline_grid_import_mw": baseline_flow["grid_to_load"],
                "baseline_unserved_mw": baseline_flow["unserved"],
                "ambient_c": ambient,
                "grid_carbon_g_per_kwh": batch.grid_carbon,
                "cooling_water_consumption_l": proposed_water,
                "cooling_water_withdrawal_l": (
                    proposed_water * request.cooling_water.withdrawal_multiplier
                ),
                "operational_carbon_t": proposed_flow["operational_carbon"],
                "variable_energy_cost_usd": proposed_flow["variable_energy_cost"],
                "baseline_operational_carbon_t": baseline_flow["operational_carbon"],
                "baseline_variable_energy_cost_usd": baseline_flow[
                    "variable_energy_cost"
                ],
                "baseline_cooling_water_consumption_l": baseline_water,
                "baseline_cooling_water_withdrawal_l": (
                    baseline_water * request.cooling_water.withdrawal_multiplier
                ),
            }
            for source in ("solar", "wind", "hydro", "nuclear", "gas"):
                mapping[f"{source}_generation_mw"] = proposed_flow[
                    f"{source}_generation"
                ]
            for source in (
                "solar",
                "wind",
                "hydro",
                "nuclear",
                "battery",
                "gas",
                "grid",
            ):
                mapping[f"{source}_to_load_mw"] = proposed_flow[f"{source}_to_load"]
            for source in ("unserved", "battery_charge", "grid_export", "curtailed"):
                mapping[f"{source}_mw"] = proposed_flow[source]
            mapping["battery_state_mwh"] = proposed_flow["battery_state"]
            trace_arrays = {
                name: values[:, :168].copy() for name, values in mapping.items()
            }
            trace_timestamps = [str(hour) for hour in batch.hours[:168]]

    proposed_totals = _aggregate(proposed_months)
    baseline_totals = _aggregate(baseline_months)
    carbon = _values(proposed_totals, "operational_carbon_t")
    path_index = int(np.argmin(np.abs(carbon - np.median(carbon))))
    trace = [
        EnergyHour(
            timestamp=timestamp,
            hydro_water_consumption_l=(
                round(
                    float(trace_arrays["hydro_generation_mw"][path_index, hour])
                    * 1_000
                    * request.supply.hydro_water_consumption_l_per_kwh,
                    6,
                )
                if request.supply.hydro_water_consumption_l_per_kwh is not None
                else 0.0
                if request.supply.hydro_mw == 0
                else None
            ),
            **{
                name: round(float(values[path_index, hour]), 6)
                for name, values in trace_arrays.items()
            },
        )
        for hour, timestamp in enumerate(trace_timestamps)
    ]
    comparison = _comparison(proposed_totals, baseline_totals)
    warnings = [
        "Synthetic scenario analysis, not a validated site prediction or optimal plan."
    ]
    if not comparison.comparable:
        warnings.append(comparison.explanation)
    if (
        request.supply.hydro_mw > 0
        and request.supply.hydro_water_consumption_l_per_kwh is None
    ):
        warnings.append(
            "Hydro water consumption is unknown. No total-water claim is available; "
            "turbine flow must not be added to cooling-water consumption."
        )
    if request.flexibility.fraction > 0:
        warnings.append(
            "Flexible work uses future synthetic availability as a heuristic, not an "
            "operational forecast. Deferral can improve or worsen scenario outcomes."
        )
    serialized = json.dumps(
        request.model_dump(mode="json"), sort_keys=True, separators=(",", ":")
    )
    fingerprint = hashlib.sha256(
        f"{COUPLING_VERSION}:{MODEL_VERSION}:{serialized}".encode()
    ).hexdigest()[:12]
    result = CouplingResult(
        run_id=f"coupling-{fingerprint}",
        generated_at=datetime.now(timezone.utc),
        sample_count=request.sample_count,
        seed=request.seed,
        proposed=PortfolioResult(
            name="Proposed physical portfolio",
            summary=_metrics(proposed_totals),
            periods=[
                EnergyPeriod(period=period, metrics=_metrics(values))
                for period, values in zip(periods, proposed_months, strict=True)
            ],
            final_battery_energy_mwh=_quantile(proposed_state.energy),
        ),
        baseline=PortfolioResult(
            name="Grid-only, original work schedule",
            summary=_metrics(baseline_totals),
            periods=[
                EnergyPeriod(period=period, metrics=_metrics(values))
                for period, values in zip(periods, baseline_months, strict=True)
            ],
            final_battery_energy_mwh=_quantile(baseline_state.energy),
        ),
        comparison=comparison,
        hourly_trace=trace,
        warnings=warnings,
        provenance=_provenance(path_index),
    )
    LOGGER.info(
        "Coupling run %s: paths=%d months=%d elapsed=%.2fs comparable=%s",
        result.run_id,
        request.sample_count,
        len(periods),
        perf_counter() - started,
        comparison.comparable,
    )
    return result
