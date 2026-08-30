import type {
  BuildResponse, CompareResult, Curves, DCModel, DesignConfig, FinanceReport,
  ForecastMetadata, ForecastResult, ForecastRunRequest, LifetimeReport, LocationOpt,
  Scenario, ScheduleResult,
} from "../types/api";

async function jget<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
async function jpost<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`${url} -> ${r.status}${detail ? `: ${detail}` : ""}`);
  }
  return r.json();
}

export const api = {
  model: () => jget<DCModel>("/model"),
  finance: () => jget<FinanceReport>("/finance"),
  lifetime: () => jget<LifetimeReport>("/lifetime"),
  scenarios: () => jget<Scenario[]>("/scenarios"),
  curves: () => jget<Curves>("/curves"),
  locations: () => jget<LocationOpt[]>("/locations"),
  build: (config: DesignConfig) => jpost<BuildResponse>("/config", config),
  control: (cmd: Record<string, unknown>) => jpost("/control", cmd),
  schedule: (enabled: boolean) => jpost<ScheduleResult>("/schedule", { enabled }),
  compare: (a: DesignConfig, b: DesignConfig) =>
    jpost<CompareResult>("/compare", { a, b }),
  forecastMetadata: () => jget<ForecastMetadata>("/forecast/metadata"),
  forecastExample: () => jget<ForecastRunRequest>("/forecast/example"),
  forecast: (request: ForecastRunRequest) =>
    jpost<ForecastResult>("/forecast", request),
};
