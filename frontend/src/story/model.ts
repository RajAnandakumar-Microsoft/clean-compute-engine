import type {
  CoolingType,
  ForecastRunRequest,
  ForecastWorkloadMix,
} from "../types/api";

export type WorkloadChoice = "balanced" | "inference" | "training";

export interface StoryDecisions {
  workload: WorkloadChoice;
  cooling: CoolingType;
  hour: number;
  year: number;
}

export interface WorldSignals {
  installedItMw: number;
  utilization: number;
  itPowerMw: number;
  facilityPowerMw: number;
  pue: number;
  gridCarbon: number;
  carbonTPerHour: number;
  ambientC: number;
  phaseCount: number;
  refreshed: boolean;
}

export const STORY_START_YEAR = 2027;
export const STORY_END_YEAR = 2037;

export function storyHorizonYears(year: number): number {
  return Math.max(1, Math.min(10, year - STORY_START_YEAR));
}

const WORKLOAD_MIXES: Record<WorkloadChoice, ForecastWorkloadMix> = {
  // Keep these choices aligned with export_story_outcomes.py.
  balanced: {
    training: 0.30,
    real_time_inference: 0.45,
    batch_inference: 0.15,
    development: 0.10,
  },
  inference: {
    training: 0.10,
    real_time_inference: 0.70,
    batch_inference: 0.15,
    development: 0.05,
  },
  training: {
    training: 0.70,
    real_time_inference: 0.10,
    batch_inference: 0.15,
    development: 0.05,
  },
};

function circularDistance(value: number, center: number): number {
  const distance = Math.abs(value - center);
  return Math.min(distance, 24 - distance);
}

function workloadUtilization(choice: WorkloadChoice, hour: number): number {
  const daytime = Math.exp(-0.5 * (circularDistance(hour, 15) / 5) ** 2);
  const overnight = Math.exp(-0.5 * (circularDistance(hour, 2) / 4) ** 2);
  if (choice === "training") return 0.74 + 0.06 * daytime;
  if (choice === "inference") return 0.38 + 0.34 * daytime;
  return 0.44 + 0.20 * daytime + 0.08 * overnight;
}

export function calculateWorldSignals(decisions: StoryDecisions): WorldSignals {
  const phaseCount = decisions.year >= 2029 ? 2 : 1;
  const installedItMw = phaseCount === 2 ? 50 : 20;
  const refreshed = decisions.year >= 2031;
  const utilization = workloadUtilization(decisions.workload, decisions.hour);
  const ambientC = 14 + 8 * Math.cos(2 * Math.PI * (decisions.hour - 15) / 24);
  const idleFraction = 0.34;
  const refreshFactor = refreshed ? 0.90 : 1.0;
  const itPowerMw = installedItMw
    * refreshFactor
    * (idleFraction + (1 - idleFraction) * utilization ** 0.90);
  const designPue = decisions.cooling === "liquid" ? 1.20 : 1.38;
  const temperatureSensitivity = decisions.cooling === "liquid" ? 0.004 : 0.009;
  const lowLoadPenalty = 0.08 * Math.max(0, (0.65 - utilization) / 0.65);
  const pue = Math.max(
    1.02,
    designPue + temperatureSensitivity * (ambientC - 20) + lowLoadPenalty,
  );
  const decarbonization = (1 - 0.03) ** (decisions.year - STORY_START_YEAR);
  const eveningPeak = Math.exp(-0.5 * (circularDistance(decisions.hour, 19) / 3) ** 2);
  const gridCarbon = 360 * decarbonization * (0.91 + 0.25 * eveningPeak);
  const facilityPowerMw = itPowerMw * pue;
  return {
    installedItMw,
    utilization,
    itPowerMw,
    facilityPowerMw,
    pue,
    gridCarbon,
    carbonTPerHour: facilityPowerMw * gridCarbon / 1000,
    ambientC,
    phaseCount,
    refreshed,
  };
}

export function buildStoryForecastRequest(
  example: ForecastRunRequest,
  decisions: StoryDecisions,
): ForecastRunRequest {
  const request = structuredClone(example);
  const horizonYears = storyHorizonYears(decisions.year);
  request.seed = 73;
  request.sample_count = 96;
  request.scenario.name = "Virginia AI campus";
  request.scenario.location = "va-loudoun";
  request.scenario.start_date = `${STORY_START_YEAR}-01-01`;
  request.scenario.horizon_years = horizonYears;
  request.scenario.workload_mix = WORKLOAD_MIXES[decisions.workload];
  request.scenario.facility.cooling = decisions.cooling;
  request.scenario.facility.design_pue = decisions.cooling === "liquid" ? 1.20 : 1.38;
  const phaseOneTemplate = request.scenario.phases[0];
  if (!phaseOneTemplate) {
    throw new Error("The forecast example must include at least one capacity phase.");
  }
  const matureUtilization = decisions.workload === "training" ? 0.72 : 0.64;
  const phaseTwoTemplate = request.scenario.phases[1] ?? phaseOneTemplate;
  request.scenario.phases = [
    {
      ...phaseOneTemplate,
      name: "Phase 1",
      start_date: `${STORY_START_YEAR}-01-01`,
      it_capacity_mw: 20,
      mature_utilization: matureUtilization,
    },
    {
      ...phaseTwoTemplate,
      name: "Phase 2",
      start_date: "2029-01-01",
      it_capacity_mw: 30,
      mature_utilization: matureUtilization,
    },
  ];

  if (request.baseline) {
    request.baseline.name = "Conventional baseline";
    request.baseline.location = request.scenario.location;
    request.baseline.start_date = request.scenario.start_date;
    request.baseline.horizon_years = horizonYears;
    request.baseline.workload_mix = structuredClone(request.scenario.workload_mix);
    request.baseline.phases = structuredClone(request.scenario.phases);
    request.baseline.facility.cooling = "air";
    request.baseline.facility.design_pue = 1.45;
    for (const phase of request.baseline.phases) {
      phase.refresh_efficiency_gain = 0.04;
    }
  }
  return request;
}
