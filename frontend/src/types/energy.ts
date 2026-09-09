// Mirrors backend/app/energy/models.py. Dates use the synthetic site clock.
import type { ForecastScenario, QuantileValues } from "./api";

export interface SupplyPortfolio {
  solar_mw: number;
  wind_mw: number;
  hydro_mw: number;
  hydro_mode: "run-of-river" | "reservoir-budget";
  hydro_capacity_factor: number;
  hydro_operational_g_per_kwh: number;
  hydro_water_consumption_l_per_kwh: number | null;
  nuclear_mw: number;
  nuclear_availability: number;
  gas_mw: number;
  gas_operational_g_per_kwh: number;
  battery_power_mw: number;
  battery_energy_mwh: number;
  battery_round_trip_efficiency: number;
  commissioning_date: string | null;
}

export interface GridConnection {
  import_limit_mw: number | null;
  export_limit_mw: number;
  import_price_per_kwh: number;
  export_price_per_kwh: number;
}

export interface WorkFlexibility {
  fraction: number;
  max_delay_hours: number;
}

export interface CoolingWater {
  heat_rejection: "dry" | "evaporative" | "hybrid";
  consumption_l_per_it_kwh: number;
  withdrawal_multiplier: number;
  temperature_sensitivity_per_c: number;
}

export interface CouplingRequest {
  demand: ForecastScenario;
  supply: SupplyPortfolio;
  grid: GridConnection;
  flexibility: WorkFlexibility;
  cooling_water: CoolingWater;
  weather_case: "typical" | "hot-dry" | "low-renewables";
  sample_count: number;
  seed: number;
  trace_month: number;
}

export interface EnergyMetrics {
  required_energy_mwh: QuantileValues;
  served_energy_mwh: QuantileValues;
  grid_import_mwh: QuantileValues;
  grid_export_mwh: QuantileValues;
  peak_grid_import_mw: QuantileValues;
  renewable_generation_mwh: QuantileValues;
  renewable_served_mwh: QuantileValues;
  renewable_match_pct: QuantileValues;
  solar_generation_mwh: QuantileValues;
  wind_generation_mwh: QuantileValues;
  hydro_generation_mwh: QuantileValues;
  nuclear_generation_mwh: QuantileValues;
  gas_generation_mwh: QuantileValues;
  battery_charge_mwh: QuantileValues;
  battery_discharge_mwh: QuantileValues;
  battery_losses_mwh: QuantileValues;
  curtailed_mwh: QuantileValues;
  unserved_energy_mwh: QuantileValues;
  shortfall_hours: QuantileValues;
  operational_carbon_t: QuantileValues;
  variable_energy_cost_usd: QuantileValues;
  cooling_water_consumption_l: QuantileValues;
  cooling_water_withdrawal_l: QuantileValues;
  hydro_water_consumption_l: QuantileValues | null;
  requested_compute_mwh_equivalent: QuantileValues;
  shifted_compute_mwh_equivalent: QuantileValues;
}

export interface EnergyPeriod {
  period: string;
  metrics: EnergyMetrics;
}

export interface PortfolioResult {
  name: string;
  summary: EnergyMetrics;
  periods: EnergyPeriod[];
  final_battery_energy_mwh: QuantileValues;
}

export interface PortfolioComparison {
  comparable: boolean;
  explanation: string;
  carbon_change_pct_p50: number | null;
  grid_import_change_pct_p50: number | null;
  peak_grid_change_pct_p50: number | null;
  variable_cost_change_pct_p50: number | null;
  cooling_water_change_pct_p50: number | null;
}

export interface EnergyHour {
  timestamp: string;
  installed_it_mw: number;
  it_power_mw: number;
  original_it_power_mw: number;
  effective_utilization: number;
  original_effective_utilization: number;
  original_load_mw: number;
  required_load_mw: number;
  solar_generation_mw: number;
  wind_generation_mw: number;
  hydro_generation_mw: number;
  nuclear_generation_mw: number;
  gas_generation_mw: number;
  solar_available_mw: number;
  wind_available_mw: number;
  solar_to_load_mw: number;
  wind_to_load_mw: number;
  hydro_to_load_mw: number;
  nuclear_to_load_mw: number;
  battery_to_load_mw: number;
  gas_to_load_mw: number;
  grid_to_load_mw: number;
  unserved_mw: number;
  renewable_available_mw: number;
  renewable_to_load_mw: number;
  battery_charge_mw: number;
  battery_state_mwh: number;
  grid_export_mw: number;
  curtailed_mw: number;
  baseline_grid_import_mw: number;
  baseline_unserved_mw: number;
  ambient_c: number;
  grid_carbon_g_per_kwh: number;
  cooling_water_consumption_l: number;
  cooling_water_withdrawal_l: number;
  hydro_water_consumption_l: number | null;
  operational_carbon_t: number;
  variable_energy_cost_usd: number;
  baseline_operational_carbon_t: number;
  baseline_variable_energy_cost_usd: number;
  baseline_cooling_water_consumption_l: number;
  baseline_cooling_water_withdrawal_l: number;
}

export interface CouplingProvenance {
  coupling_version: string;
  demand_model_version: string;
  calibration_status: "uncalibrated";
  classification: "synthetic";
  timestep: "hourly";
  trace_label: string;
  trace_path_index: number;
  assumptions: string[];
}

export interface CouplingResult {
  run_id: string;
  generated_at: string;
  sample_count: number;
  seed: number;
  proposed: PortfolioResult;
  baseline: PortfolioResult;
  comparison: PortfolioComparison;
  hourly_trace: EnergyHour[];
  warnings: string[];
  provenance: CouplingProvenance;
}

export interface CompletedCoupling {
  request: CouplingRequest;
  result: CouplingResult;
}
