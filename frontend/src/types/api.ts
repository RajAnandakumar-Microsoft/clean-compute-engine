// Mirrors backend/app/models.py. Keep in sync with the Pydantic schemas.

export type CoolingType = "air" | "liquid";
export type SourceType = "grid" | "solar" | "wind" | "gas" | "nuclear" | "battery";
export type GpuModelName = "H100" | "GB200" | "A100" | "MI300X";
export type Placement = "pack" | "spread";
export type LensName = "operator" | "sustainability" | "financial";
export type OverlayName = "temperature" | "power" | "utilization" | "carbon" | "idle";

export interface Vec3 { x: number; y: number; z: number; }

export interface ITBuild {
  rack_count: number; gpu_model: GpuModelName; servers_per_rack: number;
  gpus_per_server: number; cooling: CoolingType; design_density_kw: number;
}
export interface EnergyBuild {
  grid_interconnect_mw: number; solar_mw: number; wind_mw: number; gas_mw: number;
  nuclear_mw: number; battery_mwh: number; battery_mw: number;
}
export interface WorkloadProfile {
  base_load_frac: number; peak_load_frac: number; deferrable_frac: number;
}
export interface FinancialAssumptions {
  import_price: number; export_price: number; grid_services_per_mw_yr: number;
  heat_reuse_value: number; discount_rate: number; horizon_years: number;
}
export interface Toggles { smart_scheduling: boolean; placement: Placement; }
export interface DesignConfig {
  name: string; location: string; seed: number; it_build: ITBuild;
  energy_build: EnergyBuild; workload: WorkloadProfile;
  finance: FinancialAssumptions; toggles: Toggles;
}

export interface GpuStatic {
  id: string; server_id: string; rack_id: string; model: string; tdp_w: number;
  memory_gb: number; embodied_co2e_kg: number; install_year: number;
  useful_life_yr: number; pos: Vec3;
}
export interface ServerStatic {
  id: string; rack_id: string; u_slot: number; model: string; gpu_count: number;
  rated_power_kw: number; embodied_co2e_kg: number; install_year: number;
  useful_life_yr: number; pos: Vec3;
}
export interface RackStatic {
  id: string; hall_id: string; row: number; col: number; u_height: number;
  breaker_kw: number; cooling: CoolingType; pos: Vec3;
}
export interface HallStatic {
  id: string; facility_id: string; name: string; area_m2: number;
  rack_capacity: number; cooling: CoolingType; design_density_kw: number;
}
export interface FacilityStatic {
  id: string; name: string; region: string; grid_region: string; climate_zone: string;
  tier: number; power_capacity_mw: number; design_pue: number; water_source: string;
  commissioned_year: number;
}
export interface GenSourceStatic {
  id: string; type: SourceType; nameplate_mw: number; capex_per_mw: number;
  opex_per_mwh: number; carbon_g_per_kwh: number; water_l_per_mwh: number;
  dispatchable: boolean;
}
export interface StorageStatic {
  id: string; energy_mwh: number; power_mw: number; round_trip_eff: number;
  capex_per_mwh: number; opex_per_mwh: number; cycle_life: number;
}
export interface GridStatic {
  interconnect_mw: number; import_price: number; export_price: number; peak_hours: number[];
}
export interface EmbodiedSummary { gpu_co2e_t: number; server_co2e_t: number; total_co2e_t: number; }

export interface DCModel {
  config: DesignConfig; facility: FacilityStatic; halls: HallStatic[]; racks: RackStatic[];
  servers: ServerStatic[]; gpus: GpuStatic[]; gen_sources: GenSourceStatic[];
  storage: StorageStatic[]; grid: GridStatic; embodied: EmbodiedSummary;
  hall_dims: Vec3; total_gpus: number; installed_it_mw: number;
}

