"""Synthetic hourly availability; no weather, generation, or customer data feeds."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ..forecast.engine import FloatArray, HourlyDemand
from .models import CouplingRequest

# Solar peak, wind mean, and daylight-season amplitude for broad archetypes.
RESOURCE_PRIORS = {
    "az-desert": (0.85, 0.24, 2.5),
    "tx-plains": (0.76, 0.42, 2.5),
    "va-loudoun": (0.68, 0.25, 3.5),
    "pnw-hydro": (0.60, 0.32, 4.5),
}


@dataclass
class GenerationHours:
    """Available source power and a separate reservoir daily energy budget."""

    solar: FloatArray
    wind: FloatArray
    hydro: FloatArray
    nuclear: FloatArray
    gas_capacity: FloatArray
    reservoir_capacity: FloatArray
    reservoir_daily_budget: FloatArray

    @property
    def renewable_available(self) -> FloatArray:
        """Use an even daily reservoir allocation only as a scheduling signal."""
        budget_profile = np.repeat(self.reservoir_daily_budget / 24.0, 24, axis=1)
        return self.solar + self.wind + self.hydro + budget_profile


def scenario_temperature(request: CouplingRequest, batch: HourlyDemand) -> FloatArray:
    """Apply the same explicit heat stress to load, solar, and cooling water."""
    return batch.ambient + (8.0 if request.weather_case == "hot-dry" else 0.0)


def generation_hours(
    request: CouplingRequest,
    batch: HourlyDemand,
    ambient: FloatArray,
    month_index: int,
) -> GenerationHours:
    """Generate bounded availability on the demand model's exact hourly clock."""
    supply = request.supply
    hours = batch.hours
    sample_count, hour_count = ambient.shape
    days = hours.astype("datetime64[D]")
    hour_of_day = (hours - days).astype("timedelta64[h]").astype(float)
    day_of_year = (days - hours.astype("datetime64[Y]").astype("datetime64[D]")).astype(
        float
    )
    day_count = hour_count // 24
    solar_peak, wind_mean, day_amplitude = RESOURCE_PRIORS[request.demand.location]
    rng = np.random.default_rng(request.seed + 500_000 + month_index)
    daily_cloud = np.clip(rng.normal(0.85, 0.15, (sample_count, day_count)), 0.15, 1.0)
    daily_wind = np.clip(rng.normal(1.0, 0.30, (sample_count, day_count)), 0.05, 1.8)
    daily_inflow = np.clip(rng.normal(1.0, 0.12, (sample_count, day_count)), 0.3, 1.5)
    solar_stress = wind_stress = hydro_stress = 1.0
    if request.weather_case == "hot-dry":
        wind_stress, hydro_stress = 0.70, 0.40
    elif request.weather_case == "low-renewables":
        solar_stress, wind_stress, hydro_stress = 0.35, 0.35, 0.65

    daylight = 12.0 + day_amplitude * np.sin(2 * np.pi * (day_of_year - 80) / 365.2425)
    sunrise = 12.0 - daylight / 2.0
    solar_shape = np.where(
        (hour_of_day >= sunrise) & (hour_of_day <= sunrise + daylight),
        np.maximum(0.0, np.sin(np.pi * (hour_of_day - sunrise) / daylight)),
        0.0,
    )
    commissioned = np.datetime64(
        (supply.commissioning_date or request.demand.start_date).isoformat(), "h"
    )
    years = np.maximum(
        (hours - commissioned).astype("timedelta64[h]").astype(float), 0.0
    ) / (365.2425 * 24)
    active = (hours >= commissioned).astype(float)[None, :]
    temperature_derate = np.clip(
        1.0 - 0.004 * np.maximum(ambient - 25.0, 0.0), 0.7, 1.0
    )
    solar_cf = np.clip(
        solar_peak
        * solar_shape[None, :] ** 1.3
        * np.repeat(daily_cloud, 24, axis=1)
        * temperature_derate
        * np.power(0.995, years)[None, :]
        * solar_stress,
        0.0,
        1.0,
    )
    wind_shape = 1.0 + 0.15 * np.cos(2 * np.pi * (hour_of_day - 3.0) / 24)
    wind_cf = np.clip(
        wind_mean
        * wind_shape[None, :]
        * np.repeat(daily_wind, 24, axis=1)
        * wind_stress,
        0.0,
        1.0,
    )
    runoff_season = 1.0 + 0.35 * np.cos(
        2 * np.pi * (day_of_year[::24] - 105) / 365.2425
    )
    hydro_cf = np.clip(
        supply.hydro_capacity_factor
        * runoff_season[None, :]
        * daily_inflow
        * hydro_stress,
        0.0,
        1.0,
    )
    shape = (sample_count, hour_count)
    run_of_river = supply.hydro_mode == "run-of-river"
    return GenerationHours(
        solar=supply.solar_mw * solar_cf * active,
        wind=supply.wind_mw * wind_cf * active,
        hydro=(
            supply.hydro_mw * np.repeat(hydro_cf, 24, axis=1) * active
            if run_of_river
            else np.zeros(shape)
        ),
        nuclear=np.broadcast_to(
            supply.nuclear_mw * supply.nuclear_availability * active, shape
        ).copy(),
        gas_capacity=np.broadcast_to(supply.gas_mw * active, shape).copy(),
        reservoir_capacity=(
            np.zeros(shape)
            if run_of_river
            else np.broadcast_to(supply.hydro_mw * active, shape).copy()
        ),
        reservoir_daily_budget=(
            np.zeros((sample_count, day_count))
            if run_of_river
            else supply.hydro_mw * 24.0 * hydro_cf * active[:, ::24]
        ),
    )
