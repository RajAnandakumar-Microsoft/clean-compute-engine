"""Chronological physical dispatch with explicit shortages and conserved storage."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ..forecast.engine import FloatArray
from .models import GridConnection, SupplyPortfolio
from .resources import GenerationHours

# Illustrative variable operating costs only; not capex or a project-cost model.
VARIABLE_COST_PER_MWH = {
    "solar": 8.0,
    "wind": 10.0,
    "hydro": 15.0,
    "nuclear": 20.0,
    "gas": 75.0,
}


@dataclass
class StorageState:
    """Stored energy and its renewable portion, carried across month boundaries."""

    energy: FloatArray
    renewable_energy: FloatArray

    @classmethod
    def empty(cls, sample_count: int) -> StorageState:
        """Start with no unearned initial battery charge."""
        return cls(np.zeros(sample_count), np.zeros(sample_count))


def dispatch_hours(
    load: FloatArray,
    generation: GenerationHours,
    grid_carbon: FloatArray,
    supply: SupplyPortfolio,
    grid: GridConnection,
    state: StorageState,
) -> dict[str, FloatArray]:
    """Serve load from generation, reservoir release, storage, gas, and grid.

    Batteries charge only from physical on-site surplus, never from the grid.
    Nuclear is tracked separately from renewable energy. Exports earn a tariff
    credit but never an automatic avoided-emissions credit.
    """
    names = [
        "solar_to_load",
        "wind_to_load",
        "hydro_to_load",
        "nuclear_to_load",
        "battery_to_load",
        "gas_to_load",
        "grid_to_load",
        "unserved",
        "battery_charge",
        "battery_state",
        "battery_losses",
        "grid_export",
        "curtailed",
        "renewable_served",
        "operational_carbon",
        "variable_energy_cost",
        "solar_generation",
        "wind_generation",
        "hydro_generation",
        "nuclear_generation",
        "gas_generation",
    ]
    result = {name: np.zeros_like(load) for name in names}
    efficiency = np.sqrt(supply.battery_round_trip_efficiency)
    import_limit = grid.import_limit_mw if grid.import_limit_mw is not None else np.inf
    reservoir_remaining = np.zeros(load.shape[0])
    variable_sources = ("solar", "wind", "hydro", "nuclear")
    for hour in range(load.shape[1]):
        if hour % 24 == 0:
            reservoir_remaining = generation.reservoir_daily_budget[
                :, hour // 24
            ].copy()
        available = {
            name: getattr(generation, name)[:, hour] for name in variable_sources
        }
        total_available = sum(available.values())
        direct_fraction = np.divide(
            np.minimum(load[:, hour], total_available),
            total_available,
            out=np.zeros_like(total_available),
            where=total_available > 0.0,
        )
        for name in variable_sources:
            result[f"{name}_to_load"][:, hour] = available[name] * direct_fraction
        remaining_load = np.maximum(0.0, load[:, hour] - total_available)
        release = np.minimum(
            remaining_load,
            np.minimum(generation.reservoir_capacity[:, hour], reservoir_remaining),
        )
        reservoir_remaining -= release
        remaining_load -= release
        result["hydro_to_load"][:, hour] += release

        renewable_fraction = np.divide(
            state.renewable_energy,
            state.energy,
            out=np.zeros_like(state.energy),
            where=state.energy > 1e-12,
        )
        discharge = np.minimum(
            remaining_load,
            np.minimum(supply.battery_power_mw, state.energy * efficiency),
        )
        withdrawn = discharge / efficiency
        state.energy -= withdrawn
        state.renewable_energy -= withdrawn * renewable_fraction
        state.energy = np.maximum(0.0, state.energy)
        state.renewable_energy = np.clip(state.renewable_energy, 0.0, state.energy)
        remaining_load -= discharge
        gas = np.minimum(remaining_load, generation.gas_capacity[:, hour])
        remaining_load -= gas
        grid_import = np.minimum(remaining_load, import_limit)
        result["unserved"][:, hour] = np.maximum(0.0, remaining_load - grid_import)

        surplus = np.maximum(0.0, total_available - load[:, hour])
        charge = np.minimum(
            surplus,
            np.minimum(
                supply.battery_power_mw,
                np.maximum(0.0, supply.battery_energy_mwh - state.energy) / efficiency,
            ),
        )
        surplus_renewable_fraction = np.divide(
            available["solar"] + available["wind"] + available["hydro"],
            total_available,
            out=np.zeros_like(total_available),
            where=total_available > 0.0,
        )
        stored = charge * efficiency
        state.energy += stored
        state.renewable_energy += stored * surplus_renewable_fraction
        grid_export = np.minimum(
            np.maximum(0.0, surplus - charge), grid.export_limit_mw
        )
        curtailed = np.maximum(0.0, surplus - charge - grid_export)
        used_fraction = np.divide(
            total_available - curtailed,
            total_available,
            out=np.zeros_like(total_available),
            where=total_available > 0.0,
        )
        for name in variable_sources:
            result[f"{name}_generation"][:, hour] = available[name] * used_fraction
        result["hydro_generation"][:, hour] += release
        result["gas_generation"][:, hour] = gas
        result["battery_to_load"][:, hour] = discharge
        result["gas_to_load"][:, hour] = gas
        result["grid_to_load"][:, hour] = grid_import
        result["battery_charge"][:, hour] = charge
        result["battery_state"][:, hour] = state.energy
        result["battery_losses"][:, hour] = charge - stored + withdrawn - discharge
        result["grid_export"][:, hour] = grid_export
        result["curtailed"][:, hour] = curtailed
        result["renewable_served"][:, hour] = (
            result["solar_to_load"][:, hour]
            + result["wind_to_load"][:, hour]
            + result["hydro_to_load"][:, hour]
            + discharge * renewable_fraction
        )
        # Count source emissions when generated, including storage losses/exports.
        # Battery discharge is not counted a second time.
        result["operational_carbon"][:, hour] = (
            grid_import * grid_carbon[:, hour]
            + gas * supply.gas_operational_g_per_kwh
            + result["hydro_generation"][:, hour] * supply.hydro_operational_g_per_kwh
        ) / 1_000.0
        source_cost = sum(
            result[f"{name}_generation"][:, hour] * cost
            for name, cost in VARIABLE_COST_PER_MWH.items()
        )
        result["variable_energy_cost"][:, hour] = (
            grid_import * 1_000 * grid.import_price_per_kwh
            - grid_export * 1_000 * grid.export_price_per_kwh
            + source_cost
            + (charge + discharge) * 2.0
        )
    return result