export interface GpuTelemetry {
  id: string; power_w: number; util: number; temp_c: number; mem_used_gb: number;
  job_id: string | null; idle: boolean; live_carbon_g_s: number;
}
export interface ServerTelemetry {
  id: string; power_kw: number; util: number; temp_c: number; active_jobs: number; idle: boolean;
}
export interface RackTelemetry {
  id: string; power_kw: number; pct_capacity: number; inlet_c: number; outlet_c: number;
  delta_t: number; util: number; live_carbon_g_s: number; cooling_load_kw: number;
}
export interface HallTelemetry {
  id: string; it_kw: number; avg_temp_c: number; max_temp_c: number; util: number; active_racks: number;
}
export interface EnergyFrame {
  solar_mw: number; wind_mw: number; gas_mw: number; nuclear_mw: number;
  battery_charge_mw: number; battery_discharge_mw: number; battery_soc: number;
  grid_import_mw: number; grid_export_mw: number; curtailed_mw: number;
  grid_carbon_g_per_kwh: number; import_price: number; served_load_mw: number; clean_frac: number;
}
export interface FacilityKPIs {
  it_kw: number; facility_kw: number; pue: number; wue: number; cue: number;
  live_carbon_g_s: number; water_l_s: number; dollars_per_hr: number;
  pct_renewable: number; energy_today_kwh: number; util: number;
}
export interface TelemetryFrame {
  hour: number; scenario: string; kpis: FacilityKPIs; energy: EnergyFrame;
  halls: HallTelemetry[]; racks: RackTelemetry[]; detail_rack_id: string | null;
  servers: ServerTelemetry[]; gpus: GpuTelemetry[];
}

export interface CapexBreakdown {
  it_hardware: number; solar: number; wind: number; gas: number; nuclear: number;
  battery: number; facility: number; total: number;
}
export interface FinanceReport {
  capex: CapexBreakdown; annualized_capex: number; opex: number; energy_cost: number;
  grid_services_revenue: number; heat_reuse_credit: number; net_annual_cost: number;
  baseline_net_annual_cost: number; annual_savings: number; payback_years: number | null;
  roi: number; npv: number; dollars_per_mwh_compute: number; cash_flow: number[];
  annual_energy_mwh: number; annual_carbon_t: number; annual_water_ml: number; clean_match_pct: number;
}

export interface Scenario { id: string; name: string; description: string; }
export interface LocationOpt { id: string; name: string; }
export interface ControlState {
  playing: boolean; speed: number; hour: number; scenario: string; detail_rack_id: string | null;
}
export interface ScheduleResult {
  enabled: boolean; carbon_before_t: number; carbon_after_t: number; carbon_delta_pct: number;
  battery_need_before_mwh: number; battery_need_after_mwh: number; shifted_jobs: number; note: string;
}
export interface CompareDimension {
  label: string; a: number; b: number; delta: number; delta_pct: number;
  unit: string; better: "lower" | "higher";
}
export interface CompareResult { name_a: string; name_b: string; dimensions: CompareDimension[]; }
export interface BuildResponse { ok: boolean; model: DCModel; finance: FinanceReport; control: ControlState; }
export interface Curves { grid_carbon: number[]; price: number[]; solar_cf: number[]; wind_cf: number[]; }
export interface LifetimeReport {
  years: number[];
  design_carbon_t: number[]; baseline_carbon_t: number[]; avoided_carbon_t: number[];
  design_tco: number[]; baseline_tco: number[]; saved_cost: number[];
  clean_gwh: number[]; water_ml: number[]; cars_equiv: number[]; trees_equiv: number[];
  homes_equiv: number; embodied_t: number; annual_avoided_carbon_t: number; annual_clean_gwh: number;
}

export type ForecastLocationName = "az-desert" | "tx-plains" | "va-loudoun" | "pnw-hydro";

export interface CapacityPhase {
  name: string;
  start_date: string;
  it_capacity_mw: number;
  initial_utilization: number;
  mature_utilization: number;
  ramp_months: number;
  hardware_profile: GpuModelName;
  refresh_interval_years: number;
  refresh_efficiency_gain: number;
}

