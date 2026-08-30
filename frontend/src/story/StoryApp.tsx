import { useEffect, useMemo, useRef, useState } from "react";
import type { CoolingType } from "../types/api";
import {
  runStoryForecast,
  type StoryForecastOutcome,
} from "./forecast";
import {
  calculateWorldSignals,
  STORY_END_YEAR,
  STORY_START_YEAR,
  storyHorizonYears,
  type StoryDecisions,
  type WorkloadChoice,
} from "./model";
import { VoxelWorld } from "./VoxelWorld";
import "./story.css";

const CHAPTERS = [
  {
    id: "site",
    label: "The site",
    eyebrow: "01 · BEFORE THE FIRST BLOCK",
    title: "A decade of impact begins with an empty field.",
    body: "Homes, water, transmission and a regional grid already share this landscape. The data center does not arrive in isolation.",
  },
  {
    id: "demand",
    label: "The build",
    eyebrow: "02 · WHAT WILL LIVE INSIDE?",
    title: "Twenty megawatts is only the shell of the story.",
    body: "The work placed inside determines how intensely the hardware runs, when demand peaks and how much infrastructure the campus needs.",
  },
  {
    id: "time",
    label: "Time",
    eyebrow: "03 · THE WORLD KEEPS MOVING",
    title: "The same facility is never the same system twice.",
    body: "Hours change demand and grid carbon. Years add capacity, refresh hardware and reshape the electricity supplying the campus.",
  },
  {
    id: "futures",
    label: "Futures",
    eyebrow: "04 · ONE PLAN, MANY FUTURES",
    title: "A forecast should show uncertainty, not hide it.",
    body: "The engine runs coherent hourly futures and resolves them into lower, expected and higher trajectories.",
  },
  {
    id: "compare",
    label: "Two worlds",
    eyebrow: "05 · DECISIONS BECOME CONSEQUENCES",
    title: "The useful question is not merely what happens.",
    body: "It is how much the outcome changes when a better design is chosen before concrete is poured.",
  },
] as const;

