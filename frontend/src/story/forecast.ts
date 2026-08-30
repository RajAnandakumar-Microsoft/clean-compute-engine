import { api } from "../data/api";
import type { QuantileValues } from "../types/api";
import {
  buildStoryForecastRequest,
  storyHorizonYears,
  type StoryDecisions,
} from "./model";

export interface StoryForecastHorizon {
  years: number;
  cumulative_facility_energy_mwh: QuantileValues;
  cumulative_operational_carbon_t: QuantileValues;
  average_pue: QuantileValues;
}

export interface StoryForecastDelta {
  facility_energy_pct_p50: number;
  operational_carbon_pct_p50: number;
}

export interface StoryForecastOutcome {
  sample_count: number;
  scenario: StoryForecastHorizon;
  baseline: StoryForecastHorizon;
  delta: StoryForecastDelta;
}

interface StoryForecastPayload {
  scenario: StoryForecastHorizon;
  baseline: StoryForecastHorizon;
  delta: StoryForecastDelta;
}

interface StoryForecastCatalog {
  schema_version: "1.0";
  model_version: string;
  assumption_set_version: string;
  calibration_status: "uncalibrated";
  seed: number;
  sample_count: number;
  disclaimer: string;
  outcomes: Record<string, StoryForecastPayload>;
}

const STATIC_STORY = import.meta.env.VITE_STATIC_STORY === "true";
let catalogPromise: Promise<StoryForecastCatalog> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isQuantiles(value: unknown): value is QuantileValues {
  return isRecord(value)
    && isFiniteNumber(value.p10)
    && isFiniteNumber(value.p50)
    && isFiniteNumber(value.p90);
}

function isHorizon(value: unknown): value is StoryForecastHorizon {
  return isRecord(value)
    && isFiniteNumber(value.years)
    && isQuantiles(value.cumulative_facility_energy_mwh)
    && isQuantiles(value.cumulative_operational_carbon_t)
    && isQuantiles(value.average_pue);
}

function isDelta(value: unknown): value is StoryForecastDelta {
  return isRecord(value)
    && isFiniteNumber(value.facility_energy_pct_p50)
    && isFiniteNumber(value.operational_carbon_pct_p50);
}

function isPayload(value: unknown): value is StoryForecastPayload {
  return isRecord(value)
    && isHorizon(value.scenario)
    && isHorizon(value.baseline)
    && isDelta(value.delta);
}

function isCatalog(value: unknown): value is StoryForecastCatalog {
  if (
    !isRecord(value)
    || value.schema_version !== "1.0"
    || value.calibration_status !== "uncalibrated"
    || !isFiniteNumber(value.seed)
    || !isFiniteNumber(value.sample_count)
    || typeof value.model_version !== "string"
    || typeof value.assumption_set_version !== "string"
    || typeof value.disclaimer !== "string"
    || !isRecord(value.outcomes)
  ) {
    return false;
  }
  return Object.values(value.outcomes).every(isPayload);
}

async function loadCatalog(): Promise<StoryForecastCatalog> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}story-data/outcomes.json`,
  );
  if (!response.ok) {
    throw new Error(`Static story outcomes could not be loaded (${response.status}).`);
  }
  const body: unknown = await response.json();
  if (!isCatalog(body)) {
    throw new Error("Static story outcomes did not match the expected schema.");
  }
  return body;
}

function staticOutcomeKey(decisions: StoryDecisions): string {
  return [
    decisions.workload,
    decisions.cooling,
    storyHorizonYears(decisions.year),
  ].join(":");
}

async function runStaticForecast(
  decisions: StoryDecisions,
): Promise<StoryForecastOutcome> {
  catalogPromise ??= loadCatalog();
  const catalog = await catalogPromise;
  const key = staticOutcomeKey(decisions);
  const outcome = catalog.outcomes[key];
  if (!outcome) {
    throw new Error(`No static story outcome exists for ${key}.`);
  }
  return {
    sample_count: catalog.sample_count,
    ...outcome,
  };
}

async function runLiveForecast(
  decisions: StoryDecisions,
): Promise<StoryForecastOutcome> {
  const example = await api.forecastExample();
  const request = buildStoryForecastRequest(example, decisions);
  const result = await api.forecast(request);
  const scenario = result.scenario.horizons[result.scenario.horizons.length - 1];
  const baseline = result.baseline?.horizons[result.baseline.horizons.length - 1];
  const delta = result.deltas[result.deltas.length - 1];
  if (!scenario || !baseline || !delta) {
    throw new Error("The forecast did not return the requested comparison horizon.");
  }
  return {
    sample_count: result.sample_count,
    scenario,
    baseline,
    delta,
  };
}

export function runStoryForecast(
  decisions: StoryDecisions,
): Promise<StoryForecastOutcome> {
  return STATIC_STORY
    ? runStaticForecast(decisions)
    : runLiveForecast(decisions);
}