export interface ForecastWorkloadMix {
  training: number;
  real_time_inference: number;
  batch_inference: number;
  development: number;
}

export interface ForecastFacilityAssumptions {
  design_pue: number;
  cooling: CoolingType;
  temperature_sensitivity_per_c: number | null;
  low_load_pue_penalty: number;
  reference_utilization: number;
}

export interface ForecastGridAssumptions {
  carbon_intensity_override_g_per_kwh: number | null;
  annual_decarbonization_rate: number;
}

export interface ForecastUncertaintyAssumptions {
  utilization_relative_sd: number;
  hourly_utilization_volatility: number;
  pue_absolute_sd: number;
  daily_weather_sd_c: number;
  grid_carbon_relative_sd: number;
  grid_decarbonization_sd: number;
  phase_start_delay_months_sd: number;
  rare_event_probability_per_day: number;
  rare_event_utilization_change: number;
}

export interface ForecastScenario {
  name: string;
  start_date: string;
  horizon_years: number;
  location: ForecastLocationName;
  phases: CapacityPhase[];
  workload_mix: ForecastWorkloadMix;
  facility: ForecastFacilityAssumptions;
  grid: ForecastGridAssumptions;
  uncertainty: ForecastUncertaintyAssumptions;
}

export interface ForecastRunRequest {
  scenario: ForecastScenario;
  baseline: ForecastScenario | null;
  seed: number;
  sample_count: number;
}

export interface QuantileValues { p10: number; p50: number; p90: number; }

export interface ForecastPeriod {
  period: string;
  installed_it_mw: QuantileValues;
  effective_utilization: QuantileValues;
  it_energy_mwh: QuantileValues;
  facility_energy_mwh: QuantileValues;
  operational_carbon_t: QuantileValues;
  average_pue: QuantileValues;
  peak_facility_mw: QuantileValues;
}

export interface ForecastHorizonSummary {
  years: number;
  installed_it_mw: QuantileValues;
  cumulative_it_energy_mwh: QuantileValues;
  cumulative_facility_energy_mwh: QuantileValues;
  cumulative_operational_carbon_t: QuantileValues;
  average_effective_utilization: QuantileValues;
  average_pue: QuantileValues;
  peak_facility_mw: QuantileValues;
}

export interface ForecastHorizonDelta {
  years: number;
  facility_energy_mwh: QuantileValues;
  operational_carbon_t: QuantileValues;
  facility_energy_pct_p50: number;
  operational_carbon_pct_p50: number;
}

export interface DriverSensitivity {
  driver: string;
  outcome: "facility_energy" | "operational_carbon";
  correlation: number;
  impact_score: number;
  direction: "increases" | "decreases" | "neutral";
  description: string;
}

export interface ForecastSeries {
  name: string;
  periods: ForecastPeriod[];
  horizons: ForecastHorizonSummary[];
}

export interface ForecastProvenance {
  model_version: string;
  assumption_set_version: string;
  calibration_status: "uncalibrated";
  engine: string;
  timestep: "hourly";
  aggregation: "monthly";
  disclaimer: string;
  assumptions: string[];
}

export interface ForecastResult {
  run_id: string;
  generated_at: string;
  seed: number;
  sample_count: number;
  scenario: ForecastSeries;
  baseline: ForecastSeries | null;
  deltas: ForecastHorizonDelta[];
  sensitivities: DriverSensitivity[];
  provenance: ForecastProvenance;
}

export interface ForecastOption {
  id: string;
  name: string;
  description: string;
}

export interface ForecastMetadata {
  model_version: string;
  assumption_set_version: string;
  calibration_status: "uncalibrated";
  locations: ForecastOption[];
  hardware_profiles: ForecastOption[];
  workload_archetypes: ForecastOption[];
  disclaimer: string;
}