const STATIC_STORY = import.meta.env.VITE_STATIC_STORY === "true";
const STORY_HOME = STATIC_STORY
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}story`;
const PROJECT_URL = import.meta.env.VITE_PROJECT_URL || import.meta.env.BASE_URL;

const WORKLOADS: {
  id: WorkloadChoice;
  name: string;
  description: string;
}[] = [
  { id: "balanced", name: "Balanced AI", description: "Mixed training, inference and development" },
  { id: "inference", name: "Inference-led", description: "Demand follows users through the day" },
  { id: "training", name: "Training-led", description: "High, sustained accelerator utilization" },
];

function formatHour(hour: number): string {
  return `${Math.floor(hour).toString().padStart(2, "0")}:00`;
}

function formatEnergy(mwh: number): string {
  if (mwh >= 1_000_000) return `${(mwh / 1_000_000).toFixed(2)} TWh`;
  return `${(mwh / 1_000).toFixed(1)} GWh`;
}

function formatCarbon(tonnes: number): string {
  if (tonnes >= 1_000_000) return `${(tonnes / 1_000_000).toFixed(2)} Mt`;
  return `${(tonnes / 1_000).toFixed(1)} kt`;
}

function StateMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "clean" | "warn";
}) {
  return (
    <div className={`story-metric ${tone ?? ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function StoryApp() {
  const [stage, setStage] = useState(0);
  const [workload, setWorkload] = useState<WorkloadChoice>("balanced");
  const [cooling, setCooling] = useState<CoolingType>("liquid");
  const [hour, setHour] = useState(14);
  const [year, setYear] = useState(STORY_START_YEAR);
  const [result, setResult] = useState<StoryForecastOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);
  const decisionVersion = useRef(0);

  const decisions: StoryDecisions = useMemo(
    () => ({ workload, cooling, hour, year }),
    [workload, cooling, hour, year],
  );
  const signals = useMemo(() => {
    const activeSignals = calculateWorldSignals(decisions);
    return stage === 0
      ? {
          ...activeSignals,
          installedItMw: 0,
          phaseCount: 0,
          utilization: 0,
          itPowerMw: 0,
          facilityPowerMw: 0,
          pue: cooling === "liquid" ? 1.20 : 1.38,
          carbonTPerHour: 0,
        }
      : activeSignals;
  }, [decisions, stage]);
  const chapter = CHAPTERS[stage];
  const horizon = result?.scenario;
  const delta = result?.delta;

  useEffect(() => {
    setMobilePanelOpen(true);
  }, [stage]);

  const changeForecastDecision = (change: () => void) => {
    decisionVersion.current += 1;
    change();
    setResult(null);
    setError(null);
    if (stage === 4) setStage(3);
  };

  const goToStage = (next: number) => {
    if (next === 4 && !result) {
      setStage(3);
      return;
    }
    setStage(next);
  };

  const runFutures = async () => {
    const requestedVersion = decisionVersion.current;
    setBusy(true);
    setError(null);
    try {
      const forecastResult = await runStoryForecast(decisions);
      if (requestedVersion === decisionVersion.current) {
        setResult(forecastResult);
      }
    } catch (forecastError) {
      if (requestedVersion === decisionVersion.current) {
        setError(
          forecastError instanceof Error
            ? forecastError.message
            : "The forecast could not be completed.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="story-app">
      <div className="story-world">
        <VoxelWorld
          stage={stage}
          year={year}
          hour={hour}
          workload={workload}
          cooling={cooling}
          signals={signals}
          result={result}
          onBuild={() => setStage(1)}
        />
      </div>

      <header className="story-header">
        <a
          className="story-brand"
          href={STORY_HOME}
          aria-label="Clean Compute World home"
        >
          <span>◆</span>
          <div>
            <b>THE CLEAN COMPUTE WORLD</b>
            <small>Independent hackathon research · Not an official product</small>
          </div>
        </a>
        <div className="story-header-state">
          <span>VIRGINIA</span>
          <b>{year}</b>
          <span>{formatHour(hour)}</span>
        </div>
        <a
          className={`story-open-engine${STATIC_STORY ? " static" : ""}`}
          href={PROJECT_URL}
        >
          {STATIC_STORY ? "VIEW THE RESEARCH ↗" : "OPEN THE ENGINE ↗"}
        </a>
      </header>

      <aside
        className={`story-narrative ${
          mobilePanelOpen ? "sheet-open" : "sheet-collapsed"
        }`}
      >
        <button
          type="button"
          className="story-sheet-toggle"
          aria-expanded={mobilePanelOpen}
          aria-controls="story-narrative-content"
          aria-label={mobilePanelOpen ? "Collapse story panel" : "Expand story panel"}
          onClick={() => setMobilePanelOpen((open) => !open)}
        >
          <span className="story-sheet-grip" aria-hidden="true" />
          <span className="story-sheet-toggle-label">
            {mobilePanelOpen ? "VIEW THE WORLD" : chapter.title}
          </span>
          <span className="story-sheet-chevron" aria-hidden="true">
            {mobilePanelOpen ? "⌄" : "⌃"}
          </span>
        </button>

        <div id="story-narrative-content" className="story-narrative-content">
          <div className="story-eyebrow">{chapter.eyebrow}</div>
          <h1>{chapter.title}</h1>
          <p>{chapter.body}</p>

          {stage === 0 && (
            <div className="story-action-stack">
              <button className="story-primary" onClick={() => setStage(1)}>
                Place Phase 1 · 20 MW
              </button>
              <small>Or click the illuminated build pad in the world.</small>
            </div>
          )}

          {stage === 1 && (
            <>
              <div className="story-control-label">Choose the workload</div>
              <div className="story-choices vertical">
                {WORKLOADS.map((choice) => (
                  <button
                    key={choice.id}
                    className={workload === choice.id ? "selected" : ""}
                    onClick={() => changeForecastDecision(() => setWorkload(choice.id))}
                  >
                    <b>{choice.name}</b><span>{choice.description}</span>
                  </button>
                ))}
              </div>
              <div className="story-control-label">Choose the cooling design</div>
              <div className="story-choices">
                {([
                  ["liquid", "Liquid", "Lower heat sensitivity"],
                  ["air", "Air", "Higher facility overhead"],
                ] as const).map(([id, name, description]) => (
                  <button
                    key={id}
                    className={cooling === id ? "selected" : ""}
                    onClick={() => changeForecastDecision(() => setCooling(id))}
                  >
                    <b>{name}</b><span>{description}</span>
                  </button>
                ))}
              </div>
              <button className="story-primary" onClick={() => setStage(2)}>
                Start operating
              </button>
            </>
          )}

          {stage === 2 && (
            <>
              <label className="story-slider">
                <span><b>Move through the day</b><strong>{formatHour(hour)}</strong></span>
                <input
                  type="range"
                  min={0}
                  max={23}
                  step={1}
                  value={hour}
                  onChange={(event) => setHour(Number(event.target.value))}
                />
                <small><i>00:00</i><i>12:00</i><i>23:00</i></small>
              </label>
              <label className="story-slider year">
                <span><b>Advance the world</b><strong>{year}</strong></span>
                <input
                  type="range"
                  min={STORY_START_YEAR}
                  max={STORY_END_YEAR}
                  step={1}
                  value={year}
                  onChange={(event) => changeForecastDecision(
                    () => setYear(Number(event.target.value)),
                  )}
                />
                <small><i>Phase 1</i><i>Phase 2 · 2029</i><i>2037</i></small>
              </label>
              <div className="story-event">
                <span>
                  {signals.phaseCount === 1 ? "PHASE 1 ONLINE" : "PHASE 2 ONLINE"}
                </span>
                <p>
                  {signals.refreshed
                    ? "New hardware now performs equivalent work with a lower power assumption."
                    : "The original hardware generation remains in service."}
                </p>
              </div>
              <button className="story-primary" onClick={() => setStage(3)}>
                Open possible futures
              </button>
            </>
          )}

          {stage === 3 && (
            <>
              {!result ? (
                <div className="story-action-stack">
                  <div className="story-simulation-note">
                    <b>96 coherent futures</b>
                    <span>
                      {storyHorizonYears(year).toLocaleString()}
                      {" "}year horizon · hourly world states
                    </span>
                  </div>
                  <button
                    className="story-primary"
                    disabled={busy}
                    onClick={() => void runFutures()}
                  >
                    {busy ? "Building possible worlds…" : "Simulate P10 · P50 · P90"}
                  </button>
                </div>
              ) : horizon && (
                <>
                  <div className="story-quantiles">
                    {([
                      ["P10", "LOWER", horizon.cumulative_operational_carbon_t.p10],
                      ["P50", "EXPECTED", horizon.cumulative_operational_carbon_t.p50],
                      ["P90", "HIGHER", horizon.cumulative_operational_carbon_t.p90],
                    ] as const).map(([quantile, label, value]) => (
                      <div key={quantile}>
                        <span>{quantile} · {label}</span>
                        <b>{formatCarbon(value)}</b>
                      </div>
                    ))}
                  </div>
                  <p className="story-explain">
                    These are assumption-driven outcomes, not claims of calibrated accuracy.
                    The useful signal is the range and what moves it.
                  </p>
                  <button className="story-primary" onClick={() => setStage(4)}>
                    Compare the two worlds
                  </button>
                </>
              )}
              {error && <div className="story-error">{error}</div>}
            </>
          )}

          {stage === 4 && result && horizon && delta && (
            <>
              <div className="story-comparison">
                <div>
                  <span>PROPOSED</span>
                  <b>{cooling === "liquid" ? "Liquid-cooled" : "Air-cooled"}</b>
                  <small>PUE {horizon.average_pue.p50.toFixed(2)}</small>
                </div>
                <i>VS</i>
                <div>
                  <span>BASELINE</span>
                  <b>Conventional air</b>
                  <small>Design PUE 1.45</small>
                </div>
              </div>
              <div className="story-outcome">
                <span>EXPECTED DIFFERENCE</span>
                <b>{delta.facility_energy_pct_p50.toFixed(1)}% electricity</b>
                <b>{delta.operational_carbon_pct_p50.toFixed(1)}% operational carbon</b>
              </div>
              <p className="story-explain">
                The physical world on screen is the narrative. The forecast engine beneath
                it is what makes the comparison defensible once real data calibrates it.
              </p>
              <a className="story-primary link" href={PROJECT_URL}>
                {STATIC_STORY
                  ? "Explore the research and full engine ↗"
                  : "Explore the full v0.1 engine ↗"}
              </a>
            </>
          )}
        </div>
      </aside>

      <aside className="story-state">
        <div className="story-state-title">
          <span>{result ? "MODEL OUTPUT" : "WORLD STATE"}</span>
          <i className={result ? "calculated" : ""}>
            {result ? "SIMULATED" : "ILLUSTRATIVE"}
          </i>
        </div>
        {result && horizon ? (
          <>
            <StateMetric
              label={`P50 electricity · ${horizon.years} yr`}
              value={formatEnergy(horizon.cumulative_facility_energy_mwh.p50)}
            />
            <StateMetric
              label={`P50 operational carbon · ${horizon.years} yr`}
              value={formatCarbon(horizon.cumulative_operational_carbon_t.p50)}
              tone="warn"
            />
            <StateMetric
              label="P10–P90 carbon range"
              value={`${formatCarbon(horizon.cumulative_operational_carbon_t.p10)}–${formatCarbon(horizon.cumulative_operational_carbon_t.p90)}`}
            />
            <StateMetric label="Monte Carlo paths" value={result.sample_count.toString()} />
          </>
        ) : (
          <>
            <StateMetric label="Installed IT" value={`${signals.installedItMw} MW`} />
            <StateMetric label="Effective utilization" value={`${(signals.utilization * 100).toFixed(0)}%`} />
            <StateMetric label="Facility power" value={`${signals.facilityPowerMw.toFixed(1)} MW`} />
            <StateMetric
              label={stage === 0 ? "Target PUE" : "Dynamic PUE"}
              value={signals.pue.toFixed(2)}
              tone={signals.pue < 1.3 ? "clean" : "warn"}
            />
            <StateMetric label="Grid carbon" value={`${signals.gridCarbon.toFixed(0)} g/kWh`} />
            <StateMetric label="Operational carbon" value={`${signals.carbonTPerHour.toFixed(1)} t/hr`} />
          </>
        )}
        <div className="story-world-key">
          <span><i className="demand" />Glowing blocks = active compute</span>
          <span><i className="grid" />Power line = regional carbon</span>
          <span><i className="impact" />Columns = cumulative carbon</span>
        </div>
      </aside>

      <nav className="story-chapters" aria-label="Story chapters">
        <div className="story-progress">
          <i style={{ width: `${stage / (CHAPTERS.length - 1) * 100}%` }} />
        </div>
        {CHAPTERS.map((item, index) => (
          <button
            key={item.id}
            className={stage === index ? "active" : stage > index ? "done" : ""}
            disabled={index === 4 && !result}
            onClick={() => goToStage(index)}
          >
            <i>{stage > index ? "✓" : index + 1}</i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="story-orbit-hint">DRAG TO ORBIT · SCROLL TO ZOOM · CLICK TO DECIDE</div>
    </div>
  );
}
