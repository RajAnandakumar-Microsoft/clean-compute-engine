"""Synthetic prior library for the uncalibrated v0.1 forecast."""

from __future__ import annotations

from dataclasses import dataclass

from .models import (
    ForecastMetadata,
    ForecastOption,
    ForecastRunRequest,
    ForecastScenario,
)

MODEL_VERSION = "0.1.0"
ASSUMPTION_SET_VERSION = "synthetic-priors-2026.1"
DISCLAIMER = (
    "Uncalibrated scenario forecast. Values describe outcomes under the supplied "
    "assumptions and synthetic priors; they are not validated site predictions."
)


@dataclass(frozen=True)
class HardwarePrior:
    """Shape of IT power relative to effective utilization."""

    name: str
    description: str
    idle_power_fraction: float
    power_curve_exponent: float


@dataclass(frozen=True)
class LocationPrior:
    """Synthetic climate and grid shape for one U.S. location archetype."""

    name: str
    description: str
    annual_mean_temp_c: float
    seasonal_temp_amplitude_c: float
    daily_temp_amplitude_c: float
    grid_carbon_g_per_kwh: float
    grid_diurnal_amplitude: float


HARDWARE_PRIORS: dict[str, HardwarePrior] = {
    "H100": HardwarePrior(
        name="NVIDIA H100 class",
        description="Modern accelerator with a substantial idle-power floor.",
        idle_power_fraction=0.34,
        power_curve_exponent=0.90,
    ),
    "GB200": HardwarePrior(
        name="NVIDIA GB200 class",
        description="High-density rack-scale accelerator archetype.",
        idle_power_fraction=0.38,
        power_curve_exponent=0.87,
    ),
    "A100": HardwarePrior(
        name="NVIDIA A100 class",
        description="Prior-generation accelerator archetype.",
        idle_power_fraction=0.31,
        power_curve_exponent=0.93,
    ),
    "MI300X": HardwarePrior(
        name="AMD MI300X class",
        description="Modern high-memory accelerator archetype.",
        idle_power_fraction=0.35,
        power_curve_exponent=0.89,
    ),
}

LOCATION_PRIORS: dict[str, LocationPrior] = {
    "az-desert": LocationPrior(
        name="Arizona desert",
        description="Hot, dry climate with a moderately carbon-intensive grid shape.",
        annual_mean_temp_c=23.0,
        seasonal_temp_amplitude_c=12.0,
        daily_temp_amplitude_c=7.0,
        grid_carbon_g_per_kwh=380.0,
        grid_diurnal_amplitude=0.24,
    ),
    "tx-plains": LocationPrior(
        name="Texas plains (ERCOT)",
        description="Hot summers and a variable grid with strong daily swings.",
        annual_mean_temp_c=20.0,
        seasonal_temp_amplitude_c=11.0,
        daily_temp_amplitude_c=6.0,
        grid_carbon_g_per_kwh=410.0,
        grid_diurnal_amplitude=0.28,
    ),
    "va-loudoun": LocationPrior(
        name="Virginia (PJM / Data Center Alley)",
        description="Four-season climate and a mixed regional grid.",
        annual_mean_temp_c=14.0,
        seasonal_temp_amplitude_c=13.0,
        daily_temp_amplitude_c=5.0,
        grid_carbon_g_per_kwh=360.0,
        grid_diurnal_amplitude=0.30,
    ),
    "pnw-hydro": LocationPrior(
        name="Pacific Northwest (hydro grid)",
        description="Cooler climate and a lower-carbon hydro-heavy grid archetype.",
        annual_mean_temp_c=10.0,
        seasonal_temp_amplitude_c=10.0,
        daily_temp_amplitude_c=4.0,
        grid_carbon_g_per_kwh=110.0,
        grid_diurnal_amplitude=0.18,
    ),
}

WORKLOAD_OPTIONS = [
    ForecastOption(
        id="training",
        name="Training",
        description=(
            "High, comparatively steady utilization with modest weekly variation."
        ),
    ),
    ForecastOption(
        id="real_time_inference",
        name="Real-time inference",
        description=(
            "User-driven daytime and evening demand with short-term volatility."
        ),
    ),
    ForecastOption(
        id="batch_inference",
        name="Batch/offline inference",
        description="Flexible work concentrated overnight and on weekends.",
    ),
    ForecastOption(
        id="development",
        name="Development",
        description="Business-hours demand with a low overnight and weekend floor.",
    ),
]


def forecast_metadata() -> ForecastMetadata:
    """Return supported profiles and the explicit model claim boundary."""
    locations = [
        ForecastOption(
            id=location_id,
            name=prior.name,
            description=prior.description,
        )
        for location_id, prior in LOCATION_PRIORS.items()
    ]
    hardware = [
        ForecastOption(
            id=hardware_id,
            name=prior.name,
            description=prior.description,
        )
        for hardware_id, prior in HARDWARE_PRIORS.items()
    ]
    return ForecastMetadata(
        model_version=MODEL_VERSION,
        assumption_set_version=ASSUMPTION_SET_VERSION,
        calibration_status="uncalibrated",
        locations=locations,
        hardware_profiles=hardware,
        workload_archetypes=WORKLOAD_OPTIONS,
        disclaimer=DISCLAIMER,
    )


def example_request() -> ForecastRunRequest:
    """Return a complete paired example suitable for the UI's first run."""
    scenario = ForecastScenario()
    baseline = scenario.model_copy(deep=True)
    baseline.name = "Conventional baseline"
    baseline.facility.design_pue = 1.45
    baseline.facility.cooling = "air"
    baseline.facility.low_load_pue_penalty = 0.16
    for phase in baseline.phases:
        phase.refresh_efficiency_gain = 0.04
    return ForecastRunRequest(scenario=scenario, baseline=baseline)
