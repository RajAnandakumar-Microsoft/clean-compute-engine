import type { CouplingRequest, EnergyHour } from "../types/energy";

export type WorldTab = "overview" | "design" | "energy" | "water" | "compute" | "compare";
export type AssetId = "campus" | "compute" | "solar" | "wind" | "hydro" | "nuclear" | "gas" | "battery" | "grid" | "cooling";
export type Position = [number, number, number];

export interface Asset {
  id: AssetId;
  name: string;
  color: string;
  position: Position;
  group: "Campus" | "Supply" | "Connections";
}

export const TABS: { id: WorldTab; label: string }[] = [
  { id: "overview", label: "Overview" }, { id: "design", label: "Design" },
  { id: "energy", label: "Energy" }, { id: "water", label: "Water" },
  { id: "compute", label: "Compute" }, { id: "compare", label: "Compare" },
];

export const ASSETS: Asset[] = [
  { id: "campus", name: "Campus overview", color: "#dae7f2", position: [0, 0, 0], group: "Campus" },
  { id: "compute", name: "Data hall", color: "#78ccd6", position: [0, 0, 0], group: "Campus" },
  { id: "cooling", name: "Cooling & water", color: "#4dd9dc", position: [7, 0, 1], group: "Campus" },
  { id: "solar", name: "Solar", color: "#edc15d", position: [-9, 0, 7], group: "Supply" },
  { id: "wind", name: "Wind", color: "#58caaa", position: [-10, 0, -6], group: "Supply" },
  { id: "hydro", name: "Hydroelectric", color: "#48b9ec", position: [9, 0, -7], group: "Supply" },
  { id: "nuclear", name: "Nuclear", color: "#b3a0ed", position: [0, 0, -11], group: "Supply" },
  { id: "gas", name: "Gas backup", color: "#cc956f", position: [-13, 0, 0], group: "Supply" },
  { id: "battery", name: "Battery", color: "#59dca7", position: [0, 0, 10], group: "Connections" },
  { id: "grid", name: "Grid connection", color: "#a9bfdc", position: [12, 0, 7], group: "Connections" },
];
export const HUB: Position = [0, 0.65, 5.5];
export const WATER_INTAKE: Position = [13, 0.2, 0];

export const fmt = (value: number, digits = 1) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });
export const mw = (value: number) => `${fmt(value, 2)} MW`;
export const liters = (value: number) => value >= 1000 ? `${fmt(value / 1000, 2)} kL/h` : `${fmt(value)} L/h`;

export function asset(id: AssetId): Asset {
  const found = ASSETS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown campus asset: ${id}`);
  return found;
}

export function assetCapacity(request: CouplingRequest, id: AssetId): number {
  switch (id) {
    case "solar": return request.supply.solar_mw;
    case "wind": return request.supply.wind_mw;
    case "hydro": return request.supply.hydro_mw;
    case "nuclear": return request.supply.nuclear_mw;
    case "gas": return request.supply.gas_mw;
    case "battery": return request.supply.battery_energy_mwh;
    case "grid": return request.grid.import_limit_mw ?? Infinity;
    case "campus":
    case "compute": return request.demand.phases.reduce((total, phase) => total + phase.it_capacity_mw, 0);
    case "cooling": return 1;
  }
}

export function generation(id: AssetId, hour: EnergyHour): number {
  switch (id) {
    case "solar": return hour.solar_generation_mw;
    case "wind": return hour.wind_generation_mw;
    case "hydro": return hour.hydro_generation_mw;
    case "nuclear": return hour.nuclear_generation_mw;
    case "gas": return hour.gas_generation_mw;
    case "battery": return hour.battery_to_load_mw - hour.battery_charge_mw;
    case "grid": return hour.grid_to_load_mw - hour.grid_export_mw;
    case "compute": return hour.it_power_mw;
    case "campus": return hour.required_load_mw;
    case "cooling": return hour.cooling_water_consumption_l;
  }
}

export function directDelivery(id: AssetId, hour: EnergyHour): number {
  switch (id) {
    case "solar": return hour.solar_to_load_mw;
    case "wind": return hour.wind_to_load_mw;
    case "hydro": return hour.hydro_to_load_mw;
    case "nuclear": return hour.nuclear_to_load_mw;
    case "gas": return hour.gas_to_load_mw;
    default: return generation(id, hour);
  }
}

export function assetState(request: CouplingRequest, hour: EnergyHour | null, id: AssetId): string {
  if (id === "campus" || id === "compute" || id === "cooling") return hour ? "Simulated" : "Draft design";
  if (id !== "grid" && assetCapacity(request, id) === 0) return "Not configured";
  if (!hour) return "Planned";
  if (id !== "grid" && request.supply.commissioning_date
    && hour.timestamp.slice(0, 10) < request.supply.commissioning_date) return "Not commissioned";
  if (id === "battery") return hour.battery_charge_mw > .001 ? "Charging"
    : hour.battery_to_load_mw > .001 ? "Discharging" : "Idle";
  if (id === "grid") return hour.grid_to_load_mw > .001 ? "Importing"
    : hour.grid_export_mw > .001 ? "Exporting" : hour.unserved_mw > .001 ? "Supply shortfall" : "No exchange";
  if (id === "solar" && hour.solar_available_mw < .001) return "Night / unavailable";
  return generation(id, hour) > .001 ? "Generating" : "Idle / unavailable";
}

export function baselineRequest(request: CouplingRequest): CouplingRequest {
  return { ...request, supply: {
    ...request.supply, solar_mw: 0, wind_mw: 0, hydro_mw: 0, nuclear_mw: 0,
    gas_mw: 0, battery_power_mw: 0, battery_energy_mwh: 0,
  } };
}

export function baselineFrame(hour: EnergyHour): EnergyHour {
  return {
    ...hour,
    required_load_mw: hour.original_load_mw,
    it_power_mw: hour.original_it_power_mw,
    effective_utilization: hour.original_effective_utilization,
    solar_generation_mw: 0, wind_generation_mw: 0, hydro_generation_mw: 0,
    nuclear_generation_mw: 0, gas_generation_mw: 0, solar_available_mw: 0, wind_available_mw: 0,
    solar_to_load_mw: 0, wind_to_load_mw: 0, hydro_to_load_mw: 0,
    nuclear_to_load_mw: 0, gas_to_load_mw: 0, battery_to_load_mw: 0,
    battery_charge_mw: 0, battery_state_mwh: 0, renewable_available_mw: 0,
    renewable_to_load_mw: 0, grid_export_mw: 0, curtailed_mw: 0,
    grid_to_load_mw: hour.baseline_grid_import_mw,
    unserved_mw: hour.baseline_unserved_mw,
    operational_carbon_t: hour.baseline_operational_carbon_t,
    variable_energy_cost_usd: hour.baseline_variable_energy_cost_usd,
    cooling_water_consumption_l: hour.baseline_cooling_water_consumption_l,
    cooling_water_withdrawal_l: hour.baseline_cooling_water_withdrawal_l,
    hydro_water_consumption_l: 0,
  };
}
