"""Versioned request and response contracts for probabilistic forecasts."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

HardwareProfileName = Literal["H100", "GB200", "A100", "MI300X"]
ForecastLocationName = Literal["az-desert", "tx-plains", "va-loudoun", "pnw-hydro"]
CoolingType = Literal["air", "liquid"]


class CapacityPhase(BaseModel):
    """One dated increment of installed IT capacity."""

    name: str = Field(min_length=1, max_length=80)
    start_date: date
    it_capacity_mw: float = Field(gt=0.0, le=5_000.0)
    initial_utilization: float = Field(0.20, ge=0.0, le=0.95)
    mature_utilization: float = Field(0.65, ge=0.01, le=0.98)
    ramp_months: int = Field(18, ge=1, le=84)
    hardware_profile: HardwareProfileName = "H100"
    refresh_interval_years: int = Field(4, ge=1, le=12)
    refresh_efficiency_gain: float = Field(
        0.10,
        ge=0.0,
        le=0.50,
        description="Power reduction for equivalent work at each refresh.",
    )

    @model_validator(mode="after")
    def validate_utilization_ramp(self) -> CapacityPhase:
        """Require the phase ramp to move toward equal or higher utilization."""
        if self.mature_utilization < self.initial_utilization:
            raise ValueError("mature_utilization must be >= initial_utilization")
        return self


class WorkloadMix(BaseModel):
    """Share of effective demand assigned to each workload archetype."""

    training: float = Field(0.30, ge=0.0, le=1.0)
    real_time_inference: float = Field(0.45, ge=0.0, le=1.0)
    batch_inference: float = Field(0.15, ge=0.0, le=1.0)
    development: float = Field(0.10, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_total(self) -> WorkloadMix:
        """Require workload shares to represent the complete workload."""
        total = (
            self.training
            + self.real_time_inference
            + self.batch_inference
            + self.development
        )
        if abs(total - 1.0) > 0.001:
            raise ValueError("workload shares must sum to 1.0")
        return self


class FacilityAssumptions(BaseModel):
    """Facility-efficiency assumptions applied to IT power."""

    design_pue: float = Field(1.22, ge=1.02, le=2.50)
    cooling: CoolingType = "liquid"
    temperature_sensitivity_per_c: float | None = Field(None, ge=0.0, le=0.03)
    low_load_pue_penalty: float = Field(0.10, ge=0.0, le=0.50)
    reference_utilization: float = Field(0.65, gt=0.0, le=1.0)


class GridAssumptions(BaseModel):
    """Grid-carbon assumptions for the selected location."""

    carbon_intensity_override_g_per_kwh: float | None = Field(
        None,
        ge=20.0,
        le=1_200.0,
    )
    annual_decarbonization_rate: float = Field(0.03, ge=-0.05, le=0.20)


class UncertaintyAssumptions(BaseModel):
    """Uncertainty widths for the synthetic prior distributions."""

    utilization_relative_sd: float = Field(0.12, ge=0.0, le=0.60)
    hourly_utilization_volatility: float = Field(0.10, ge=0.0, le=0.60)
    pue_absolute_sd: float = Field(0.035, ge=0.0, le=0.30)
    daily_weather_sd_c: float = Field(2.5, ge=0.0, le=12.0)
    grid_carbon_relative_sd: float = Field(0.12, ge=0.0, le=0.60)
    grid_decarbonization_sd: float = Field(0.012, ge=0.0, le=0.10)
    phase_start_delay_months_sd: float = Field(1.5, ge=0.0, le=24.0)
    rare_event_probability_per_day: float = Field(0.01, ge=0.0, le=0.20)
    rare_event_utilization_change: float = Field(0.18, ge=0.0, le=0.80)


class ForecastScenario(BaseModel):
    """Complete assumptions for one data-center future."""

    name: str = Field("Efficient AI campus", min_length=1, max_length=120)
    start_date: date = date(2027, 1, 1)
    horizon_years: int = Field(10, ge=1, le=10)
    location: ForecastLocationName = "va-loudoun"
    phases: list[CapacityPhase] = Field(
        default_factory=lambda: [
            CapacityPhase(
                name="Phase 1",
                start_date=date(2027, 1, 1),
                it_capacity_mw=20.0,
            ),
            CapacityPhase(
                name="Phase 2",
                start_date=date(2029, 1, 1),
                it_capacity_mw=30.0,
                initial_utilization=0.15,
                mature_utilization=0.70,
                ramp_months=24,
                hardware_profile="GB200",
            ),
        ],
        min_length=1,
        max_length=12,
    )
    workload_mix: WorkloadMix = Field(default_factory=WorkloadMix)
    facility: FacilityAssumptions = Field(default_factory=FacilityAssumptions)
    grid: GridAssumptions = Field(default_factory=GridAssumptions)
    uncertainty: UncertaintyAssumptions = Field(default_factory=UncertaintyAssumptions)

    @model_validator(mode="after")
    def validate_dates(self) -> ForecastScenario:
        """Keep calendar aggregation deterministic and phases within the horizon."""
        if self.start_date.day != 1:
            raise ValueError("start_date must be the first day of a month")
        end_date = self.start_date.replace(
            year=self.start_date.year + self.horizon_years
        )
        if not any(phase.start_date < end_date for phase in self.phases):
            raise ValueError(
                "at least one capacity phase must start within the horizon"
            )
        return self


class ForecastRunRequest(BaseModel):
    """A paired or standalone probabilistic forecast request."""

    scenario: ForecastScenario = Field(default_factory=ForecastScenario)
    baseline: ForecastScenario | None = None
    seed: int = Field(42, ge=0, le=2_147_483_647)
    sample_count: int = Field(250, ge=32, le=1_000)

    @model_validator(mode="after")
    def validate_baseline_alignment(self) -> ForecastRunRequest:
        """Require paired forecasts to share calendar and location boundaries."""
        if self.baseline is None:
            return self
        mismatches: list[str] = []
        if self.baseline.start_date != self.scenario.start_date:
            mismatches.append("start_date")
        if self.baseline.horizon_years != self.scenario.horizon_years:
            mismatches.append("horizon_years")
        if self.baseline.location != self.scenario.location:
            mismatches.append("location")
        if mismatches:
            fields = ", ".join(mismatches)
            raise ValueError(f"baseline must match scenario for: {fields}")
        return self


class QuantileValues(BaseModel):
    """Low, expected, and high values from the simulated distribution."""

    p10: float
    p50: float
    p90: float


class ForecastPeriod(BaseModel):
    """One monthly output interval."""

    period: str
    installed_it_mw: QuantileValues
    effective_utilization: QuantileValues
    it_energy_mwh: QuantileValues
    facility_energy_mwh: QuantileValues
    operational_carbon_t: QuantileValues
    average_pue: QuantileValues
    peak_facility_mw: QuantileValues


class HorizonSummary(BaseModel):
    """Cumulative output through a named year horizon."""

    years: int
    installed_it_mw: QuantileValues
    cumulative_it_energy_mwh: QuantileValues
    cumulative_facility_energy_mwh: QuantileValues
    cumulative_operational_carbon_t: QuantileValues
    average_effective_utilization: QuantileValues
    average_pue: QuantileValues
    peak_facility_mw: QuantileValues


class HorizonDelta(BaseModel):
    """Paired scenario-minus-baseline difference through a horizon."""

    years: int
    facility_energy_mwh: QuantileValues
    operational_carbon_t: QuantileValues
    facility_energy_pct_p50: float
    operational_carbon_pct_p50: float


class DriverSensitivity(BaseModel):
    """Correlation between one sampled assumption and the full-horizon result."""

    driver: str
    outcome: Literal["facility_energy", "operational_carbon"]
    correlation: float
    impact_score: float
    direction: Literal["increases", "decreases", "neutral"]
    description: str


class ForecastSeries(BaseModel):
    """Monthly trajectories and horizon summaries for one scenario."""

    name: str
    periods: list[ForecastPeriod]
    horizons: list[HorizonSummary]


class ForecastProvenance(BaseModel):
    """Model identity, status, and claim boundary carried with every result."""

    model_version: str
    assumption_set_version: str
    calibration_status: Literal["uncalibrated"]
    engine: str
    timestep: Literal["hourly"]
    aggregation: Literal["monthly"]
    disclaimer: str
    assumptions: list[str]


class ForecastResult(BaseModel):
    """Complete product response for a forecast run."""

    run_id: str
    generated_at: datetime
    seed: int
    sample_count: int
    scenario: ForecastSeries
    baseline: ForecastSeries | None
    deltas: list[HorizonDelta]
    sensitivities: list[DriverSensitivity]
    provenance: ForecastProvenance


class ForecastOption(BaseModel):
    """A selectable model option exposed to the client."""

    id: str
    name: str
    description: str


class ForecastMetadata(BaseModel):
    """Discoverable model status and supported assumption profiles."""

    model_version: str
    assumption_set_version: str
    calibration_status: Literal["uncalibrated"]
    locations: list[ForecastOption]
    hardware_profiles: list[ForecastOption]
    workload_archetypes: list[ForecastOption]
    disclaimer: str
