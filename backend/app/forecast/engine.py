"""Hourly, assumption-driven Monte Carlo forecasting engine."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone

import numpy as np
from numpy.typing import NDArray

from .assumptions import (
    ASSUMPTION_SET_VERSION,
    DISCLAIMER,
    HARDWARE_PRIORS,
    LOCATION_PRIORS,
    MODEL_VERSION,
)
from .models import (
    DriverSensitivity,
    ForecastPeriod,
    ForecastProvenance,
    ForecastResult,
    ForecastRunRequest,
    ForecastScenario,
    ForecastSeries,
    HorizonDelta,
    HorizonSummary,
    QuantileValues,
)

FloatArray = NDArray[np.float64]
HOURS_PER_YEAR = 365.2425 * 24.0


@dataclass
class _SimulationArrays:
    """Path-level monthly arrays retained for aggregation and paired comparison."""

    labels: list[str]
    installed_capacity: FloatArray
    utilization_numerator: FloatArray
    capacity_hours: FloatArray
    it_energy: FloatArray
    facility_energy: FloatArray
    carbon: FloatArray
    peak_facility_power: FloatArray
    drivers: dict[str, FloatArray]


def _circular_distance(values: FloatArray, center: float, period: float) -> FloatArray:
    distance = np.abs(values - center)
    return np.minimum(distance, period - distance)


def _raw_workload_shapes(
    hour_of_day: FloatArray,
    day_of_week: FloatArray,
) -> dict[str, FloatArray]:
    weekday = day_of_week < 5
    training = (0.96 + 0.04 * np.cos(2 * np.pi * (hour_of_day - 14) / 24)) * np.where(
        weekday,
        1.0,
        0.96,
    )
    real_time = 0.35 + 0.70 * np.exp(
        -0.5 * (_circular_distance(hour_of_day, 16.0, 24.0) / 5.0) ** 2
    )
    real_time *= np.where(weekday, 1.0, 0.84)
    batch = 0.40 + 0.85 * np.exp(
        -0.5 * (_circular_distance(hour_of_day, 2.0, 24.0) / 4.0) ** 2
    )
    batch *= np.where(weekday, 1.0, 1.15)
    development = np.where(
        weekday,
        0.12 + 0.95 * np.exp(-0.5 * ((hour_of_day - 14.0) / 4.0) ** 2),
        0.10,
    )
    return {
        "training": training,
        "real_time_inference": real_time,
        "batch_inference": batch,
        "development": development,
    }


def _workload_shape(
    hour_of_day: FloatArray,
    day_of_week: FloatArray,
    scenario: ForecastScenario,
) -> FloatArray:
    raw = _raw_workload_shapes(hour_of_day, day_of_week)
    canonical_hours = np.tile(np.arange(24, dtype=np.float64), 7)
    canonical_days = np.repeat(np.arange(7, dtype=np.float64), 24)
    canonical = _raw_workload_shapes(canonical_hours, canonical_days)
    mix = scenario.workload_mix
    weighted = np.zeros_like(hour_of_day, dtype=np.float64)
    for name, share in (
        ("training", mix.training),
        ("real_time_inference", mix.real_time_inference),
        ("batch_inference", mix.batch_inference),
        ("development", mix.development),
    ):
        weighted += share * raw[name] / float(canonical[name].mean())
    return weighted


def _path_parameters(
    scenario: ForecastScenario,
    sample_count: int,
    seed: int,
) -> dict[str, FloatArray]:
    uncertainty = scenario.uncertainty
    rng = np.random.default_rng(seed + 101)
    utilization_level = np.clip(
        rng.normal(1.0, uncertainty.utilization_relative_sd, sample_count),
        0.35,
        1.65,
    )
    pue_offset = np.clip(
        rng.normal(0.0, uncertainty.pue_absolute_sd, sample_count),
        -0.25,
        0.40,
    )
    grid_carbon_level = np.clip(
        rng.normal(1.0, uncertainty.grid_carbon_relative_sd, sample_count),
        0.35,
        1.90,
    )
    grid_decarbonization = np.clip(
        rng.normal(
            scenario.grid.annual_decarbonization_rate,
            uncertainty.grid_decarbonization_sd,
            sample_count,
        ),
        -0.05,
        0.20,
    )
    weather_bias = np.clip(rng.normal(0.0, 0.8, sample_count), -3.0, 3.0)
    return {
        "utilization_level": utilization_level,
        "pue_offset": pue_offset,
        "grid_carbon_level": grid_carbon_level,
        "grid_decarbonization": grid_decarbonization,
        "weather_bias": weather_bias,
    }


def _phase_delays(
    scenario: ForecastScenario,
    sample_count: int,
    seed: int,
) -> list[FloatArray]:
    standard_deviation = scenario.uncertainty.phase_start_delay_months_sd
    delays: list[FloatArray] = []
    for index, _phase in enumerate(scenario.phases):
        rng = np.random.default_rng(seed + 1_000 + index)
        delay = np.clip(
            rng.normal(0.0, standard_deviation, sample_count),
            -24.0,
            24.0,
        )
        delays.append(delay)
    return delays


def _calendar_parts(
    hours: NDArray[np.datetime64],
    start_hour: np.datetime64,
) -> tuple[FloatArray, FloatArray, FloatArray, FloatArray]:
    days = hours.astype("datetime64[D]")
    hour_of_day = (hours - days).astype("timedelta64[h]").astype(np.float64)
    day_of_week = ((days.astype(np.int64) + 3) % 7).astype(np.float64)
    year_starts = hours.astype("datetime64[Y]").astype("datetime64[D]")
    day_of_year = (days - year_starts).astype(np.float64)
    year_fraction = (hours - start_hour).astype("timedelta64[h]").astype(
        np.float64
    ) / HOURS_PER_YEAR
    return hour_of_day, day_of_week, day_of_year, year_fraction


def _daily_mapping(
    hours: NDArray[np.datetime64],
) -> tuple[int, NDArray[np.int64]]:
    days = hours.astype("datetime64[D]")
    _unique_days, inverse = np.unique(days, return_inverse=True)
    return int(inverse.max()) + 1, inverse


def _utilization_multiplier(
    scenario: ForecastScenario,
    sample_count: int,
    hour_count: int,
    day_count: int,
    day_inverse: NDArray[np.int64],
    seed: int,
    month_index: int,
) -> FloatArray:
    uncertainty = scenario.uncertainty
    rng = np.random.default_rng(seed + 100_000 + month_index)
    volatility = uncertainty.hourly_utilization_volatility
    daily = rng.normal(0.0, volatility, (sample_count, day_count))
    hourly = rng.normal(0.0, volatility * 0.35, (sample_count, hour_count))
    rare = rng.random((sample_count, day_count))
    signs = np.where(rng.random((sample_count, day_count)) < 0.7, 1.0, -1.0)
    rare_change = np.where(
        rare < uncertainty.rare_event_probability_per_day,
        signs * uncertainty.rare_event_utilization_change,
        0.0,
    )
    log_change = daily[:, day_inverse] + hourly + rare_change[:, day_inverse]
    variance_adjustment = 0.5 * (volatility**2 + (volatility * 0.35) ** 2)
    return np.exp(log_change - variance_adjustment)


def _ambient_temperature(
    scenario: ForecastScenario,
    path_parameters: dict[str, FloatArray],
    hour_of_day: FloatArray,
    day_of_year: FloatArray,
    sample_count: int,
    day_count: int,
    day_inverse: NDArray[np.int64],
    seed: int,
    month_index: int,
) -> FloatArray:
    location = LOCATION_PRIORS[scenario.location]
    seasonal = np.cos(2 * np.pi * (day_of_year - 205.0) / 365.2425)
    daily = np.cos(2 * np.pi * (hour_of_day - 15.0) / 24.0)
    deterministic = (
        location.annual_mean_temp_c
        + location.seasonal_temp_amplitude_c * seasonal
        + location.daily_temp_amplitude_c * daily
    )
    rng = np.random.default_rng(seed + 200_000 + month_index)
    weather = rng.normal(
        0.0,
        scenario.uncertainty.daily_weather_sd_c,
        (sample_count, day_count),
    )
    return (
        deterministic[None, :]
        + path_parameters["weather_bias"][:, None]
        + weather[:, day_inverse]
    )


def _grid_carbon_intensity(
    scenario: ForecastScenario,
    path_parameters: dict[str, FloatArray],
    hour_of_day: FloatArray,
    day_of_year: FloatArray,
    year_fraction: FloatArray,
    sample_count: int,
    hour_count: int,
    day_count: int,
    day_inverse: NDArray[np.int64],
    seed: int,
    month_index: int,
) -> FloatArray:
    location = LOCATION_PRIORS[scenario.location]
    base = (
        scenario.grid.carbon_intensity_override_g_per_kwh
        or location.grid_carbon_g_per_kwh
    )
    evening = np.exp(-0.5 * (_circular_distance(hour_of_day, 19.0, 24.0) / 3.0) ** 2)
    midday = np.exp(-0.5 * (_circular_distance(hour_of_day, 13.0, 24.0) / 3.5) ** 2)
    diurnal = (
        1.0
        + location.grid_diurnal_amplitude * evening
        - 0.35 * location.grid_diurnal_amplitude * midday
    )
    diurnal /= float(diurnal.mean())
    seasonal = 1.0 + 0.08 * np.cos(2 * np.pi * (day_of_year - 15.0) / 365.2425)

    rng = np.random.default_rng(seed + 300_000 + month_index)
    relative_sd = scenario.uncertainty.grid_carbon_relative_sd
    daily = rng.normal(0.0, relative_sd * 0.35, (sample_count, day_count))
    hourly = rng.normal(0.0, relative_sd * 0.15, (sample_count, hour_count))
    short_term = np.exp(
        daily[:, day_inverse]
        + hourly
        - 0.5 * ((relative_sd * 0.35) ** 2 + (relative_sd * 0.15) ** 2)
    )
    annual_factor = np.power(
        1.0 - path_parameters["grid_decarbonization"][:, None],
        year_fraction[None, :],
    )
    intensity = (
        base
        * path_parameters["grid_carbon_level"][:, None]
        * annual_factor
        * diurnal[None, :]
        * seasonal[None, :]
        * short_term
    )
    return np.clip(intensity, 20.0, 1_200.0)


def _simulate_scenario(
    scenario: ForecastScenario,
    sample_count: int,
    seed: int,
) -> _SimulationArrays:
    start_month = np.datetime64(scenario.start_date.isoformat(), "M")
    months = np.arange(
        start_month,
        start_month + np.timedelta64(scenario.horizon_years * 12, "M"),
        dtype="datetime64[M]",
    )
    labels = [str(month) for month in months]
    month_count = len(months)
    shape = (sample_count, month_count)
    installed_capacity = np.zeros(shape, dtype=np.float64)
    utilization_numerator = np.zeros(shape, dtype=np.float64)
    capacity_hours = np.zeros(shape, dtype=np.float64)
    it_energy = np.zeros(shape, dtype=np.float64)
    facility_energy = np.zeros(shape, dtype=np.float64)
    carbon = np.zeros(shape, dtype=np.float64)
    peak_facility_power = np.zeros(shape, dtype=np.float64)

    start_hour = np.datetime64(scenario.start_date.isoformat(), "h")
    parameters = _path_parameters(scenario, sample_count, seed)
    phase_delays = _phase_delays(scenario, sample_count, seed)

    for month_index, month in enumerate(months):
        month_start = month.astype("datetime64[h]")
        month_end = (month + np.timedelta64(1, "M")).astype("datetime64[h]")
        hours = np.arange(month_start, month_end, dtype="datetime64[h]")
        hour_count = len(hours)
        day_count, day_inverse = _daily_mapping(hours)
        hour_of_day, day_of_week, day_of_year, year_fraction = _calendar_parts(
            hours,
            start_hour,
        )
        workload_shape = _workload_shape(hour_of_day, day_of_week, scenario)
        stochastic_multiplier = _utilization_multiplier(
            scenario,
            sample_count,
            hour_count,
            day_count,
            day_inverse,
            seed,
            month_index,
        )

        total_capacity = np.zeros((sample_count, hour_count), dtype=np.float64)
        total_utilization_numerator = np.zeros_like(total_capacity)
        total_it_power = np.zeros_like(total_capacity)

        for phase_index, phase in enumerate(scenario.phases):
            phase_hour = np.datetime64(phase.start_date.isoformat(), "h")
            phase_offset_months = (phase_hour - start_hour).astype(
                "timedelta64[h]"
            ).astype(float) / (HOURS_PER_YEAR / 12.0)
            absolute_months = year_fraction * 12.0
            age_months = (
                absolute_months[None, :]
                - phase_offset_months
                - phase_delays[phase_index][:, None]
            )
            active = age_months >= 0.0
            capacity = phase.it_capacity_mw * active
            progress = np.clip(age_months / phase.ramp_months, 0.0, 1.0)
            progress = progress * progress * (3.0 - 2.0 * progress)
            target_utilization = (
                phase.initial_utilization
                + (phase.mature_utilization - phase.initial_utilization) * progress
            )
            utilization = np.clip(
                target_utilization
                * workload_shape[None, :]
                * parameters["utilization_level"][:, None]
                * stochastic_multiplier,
                0.0,
                0.99,
            )
            utilization *= active

            prior = HARDWARE_PRIORS[phase.hardware_profile]
            refresh_count = np.floor(
                np.clip(age_months, 0.0, None) / (phase.refresh_interval_years * 12.0)
            )
            efficiency = np.clip(
                np.power(1.0 - phase.refresh_efficiency_gain, refresh_count),
                0.50,
                1.0,
            )
            power_fraction = prior.idle_power_fraction + (
                1.0 - prior.idle_power_fraction
            ) * np.power(utilization, prior.power_curve_exponent)
            phase_power = capacity * efficiency * power_fraction

            total_capacity += capacity
            total_utilization_numerator += capacity * utilization
            total_it_power += phase_power

        effective_utilization = np.divide(
            total_utilization_numerator,
            total_capacity,
            out=np.zeros_like(total_capacity),
            where=total_capacity > 0.0,
        )
        ambient = _ambient_temperature(
            scenario,
            parameters,
            hour_of_day,
            day_of_year,
            sample_count,
            day_count,
            day_inverse,
            seed,
            month_index,
        )
        facility = scenario.facility
        temperature_sensitivity = facility.temperature_sensitivity_per_c
        if temperature_sensitivity is None:
            temperature_sensitivity = 0.004 if facility.cooling == "liquid" else 0.009
        load_gap = np.clip(
            (facility.reference_utilization - effective_utilization)
            / facility.reference_utilization,
            0.0,
            1.0,
        )
        pue = np.clip(
            facility.design_pue
            + parameters["pue_offset"][:, None]
            + temperature_sensitivity * (ambient - 20.0)
            + facility.low_load_pue_penalty * load_gap,
            1.02,
            2.50,
        )
        total_facility_power = total_it_power * pue
        grid_carbon = _grid_carbon_intensity(
            scenario,
            parameters,
            hour_of_day,
            day_of_year,
            year_fraction,
            sample_count,
            hour_count,
            day_count,
            day_inverse,
            seed,
            month_index,
        )

        installed_capacity[:, month_index] = total_capacity[:, -1]
        utilization_numerator[:, month_index] = total_utilization_numerator.sum(axis=1)
        capacity_hours[:, month_index] = total_capacity.sum(axis=1)
        it_energy[:, month_index] = total_it_power.sum(axis=1)
        facility_energy[:, month_index] = total_facility_power.sum(axis=1)
        carbon[:, month_index] = (total_facility_power * grid_carbon / 1_000.0).sum(
            axis=1
        )
        peak_facility_power[:, month_index] = total_facility_power.max(axis=1)

    average_delay = np.mean(np.stack(phase_delays, axis=1), axis=1)
    drivers = {
        "utilization_level": parameters["utilization_level"],
        "facility_pue": scenario.facility.design_pue + parameters["pue_offset"],
        "grid_carbon_level": parameters["grid_carbon_level"],
        "grid_decarbonization": parameters["grid_decarbonization"],
        "build_timing": average_delay,
    }
    return _SimulationArrays(
        labels=labels,
        installed_capacity=installed_capacity,
        utilization_numerator=utilization_numerator,
        capacity_hours=capacity_hours,
        it_energy=it_energy,
        facility_energy=facility_energy,
        carbon=carbon,
        peak_facility_power=peak_facility_power,
        drivers=drivers,
    )


def _quantiles(values: FloatArray) -> QuantileValues:
    p10, p50, p90 = np.quantile(values, [0.10, 0.50, 0.90])
    return QuantileValues(
        p10=round(float(p10), 4),
        p50=round(float(p50), 4),
        p90=round(float(p90), 4),
    )


def _safe_ratio(
    numerator: FloatArray,
    denominator: FloatArray,
    fallback: float,
) -> FloatArray:
    return np.divide(
        numerator,
        denominator,
        out=np.full_like(numerator, fallback, dtype=np.float64),
        where=denominator > 0.0,
    )


def _horizon_targets(horizon_years: int) -> list[int]:
    targets = [year for year in (1, 5, 10) if year <= horizon_years]
    if horizon_years not in targets:
        targets.append(horizon_years)
    return sorted(set(targets))


def _build_series(
    name: str,
    arrays: _SimulationArrays,
    scenario: ForecastScenario,
) -> ForecastSeries:
    monthly_utilization = _safe_ratio(
        arrays.utilization_numerator,
        arrays.capacity_hours,
        0.0,
    )
    monthly_pue = _safe_ratio(
        arrays.facility_energy,
        arrays.it_energy,
        scenario.facility.design_pue,
    )
    periods = [
        ForecastPeriod(
            period=label,
            installed_it_mw=_quantiles(arrays.installed_capacity[:, index]),
            effective_utilization=_quantiles(monthly_utilization[:, index]),
            it_energy_mwh=_quantiles(arrays.it_energy[:, index]),
            facility_energy_mwh=_quantiles(arrays.facility_energy[:, index]),
            operational_carbon_t=_quantiles(arrays.carbon[:, index]),
            average_pue=_quantiles(monthly_pue[:, index]),
            peak_facility_mw=_quantiles(arrays.peak_facility_power[:, index]),
        )
        for index, label in enumerate(arrays.labels)
    ]

    horizons: list[HorizonSummary] = []
    for years in _horizon_targets(scenario.horizon_years):
        month_count = years * 12
        capacity_hours = arrays.capacity_hours[:, :month_count].sum(axis=1)
        it_energy = arrays.it_energy[:, :month_count].sum(axis=1)
        facility_energy = arrays.facility_energy[:, :month_count].sum(axis=1)
        horizons.append(
            HorizonSummary(
                years=years,
                installed_it_mw=_quantiles(
                    arrays.installed_capacity[:, month_count - 1]
                ),
                cumulative_it_energy_mwh=_quantiles(it_energy),
                cumulative_facility_energy_mwh=_quantiles(facility_energy),
                cumulative_operational_carbon_t=_quantiles(
                    arrays.carbon[:, :month_count].sum(axis=1)
                ),
                average_effective_utilization=_quantiles(
                    _safe_ratio(
                        arrays.utilization_numerator[:, :month_count].sum(axis=1),
                        capacity_hours,
                        0.0,
                    )
                ),
                average_pue=_quantiles(
                    _safe_ratio(
                        facility_energy,
                        it_energy,
                        scenario.facility.design_pue,
                    )
                ),
                peak_facility_mw=_quantiles(
                    arrays.peak_facility_power[:, :month_count].max(axis=1)
                ),
            )
        )
    return ForecastSeries(name=name, periods=periods, horizons=horizons)


def _build_deltas(
    scenario_arrays: _SimulationArrays,
    baseline_arrays: _SimulationArrays,
    horizon_years: int,
) -> list[HorizonDelta]:
    deltas: list[HorizonDelta] = []
    for years in _horizon_targets(horizon_years):
        month_count = years * 12
        scenario_energy = scenario_arrays.facility_energy[:, :month_count].sum(axis=1)
        baseline_energy = baseline_arrays.facility_energy[:, :month_count].sum(axis=1)
        scenario_carbon = scenario_arrays.carbon[:, :month_count].sum(axis=1)
        baseline_carbon = baseline_arrays.carbon[:, :month_count].sum(axis=1)
        energy_delta = scenario_energy - baseline_energy
        carbon_delta = scenario_carbon - baseline_carbon
        baseline_energy_p50 = float(np.median(baseline_energy))
        baseline_carbon_p50 = float(np.median(baseline_carbon))
        deltas.append(
            HorizonDelta(
                years=years,
                facility_energy_mwh=_quantiles(energy_delta),
                operational_carbon_t=_quantiles(carbon_delta),
                facility_energy_pct_p50=round(
                    float(np.median(energy_delta))
                    / max(abs(baseline_energy_p50), 1e-9)
                    * 100.0,
                    2,
                ),
                operational_carbon_pct_p50=round(
                    float(np.median(carbon_delta))
                    / max(abs(baseline_carbon_p50), 1e-9)
                    * 100.0,
                    2,
                ),
            )
        )
    return deltas


def _correlation(driver: FloatArray, outcome: FloatArray) -> float:
    if float(np.std(driver)) < 1e-12 or float(np.std(outcome)) < 1e-12:
        return 0.0
    return float(np.corrcoef(driver, outcome)[0, 1])


def _build_sensitivities(arrays: _SimulationArrays) -> list[DriverSensitivity]:
    descriptions = {
        "utilization_level": (
            "Path-level effective utilization relative to the central ramp."
        ),
        "facility_pue": (
            "Facility overhead after sampling uncertainty around design PUE."
        ),
        "grid_carbon_level": (
            "Regional grid-carbon level relative to the central assumption."
        ),
        "grid_decarbonization": "Annual decline in regional grid-carbon intensity.",
        "build_timing": "Average phase start shift in months; positive means later.",
    }
    outcomes = {
        "facility_energy": arrays.facility_energy.sum(axis=1),
        "operational_carbon": arrays.carbon.sum(axis=1),
    }
    results: list[DriverSensitivity] = []
    for driver_name, driver_values in arrays.drivers.items():
        for outcome_name, outcome_values in outcomes.items():
            correlation = _correlation(driver_values, outcome_values)
            if correlation > 0.05:
                direction = "increases"
            elif correlation < -0.05:
                direction = "decreases"
            else:
                direction = "neutral"
            results.append(
                DriverSensitivity(
                    driver=driver_name,
                    outcome=outcome_name,
                    correlation=round(correlation, 4),
                    impact_score=round(abs(correlation), 4),
                    direction=direction,
                    description=descriptions[driver_name],
                )
            )
    return sorted(results, key=lambda item: item.impact_score, reverse=True)


def _provenance() -> ForecastProvenance:
    return ForecastProvenance(
        model_version=MODEL_VERSION,
        assumption_set_version=ASSUMPTION_SET_VERSION,
        calibration_status="uncalibrated",
        engine="paired Monte Carlo with synthetic workload, climate, and grid priors",
        timestep="hourly",
        aggregation="monthly",
        disclaimer=DISCLAIMER,
        assumptions=[
            "Capacity phases and user assumptions are authoritative scenario inputs.",
            "Workload archetypes use synthetic hourly and weekly shapes.",
            (
                "IT power includes an idle floor and nonlinear load response by "
                "hardware class."
            ),
            "PUE responds to ambient temperature and low-load operation.",
            (
                "Grid carbon follows hourly shape plus a sampled annual "
                "decarbonization rate."
            ),
            (
                "P10/P50/P90 describe simulated assumption uncertainty, not "
                "validated accuracy."
            ),
        ],
    )


def run_forecast(request: ForecastRunRequest) -> ForecastResult:
    """Run a reproducible hourly forecast and optional paired baseline."""
    scenario_arrays = _simulate_scenario(
        request.scenario,
        request.sample_count,
        request.seed,
    )
    baseline_arrays = None
    baseline_series = None
    deltas: list[HorizonDelta] = []
    if request.baseline is not None:
        baseline_arrays = _simulate_scenario(
            request.baseline,
            request.sample_count,
            request.seed,
        )
        baseline_series = _build_series(
            request.baseline.name,
            baseline_arrays,
            request.baseline,
        )
        deltas = _build_deltas(
            scenario_arrays,
            baseline_arrays,
            request.scenario.horizon_years,
        )

    canonical_request = json.dumps(
        request.model_dump(mode="json"),
        sort_keys=True,
        separators=(",", ":"),
    )
    fingerprint = hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()[:12]
    return ForecastResult(
        run_id=f"forecast-{fingerprint}",
        generated_at=datetime.now(timezone.utc),
        seed=request.seed,
        sample_count=request.sample_count,
        scenario=_build_series(
            request.scenario.name,
            scenario_arrays,
            request.scenario,
        ),
        baseline=baseline_series,
        deltas=deltas,
        sensitivities=_build_sensitivities(scenario_arrays),
        provenance=_provenance(),
    )
