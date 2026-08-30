"""Rule-based merit-order dispatch (v1 policy; Layer 2 replaces it with a solver).

Each hour, serve the facility electrical load from the built assets in order:
  1. on-site renewables (solar, wind) + must-run clean baseload (nuclear)
  2. surplus renewable -> charge battery -> export -> curtail
  3. deficit -> discharge battery
  4. still short -> run dispatchable on-site (gas)
  5. still short -> import from grid
Battery state of charge carries across the 24-hour day.
"""

from __future__ import annotations

import numpy as np

from ..config import SOURCE_SPECS
from ..curves import Curves
from ..models import DCModel, EnergyFrame

GAS_CARBON = SOURCE_SPECS["gas"]["carbon"]
SOLAR_CARBON = SOURCE_SPECS["solar"]["carbon"]
WIND_CARBON = SOURCE_SPECS["wind"]["carbon"]
NUCLEAR_CARBON = SOURCE_SPECS["nuclear"]["carbon"]
BATTERY_CARBON = 15.0  # throughput carbon proxy (charged from surplus renewables)


def run_dispatch(
    model: DCModel,
    served_load_mw: np.ndarray,
    outputs: dict[str, np.ndarray],
    curves: Curves,
) -> tuple[list[EnergyFrame], dict]:
    n = 24
    solar = outputs.get("solar", np.zeros(n))
    wind = outputs.get("wind", np.zeros(n))
    nuclear = outputs.get("nuclear", np.zeros(n))
    gas_cap = outputs.get("gas_cap", np.zeros(n))

    bat = model.storage[0] if model.storage else None
    bat_power = bat.power_mw if bat else 0.0
    bat_energy = bat.energy_mwh if bat else 0.0
    rt = bat.round_trip_eff if bat else 1.0
    soc = 0.5 * bat_energy  # start half full
    interconnect = model.grid.interconnect_mw
    cue = np.zeros(n)

    frames: list[EnergyFrame] = []
    acc = {
        "grid_import_mwh": 0.0,
        "grid_export_mwh": 0.0,
        "gas_mwh": 0.0,
        "solar_mwh": 0.0,
        "wind_mwh": 0.0,
        "nuclear_mwh": 0.0,
        "curtailed_mwh": 0.0,
        "battery_throughput_mwh": 0.0,
        "carbon_t": 0.0,
        "clean_mwh": 0.0,
        "served_mwh": 0.0,
        "grid_carbon_weighted": 0.0,
    }

    for h in range(n):
        load = float(served_load_mw[h])
        renew = float(solar[h] + wind[h])
        nuke = float(nuclear[h])

        supply = renew + nuke
        net = load - supply  # >0 deficit, <0 surplus

        charge = discharge = grid_import = grid_export = curtail = gas = 0.0

        if net >= 0:
            # deficit: discharge battery, then gas, then grid
            discharge = min(bat_power, soc, net)
            soc -= discharge
            net -= discharge
            if net > 0:
                gas = min(gas_cap[h], net)
                net -= gas
            if net > 0:
                grid_import = min(interconnect, net)
                net -= grid_import
        else:
            # surplus renewable: charge, export, curtail
            surplus = -net
            room = bat_energy - soc
            charge = min(bat_power, surplus, room / max(rt, 1e-6))
            soc += charge * rt
            surplus -= charge
            grid_export = min(interconnect, surplus)
            surplus -= grid_export
            curtail = max(0.0, surplus)

        # --- attribute carbon only to energy that actually serves the load,
        #     in merit order: renewables+nuclear -> battery -> gas -> grid ---
        renew_gen = float(solar[h] + wind[h])
        served_rn = min(load, renew_gen + nuke)
        served_bat = min(load - served_rn, discharge)
        served_gas = min(load - served_rn - served_bat, gas)
        served_grid = grid_import
        clean_gen = renew_gen + nuke
        clean_blend = (
            (
                (
                    solar[h] * SOLAR_CARBON
                    + wind[h] * WIND_CARBON
                    + nuke * NUCLEAR_CARBON
                )
                / clean_gen
            )
            if clean_gen > 0
            else 0.0
        )
        carbon_mw_g = (
            served_rn * clean_blend
            + served_bat * BATTERY_CARBON
            + served_gas * GAS_CARBON
            + served_grid * curves.grid_carbon[h]
        )
        cue_h = carbon_mw_g / max(load, 1e-6)  # gCO2e/kWh of served load
        cue[h] = cue_h
        clean_served = served_rn + served_bat

        acc["carbon_t"] += carbon_mw_g / 1000.0  # MW*g/kWh over 1h -> tonnes
        acc["clean_mwh"] += clean_served
        acc["served_mwh"] += load
        acc["grid_import_mwh"] += grid_import
        acc["grid_export_mwh"] += grid_export
        acc["gas_mwh"] += gas
        acc["solar_mwh"] += float(solar[h])
        acc["wind_mwh"] += float(wind[h])
        acc["nuclear_mwh"] += nuke
        acc["curtailed_mwh"] += curtail
        acc["battery_throughput_mwh"] += discharge

        frames.append(
            EnergyFrame(
                solar_mw=round(float(solar[h]), 3),
                wind_mw=round(float(wind[h]), 3),
                gas_mw=round(gas, 3),
                nuclear_mw=round(nuke, 3),
                battery_charge_mw=round(charge, 3),
                battery_discharge_mw=round(discharge, 3),
                battery_soc=round(soc / bat_energy, 3) if bat_energy else 0.0,
                grid_import_mw=round(grid_import, 3),
                grid_export_mw=round(grid_export, 3),
                curtailed_mw=round(curtail, 3),
                grid_carbon_g_per_kwh=round(float(curves.grid_carbon[h]), 1),
                import_price=round(float(curves.price[h]), 4),
                served_load_mw=round(load, 3),
                clean_frac=round(clean_served / max(load, 1e-6), 3),
            )
        )

    return frames, acc, cue
