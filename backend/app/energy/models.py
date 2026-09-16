"""Contracts for comparing a physical supply portfolio with a grid baseline."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from ..forecast.models import CapacityPhase, ForecastScenario, QuantileValues

COUPLING_VERSION = "0.1.0"


class EnergyContract(BaseModel):
    """Reject undeclared fields and non-finite numerical assumptions."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class SupplyPortfolio(EnergyContract):
    """One physical portfolio, available from a common commissioning date."""

    solar_mw: float = Field(25.0, ge=0.0, le=10_000.0)
    wind_mw: float = Field(15.0, ge=0.0, le=10_000.0)
    hydro_mw: float = Field(4.0, ge=0.0, le=10_000.0)
    hydro_mode: Literal["run-of-river", "reservoir-budget"] = "run-of-river"
    hydro_capacity_factor: float = Field(0.55, ge=0.0, le=1.0)
    hydro_operational_g_per_kwh: float = Field(20.0, ge=0.0, le=2_000.0)
    hydro_water_consumption_l_per_kwh: float | None = Field(None, ge=0.0, le=1_000.0)
    nuclear_mw: float = Field(0.0, ge=0.0, le=10_000.0)
    nuclear_availability: float = Field(0.90, ge=0.0, le=1.0)
    gas_mw: float = Field(0.0, ge=0.0, le=10_000.0)
    gas_operational_g_per_kwh: float = Field(450.0, ge=0.0, le=2_000.0)
    battery_power_mw: float = Field(12.0, ge=0.0, le=10_000.0)
    battery_energy_mwh: float = Field(48.0, ge=0.0, le=100_000.0)
    battery_round_trip_efficiency: float = Field(0.88, gt=0.0, le=1.0)
    commissioning_date: date | None = None

    @model_validator(mode="after")
    def validate_battery(self) -> SupplyPortfolio:
        """Require both storage power and energy, or neither."""
        if (self.battery_power_mw == 0.0) != (self.battery_energy_mwh == 0.0):
            raise ValueError("battery power and energy must both be zero or positive")
        return self


class GridConnection(EnergyContract):
    """Identical physical connection and tariffs for both compared cases."""

    import_limit_mw: float | None = Field(40.0, ge=0.0, le=50_000.0)
    export_limit_mw: float = Field(5.0, ge=0.0, le=50_000.0)
    import_price_per_kwh: float = Field(0.085, ge=0.0, le=5.0)
    export_price_per_kwh: float = Field(0.035, ge=0.0, le=5.0)


class WorkFlexibility(EnergyContract):
    """Aggregate compute-work proxy; deferral stays within each synthetic day."""

    fraction: float = Field(0.0, ge=0.0, le=0.80)
    max_delay_hours: int = Field(6, ge=1, le=12)


class CoolingWater(EnergyContract):
    """Heat-rejection water requirement, independent of air/liquid chip cooling."""

    heat_rejection: Literal["dry", "evaporative", "hybrid"] = "hybrid"
    consumption_l_per_it_kwh: float = Field(0.8, ge=0.0, le=10.0)
    withdrawal_multiplier: float = Field(1.25, ge=1.0, le=10.0)
    temperature_sensitivity_per_c: float = Field(0.03, ge=0.0, le=0.20)


def example_demand() -> ForecastScenario:
    """Supply a small phased-campus example using the existing demand model."""
    return ForecastScenario(
        name="Renewable-coupled AI campus",
        horizon_years=1,
        phases=[
            CapacityPhase(
                name="Phase 1",
                start_date=date(2027, 1, 1),
                it_capacity_mw=20.0,
                initial_utilization=0.45,
                mature_utilization=0.70,
                ramp_months=6,
            )
        ],
    )


class CouplingRequest(EnergyContract):
    """Evaluate a specified portfolio, not an optimized or contracted portfolio."""

    demand: ForecastScenario = Field(default_factory=example_demand)
    supply: SupplyPortfolio = Field(default_factory=SupplyPortfolio)
    grid: GridConnection = Field(default_factory=GridConnection)
    flexibility: WorkFlexibility = Field(default_factory=WorkFlexibility)
    cooling_water: CoolingWater = Field(default_factory=CoolingWater)
    weather_case: Literal["typical", "hot-dry", "low-renewables"] = "typical"
    sample_count: int = Field(48, ge=32, le=128)
    seed: int = Field(73, ge=0, le=2_147_483_647)
    trace_month: int = Field(
        7, ge=1, le=120, description="One-based simulation month for a seven-day trace."
    )

    @model_validator(mode="after")
    def validate_scenario(self) -> CouplingRequest:
        """Keep the trace in range and protect non-deferrable workload shares."""
        if self.trace_month > self.demand.horizon_years * 12:
            raise ValueError("trace_month must be within the simulation horizon")
        eligible = (
            self.demand.workload_mix.training + self.demand.workload_mix.batch_inference
        )
        if self.flexibility.fraction > eligible + 1e-9:
            raise ValueError(
                "flexible fraction cannot exceed the training and batch workload share"
            )
        return self


