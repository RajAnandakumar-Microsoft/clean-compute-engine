"""Pydantic schemas for The Clean Compute Engine (v1 / Layer 1).

These types are the contract between the FastAPI backend and the React client.
Keep them in sync with frontend/src/types/*.ts.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Design / configuration inputs (what the user sets before a prediction)
# ---------------------------------------------------------------------------

CoolingType = Literal["air", "liquid"]
SourceType = Literal["grid", "solar", "wind", "gas", "nuclear", "battery"]
GpuModelName = Literal["H100", "GB200", "A100", "MI300X"]
Placement = Literal["pack", "spread"]
LensName = Literal["operator", "sustainability", "financial"]
OverlayName = Literal["temperature", "power", "utilization", "carbon", "idle"]


class ITBuild(BaseModel):
    rack_count: int = Field(36, ge=1, le=200)
    gpu_model: GpuModelName = "H100"
    servers_per_rack: int = Field(8, ge=1, le=20)
    gpus_per_server: int = Field(8, ge=1, le=8)
    cooling: CoolingType = "liquid"
    design_density_kw: float = Field(50.0, ge=5, le=150, description="kW per rack")


class EnergyBuild(BaseModel):
    grid_interconnect_mw: float = Field(6.0, ge=0, le=1000)
    solar_mw: float = Field(4.0, ge=0, le=1000)
    wind_mw: float = Field(2.0, ge=0, le=1000)
    gas_mw: float = Field(0.0, ge=0, le=1000)
    nuclear_mw: float = Field(0.0, ge=0, le=1000)
    battery_mwh: float = Field(8.0, ge=0, le=5000)
    battery_mw: float = Field(3.0, ge=0, le=1000)


class WorkloadProfile(BaseModel):
    base_load_frac: float = Field(
        0.55, ge=0.05, le=1.0, description="Overnight floor as fraction of peak IT"
    )
    peak_load_frac: float = Field(
        0.95, ge=0.1, le=1.0, description="Daytime peak as fraction of installed IT"
    )
    deferrable_frac: float = Field(
        0.30, ge=0.0, le=0.9, description="Share of load that is flexible"
    )


class FinancialAssumptions(BaseModel):
    import_price: float = Field(0.085, ge=0, description="$/kWh grid import")
    export_price: float = Field(0.045, ge=0, description="$/kWh grid export")
    grid_services_per_mw_yr: float = Field(
        60000.0, ge=0, description="$/MW-yr for firm+flexible capacity"
    )
    heat_reuse_value: float = Field(0.015, ge=0, description="$/kWh of recovered heat")
    discount_rate: float = Field(0.08, ge=0, le=0.5)
    horizon_years: int = Field(15, ge=1, le=40)


class Toggles(BaseModel):
    smart_scheduling: bool = False
    placement: Placement = "pack"


class DesignConfig(BaseModel):
    name: str = "Untitled design"
    location: str = "az-desert"
    seed: int = 42
    it_build: ITBuild = Field(default_factory=ITBuild)
    energy_build: EnergyBuild = Field(default_factory=EnergyBuild)
    workload: WorkloadProfile = Field(default_factory=WorkloadProfile)
    finance: FinancialAssumptions = Field(default_factory=FinancialAssumptions)
    toggles: Toggles = Field(default_factory=Toggles)


# ---------------------------------------------------------------------------
# Static topology (set at generation)
# ---------------------------------------------------------------------------


class Vec3(BaseModel):
    x: float
    y: float
    z: float


class GpuStatic(BaseModel):
    id: str
    server_id: str
    rack_id: str
    model: str
    tdp_w: float
    memory_gb: int
    embodied_co2e_kg: float
    install_year: int
    useful_life_yr: int
    pos: Vec3


class ServerStatic(BaseModel):
    id: str
    rack_id: str
    u_slot: int
    model: str
    gpu_count: int
    rated_power_kw: float
    embodied_co2e_kg: float
    install_year: int
    useful_life_yr: int
    pos: Vec3


class RackStatic(BaseModel):
    id: str
    hall_id: str
    row: int
    col: int
    u_height: int
    breaker_kw: float
    cooling: CoolingType
    pos: Vec3


class HallStatic(BaseModel):
    id: str
    facility_id: str
    name: str
    area_m2: float
    rack_capacity: int
    cooling: CoolingType
    design_density_kw: float


class FacilityStatic(BaseModel):
    id: str
    name: str
    region: str
    grid_region: str
    climate_zone: str
    tier: int
    power_capacity_mw: float
    design_pue: float
    water_source: str
    commissioned_year: int


class GenSourceStatic(BaseModel):
    id: str
    type: SourceType
    nameplate_mw: float
    capex_per_mw: float
    opex_per_mwh: float
    carbon_g_per_kwh: float
    water_l_per_mwh: float
    dispatchable: bool


class StorageStatic(BaseModel):
    id: str
    energy_mwh: float
    power_mw: float
    round_trip_eff: float
    capex_per_mwh: float
    opex_per_mwh: float
    cycle_life: int


class GridStatic(BaseModel):
    interconnect_mw: float
    import_price: float
    export_price: float
    peak_hours: list[int]


class EmbodiedSummary(BaseModel):
    gpu_co2e_t: float
    server_co2e_t: float
    total_co2e_t: float


class DCModel(BaseModel):
    """Full static topology returned by GET /model."""

    config: DesignConfig
    facility: FacilityStatic
    halls: list[HallStatic]
    racks: list[RackStatic]
    servers: list[ServerStatic]
    gpus: list[GpuStatic]
    gen_sources: list[GenSourceStatic]
    storage: list[StorageStatic]
    grid: GridStatic
    embodied: EmbodiedSummary
    hall_dims: Vec3
    total_gpus: int
    installed_it_mw: float


# ---------------------------------------------------------------------------
# Telemetry (streamed per frame; also queryable per hour)
# ---------------------------------------------------------------------------


class GpuTelemetry(BaseModel):
    id: str
    power_w: float
    util: float
    temp_c: float
    mem_used_gb: float
    job_id: str | None
    idle: bool
    live_carbon_g_s: float


class ServerTelemetry(BaseModel):
    id: str
    power_kw: float
    util: float
    temp_c: float
    active_jobs: int
    idle: bool


class RackTelemetry(BaseModel):
    id: str
    power_kw: float
    pct_capacity: float
    inlet_c: float
    outlet_c: float
    delta_t: float
    util: float
    live_carbon_g_s: float
    cooling_load_kw: float


class HallTelemetry(BaseModel):
    id: str
    it_kw: float
    avg_temp_c: float
    max_temp_c: float
    util: float
    active_racks: int


class EnergyFrame(BaseModel):
    solar_mw: float
    wind_mw: float
    gas_mw: float
    nuclear_mw: float
    battery_charge_mw: float  # +charge / -discharge from the battery's view
    battery_discharge_mw: float
    battery_soc: float  # 0..1
    grid_import_mw: float
    grid_export_mw: float
    curtailed_mw: float
    grid_carbon_g_per_kwh: float
    import_price: float
    served_load_mw: float
    clean_frac: float  # share of served load met by clean sources


class FacilityKPIs(BaseModel):
    it_kw: float
    facility_kw: float
    pue: float
    wue: float  # L/kWh
    cue: float  # gCO2e/kWh
    live_carbon_g_s: float
    water_l_s: float
    dollars_per_hr: float
    pct_renewable: float
    energy_today_kwh: float
    util: float


class TelemetryFrame(BaseModel):
    hour: float
    scenario: str
    kpis: FacilityKPIs
    energy: EnergyFrame
    halls: list[HallTelemetry]
    racks: list[RackTelemetry]
    # detail is only populated for a rack the client has subscribed to
    detail_rack_id: str | None = None
    servers: list[ServerTelemetry] = Field(default_factory=list)
    gpus: list[GpuTelemetry] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Finance
# ---------------------------------------------------------------------------


class CapexBreakdown(BaseModel):
    it_hardware: float
    solar: float
    wind: float
    gas: float
    nuclear: float
    battery: float
    facility: float
    total: float


class FinanceReport(BaseModel):
    capex: CapexBreakdown
    annualized_capex: float
    opex: float
    energy_cost: float  # grid imports - export revenue
    grid_services_revenue: float
    heat_reuse_credit: float
    net_annual_cost: float
    baseline_net_annual_cost: float  # grid-only design serving same load
    annual_savings: float
    payback_years: float | None
    roi: float
    npv: float
    dollars_per_mwh_compute: float
    cash_flow: list[float]  # cumulative cash flow per year vs baseline
    # four-dimension summary numbers for the compare view
    annual_energy_mwh: float
    annual_carbon_t: float
    annual_water_ml: float  # megaliters
    clean_match_pct: float


# ---------------------------------------------------------------------------
# Scenarios, control, compare
# ---------------------------------------------------------------------------


class Scenario(BaseModel):
    id: str
    name: str
    description: str


class ControlCommand(BaseModel):
    action: Literal["play", "pause", "speed", "scrub", "scenario", "subscribe"]
    speed: float | None = None
    hour: float | None = None
    scenario: str | None = None
    rack_id: str | None = None


class ControlState(BaseModel):
    playing: bool
    speed: float
    hour: float
    scenario: str
    detail_rack_id: str | None


class ScheduleRequest(BaseModel):
    enabled: bool


class ScheduleResult(BaseModel):
    enabled: bool
    carbon_before_t: float
    carbon_after_t: float
    carbon_delta_pct: float
    battery_need_before_mwh: float
    battery_need_after_mwh: float
    shifted_jobs: int
    note: str


class SavedDesign(BaseModel):
    name: str
    config: DesignConfig
    finance: FinanceReport


class CompareDimension(BaseModel):
    label: str
    a: float
    b: float
    delta: float
    delta_pct: float
    unit: str
    better: Literal["lower", "higher"]


class CompareResult(BaseModel):
    name_a: str
    name_b: str
    dimensions: list[CompareDimension]


class BuildResponse(BaseModel):
    ok: bool
    model: DCModel
    finance: FinanceReport
    control: ControlState


class LifetimeReport(BaseModel):
    """Cumulative environmental / community impact over a design's lifetime,
    at year milestones, vs a grid-only baseline serving the same load."""

    years: list[float]
    design_carbon_t: list[float]  # cumulative incl. one-time embodied
    baseline_carbon_t: list[float]
    avoided_carbon_t: list[float]  # baseline - design (the win)
    design_tco: list[float]  # cumulative total cost of ownership
    baseline_tco: list[float]
    saved_cost: list[float]
    clean_gwh: list[float]  # cumulative clean energy delivered
    water_ml: list[float]  # cumulative water use (design)
    cars_equiv: list[float]  # avoided carbon as cars off the road / yr
    trees_equiv: list[float]  # trees needed to sequester avoided carbon
    homes_equiv: float  # homes continuously powered by clean energy
    embodied_t: float
    annual_avoided_carbon_t: float
    annual_clean_gwh: float