class EnergyMetrics(EnergyContract):
    """Path quantiles; renewable matching excludes unspecified grid renewables."""

    required_energy_mwh: QuantileValues
    served_energy_mwh: QuantileValues
    grid_import_mwh: QuantileValues
    grid_export_mwh: QuantileValues
    peak_grid_import_mw: QuantileValues
    renewable_generation_mwh: QuantileValues
    renewable_served_mwh: QuantileValues
    renewable_match_pct: QuantileValues
    solar_generation_mwh: QuantileValues
    wind_generation_mwh: QuantileValues
    hydro_generation_mwh: QuantileValues
    nuclear_generation_mwh: QuantileValues
    gas_generation_mwh: QuantileValues
    battery_charge_mwh: QuantileValues
    battery_discharge_mwh: QuantileValues
    battery_losses_mwh: QuantileValues
    curtailed_mwh: QuantileValues
    unserved_energy_mwh: QuantileValues
    shortfall_hours: QuantileValues
    operational_carbon_t: QuantileValues
    variable_energy_cost_usd: QuantileValues
    cooling_water_consumption_l: QuantileValues
    cooling_water_withdrawal_l: QuantileValues
    hydro_water_consumption_l: QuantileValues | None
    requested_compute_mwh_equivalent: QuantileValues
    shifted_compute_mwh_equivalent: QuantileValues


class EnergyPeriod(EnergyContract):
    """A monthly summary of the coupled physical system."""

    period: str
    metrics: EnergyMetrics


class PortfolioResult(EnergyContract):
    """Full-horizon and monthly results for one portfolio."""

    name: str
    summary: EnergyMetrics
    periods: list[EnergyPeriod]
    final_battery_energy_mwh: QuantileValues


class PortfolioComparison(EnergyContract):
    """Withhold savings claims whenever either case fails to serve the workload."""

    comparable: bool
    explanation: str
    carbon_change_pct_p50: float | None
    grid_import_change_pct_p50: float | None
    peak_grid_change_pct_p50: float | None
    variable_cost_change_pct_p50: float | None
    cooling_water_change_pct_p50: float | None


class EnergyHour(EnergyContract):
    """One actual simulated path; unlike component medians, these rows balance."""

    timestamp: str
    installed_it_mw: float
    it_power_mw: float
    original_it_power_mw: float
    effective_utilization: float
    original_effective_utilization: float
    original_load_mw: float
    required_load_mw: float
    solar_generation_mw: float
    wind_generation_mw: float
    hydro_generation_mw: float
    nuclear_generation_mw: float
    gas_generation_mw: float
    solar_available_mw: float
    wind_available_mw: float
    solar_to_load_mw: float
    wind_to_load_mw: float
    hydro_to_load_mw: float
    nuclear_to_load_mw: float
    battery_to_load_mw: float
    gas_to_load_mw: float
    grid_to_load_mw: float
    unserved_mw: float
    renewable_available_mw: float
    renewable_to_load_mw: float
    battery_charge_mw: float
    battery_state_mwh: float
    grid_export_mw: float
    curtailed_mw: float
    baseline_grid_import_mw: float
    baseline_unserved_mw: float
    ambient_c: float
    grid_carbon_g_per_kwh: float
    cooling_water_consumption_l: float
    cooling_water_withdrawal_l: float
    hydro_water_consumption_l: float | None
    operational_carbon_t: float
    variable_energy_cost_usd: float
    baseline_operational_carbon_t: float
    baseline_variable_energy_cost_usd: float
    baseline_cooling_water_consumption_l: float
    baseline_cooling_water_withdrawal_l: float


class CouplingProvenance(EnergyContract):
    """Explicit evidence, accounting, and scheduling boundaries."""

    coupling_version: str = COUPLING_VERSION
    demand_model_version: str
    calibration_status: Literal["uncalibrated"] = "uncalibrated"
    classification: Literal["synthetic"] = "synthetic"
    timestep: Literal["hourly"] = "hourly"
    trace_label: str
    trace_path_index: int
    assumptions: list[str]


class CouplingResult(EnergyContract):
    """Paired, reproducible physical supply scenarios with an illustrative trace."""

    run_id: str
    generated_at: datetime
    sample_count: int
    seed: int
    proposed: PortfolioResult
    baseline: PortfolioResult
    comparison: PortfolioComparison
    hourly_trace: list[EnergyHour]
    warnings: list[str]
    provenance: CouplingProvenance
