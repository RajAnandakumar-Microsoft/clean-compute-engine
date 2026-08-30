import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../data/store";
import type {
  CapacityPhase,
  CoolingType,
  ForecastPeriod,
  ForecastRunRequest,
  ForecastScenario,
  GpuModelName,
  QuantileValues,
} from "../../types/api";

function NumberField({
  label, value, min, max, step, unit, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}{unit && <b>{unit}</b>}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function PercentField({
  label, value, max = 100, onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <NumberField
      label={label}
      value={Math.round(value * 1000) / 10}
      min={0}
      max={max}
      step={1}
      unit="%"
      onChange={(next) => onChange(next / 100)}
    />
  );
}

const formatEnergy = (value: number) => {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000) return `${sign}${(absolute / 1_000_000).toFixed(2)} TWh`;
  if (absolute >= 1_000) return `${sign}${(absolute / 1_000).toFixed(1)} GWh`;
  return `${sign}${absolute.toFixed(0)} MWh`;
};

const formatCarbon = (value: number) => {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000) return `${sign}${(absolute / 1_000_000).toFixed(2)} Mt`;
  if (absolute >= 1_000) return `${sign}${(absolute / 1_000).toFixed(1)} kt`;
  return `${sign}${absolute.toFixed(0)} t`;
};

function MetricCard({
  label, values, format,
}: {
  label: string;
  values: QuantileValues;
  format: (value: number) => string;
}) {
  return (
    <div className="forecast-metric">
      <b>{format(values.p50)}</b>
      <span>{label}</span>
      <small>P10 {format(values.p10)} · P90 {format(values.p90)}</small>
    </div>
  );
}

function MonthlyCarbonChart({ periods }: { periods: ForecastPeriod[] }) {
  const width = 272;
  const height = 94;
  const padding = 5;
  const maximum = Math.max(...periods.map((period) => period.operational_carbon_t.p90), 1);
  const x = (index: number) => (
    padding + index / Math.max(periods.length - 1, 1) * (width - 2 * padding)
  );
  const y = (value: number) => height - padding - value / maximum * (height - 2 * padding);
  const path = (selector: (period: ForecastPeriod) => number) => periods
    .map((period, index) => (
      `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(selector(period)).toFixed(1)}`
    ))
    .join(" ");
  const upper = path((period) => period.operational_carbon_t.p90);
  const lower = [...periods]
    .reverse()
    .map((period, reverseIndex) => {
      const index = periods.length - 1 - reverseIndex;
      return `L${x(index).toFixed(1)},${y(period.operational_carbon_t.p10).toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="forecast-chart" role="img">
      <title>Monthly operational carbon P10, P50, and P90</title>
      <path d={`${upper} ${lower} Z`} className="forecast-band" />
      <path d={path((period) => period.operational_carbon_t.p50)} className="forecast-line" />
    </svg>
  );
}

function downloadForecast(request: ForecastRunRequest, result: object) {
  const payload = JSON.stringify({ request, result }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  const slug = request.scenario.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  anchor.download = `clean-compute-${slug}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ForecastPanel() {
  const metadata = useStore((state) => state.forecastMetadata);
  const storedRequest = useStore((state) => state.forecastRequest);
  const completedRequest = useStore((state) => state.forecastCompletedRequest);
  const result = useStore((state) => state.forecastResult);
  const busy = useStore((state) => state.forecastBusy);
  const runForecast = useStore((state) => state.runForecast);
  const [draft, setDraft] = useState<ForecastRunRequest | null>(null);

  useEffect(() => {
    if (storedRequest) setDraft(structuredClone(storedRequest));
  }, [storedRequest]);

  const workloadTotal = useMemo(() => {
    if (!draft) return 0;
    const workload = draft.scenario.workload_mix;
    return workload.training
      + workload.real_time_inference
      + workload.batch_inference
      + workload.development;
  }, [draft]);

  if (!draft || !metadata) return <p className="hint">Loading forecast assumptions…</p>;

  const updateScenario = (
    patch: Partial<ForecastScenario>,
    syncBaseline = true,
  ) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        scenario: { ...current.scenario, ...patch },
        baseline: syncBaseline && current.baseline
          ? { ...current.baseline, ...patch }
          : current.baseline,
      };
    });
  };

  const updatePhase = (
    index: number,
    patch: Partial<CapacityPhase>,
    syncBaseline = true,
  ) => {
    setDraft((current) => {
      if (!current) return current;
      const phases = current.scenario.phases.map((phase, phaseIndex) => (
        phaseIndex === index ? { ...phase, ...patch } : phase
      ));
      const baselinePhases = current.baseline?.phases.map((phase, phaseIndex) => (
        syncBaseline && phaseIndex === index ? { ...phase, ...patch } : phase
      ));
      return {
        ...current,
        scenario: { ...current.scenario, phases },
        baseline: current.baseline
          ? { ...current.baseline, phases: baselinePhases ?? current.baseline.phases }
          : null,
      };
    });
  };

  const addPhase = () => {
    const index = draft.scenario.phases.length + 1;
    const startYear = Number(draft.scenario.start_date.slice(0, 4));
    const year = Math.min(startYear + (index - 1) * 2, startYear + draft.scenario.horizon_years - 1);
    const phase: CapacityPhase = {
      name: `Phase ${index}`,
      start_date: `${year}-01-01`,
      it_capacity_mw: 20,
      initial_utilization: 0.15,
      mature_utilization: 0.65,
      ramp_months: 18,
      hardware_profile: "H100",
      refresh_interval_years: 4,
      refresh_efficiency_gain: 0.10,
    };
    const baselinePhase = { ...phase, refresh_efficiency_gain: 0.04 };
    setDraft({
      ...draft,
      scenario: { ...draft.scenario, phases: [...draft.scenario.phases, phase] },
      baseline: draft.baseline
        ? { ...draft.baseline, phases: [...draft.baseline.phases, baselinePhase] }
        : null,
    });
  };

  const removePhase = (index: number) => {
    if (draft.scenario.phases.length === 1) return;
    setDraft({
      ...draft,
      scenario: {
        ...draft.scenario,
        phases: draft.scenario.phases.filter((_, phaseIndex) => phaseIndex !== index),
      },
      baseline: draft.baseline
        ? {
          ...draft.baseline,
          phases: draft.baseline.phases.filter((_, phaseIndex) => phaseIndex !== index),
        }
        : null,
    });
  };

  const workloadValid = Math.abs(workloadTotal - 1) < 0.001;
  const phasesValid = draft.scenario.phases.every(
    (phase) => phase.mature_utilization >= phase.initial_utilization,
  );
  const resultIsStale = completedRequest
    ? JSON.stringify(draft) !== JSON.stringify(completedRequest)
    : false;
  const carbonDrivers = result?.sensitivities
    .filter((item) => item.outcome === "operational_carbon")
    .slice(0, 5) ?? [];

  return (
    <div className="forecast">
      <div className="forecast-status">
        <div><b>Forecast v{metadata.model_version}</b><span>UNCALIBRATED</span></div>
        <p>{metadata.disclaimer}</p>
      </div>

      <div className="section-label">Scenario</div>
      <label className="field">
        <span>Scenario name</span>
        <input
          type="text"
          value={draft.scenario.name}
          onChange={(event) => updateScenario({ name: event.target.value }, false)}
        />
      </label>
      <label className="field">
        <span>Location archetype</span>
        <select
          value={draft.scenario.location}
          onChange={(event) => updateScenario({
            location: event.target.value as ForecastScenario["location"],
          })}
        >
          {metadata.locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Forecast start</span>
        <input
          type="month"
          value={draft.scenario.start_date.slice(0, 7)}
          onChange={(event) => updateScenario({ start_date: `${event.target.value}-01` })}
        />
      </label>
      <NumberField
        label="Horizon"
        value={draft.scenario.horizon_years}
        min={1}
        max={10}
        step={1}
        unit="years"
        onChange={(horizon_years) => updateScenario({ horizon_years })}
      />

      <div className="section-label">Phased IT buildout</div>
      {draft.scenario.phases.map((phase, index) => (
        <details className="forecast-phase" key={`${phase.name}-${index}`} open={index === 0}>
          <summary><span>{phase.name}</span><b>{phase.it_capacity_mw} MW</b></summary>
          <label className="field">
            <span>Phase name</span>
            <input
              type="text"
              value={phase.name}
              onChange={(event) => updatePhase(index, { name: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Start month</span>
            <input
              type="month"
              value={phase.start_date.slice(0, 7)}
              onChange={(event) => updatePhase(index, { start_date: `${event.target.value}-01` })}
            />
          </label>
          <NumberField
            label="IT capacity"
            value={phase.it_capacity_mw}
            min={0.1}
            max={5000}
            step={1}
            unit="MW"
            onChange={(it_capacity_mw) => updatePhase(index, { it_capacity_mw })}
          />
          <label className="field">
            <span>Hardware class</span>
            <select
              value={phase.hardware_profile}
              onChange={(event) => updatePhase(index, {
                hardware_profile: event.target.value as GpuModelName,
              })}
            >
              {metadata.hardware_profiles.map((hardware) => (
                <option key={hardware.id} value={hardware.id}>{hardware.name}</option>
              ))}
            </select>
          </label>
          <PercentField
            label="Starting utilization"
            value={phase.initial_utilization}
            max={95}
            onChange={(initial_utilization) => updatePhase(index, { initial_utilization })}
          />
          <PercentField
            label="Mature utilization"
            value={phase.mature_utilization}
            max={98}
            onChange={(mature_utilization) => updatePhase(index, { mature_utilization })}
          />
          <NumberField
            label="Ramp duration"
            value={phase.ramp_months}
            min={1}
            max={84}
            step={1}
            unit="months"
            onChange={(ramp_months) => updatePhase(index, { ramp_months })}
          />
          <PercentField
            label="Efficiency gain per refresh"
            value={phase.refresh_efficiency_gain}
            max={50}
            onChange={(refresh_efficiency_gain) => (
              updatePhase(index, { refresh_efficiency_gain }, false)
            )}
          />
          {draft.scenario.phases.length > 1 && (
            <button className="forecast-remove" onClick={() => removePhase(index)}>
              Remove phase
            </button>
          )}
        </details>
      ))}
      {draft.scenario.phases.length < 12 && (
        <button className="forecast-add" onClick={addPhase}>+ Add capacity phase</button>
      )}

      <div className="section-label">Workload mix</div>
      <div className={`forecast-total ${workloadValid ? "good" : "warn"}`}>
        Total <b>{(workloadTotal * 100).toFixed(0)}%</b>
      </div>
      {([
        ["training", "Training"],
        ["real_time_inference", "Real-time inference"],
        ["batch_inference", "Batch inference"],
        ["development", "Development"],
      ] as const).map(([key, label]) => (
        <PercentField
          key={key}
          label={label}
          value={draft.scenario.workload_mix[key]}
          onChange={(value) => updateScenario({
            workload_mix: { ...draft.scenario.workload_mix, [key]: value },
          })}
        />
      ))}

      <div className="section-label">Facility and grid</div>
      <NumberField
        label="Design PUE"
        value={draft.scenario.facility.design_pue}
        min={1.02}
        max={2.5}
        step={0.01}
        onChange={(design_pue) => updateScenario({
          facility: { ...draft.scenario.facility, design_pue },
        }, false)}
      />
      <label className="field">
        <span>Cooling</span>
        <select
          value={draft.scenario.facility.cooling}
          onChange={(event) => updateScenario({
            facility: {
              ...draft.scenario.facility,
              cooling: event.target.value as CoolingType,
            },
          }, false)}
        >
          <option value="liquid">Liquid</option>
          <option value="air">Air</option>
        </select>
      </label>
      <PercentField
        label="Annual grid decarbonization"
        value={draft.scenario.grid.annual_decarbonization_rate}
        max={20}
        onChange={(annual_decarbonization_rate) => updateScenario({
          grid: { ...draft.scenario.grid, annual_decarbonization_rate },
        })}
      />

      {draft.baseline && (
        <details className="forecast-advanced">
          <summary>Baseline assumptions</summary>
          <NumberField
            label="Baseline design PUE"
            value={draft.baseline.facility.design_pue}
            min={1.02}
            max={2.5}
            step={0.01}
            onChange={(design_pue) => setDraft({
              ...draft,
              baseline: draft.baseline
                ? {
                  ...draft.baseline,
                  facility: { ...draft.baseline.facility, design_pue },
                }
                : null,
            })}
          />
          <label className="field">
            <span>Baseline cooling</span>
            <select
              value={draft.baseline.facility.cooling}
              onChange={(event) => setDraft({
                ...draft,
                baseline: draft.baseline
                  ? {
                    ...draft.baseline,
                    facility: {
                      ...draft.baseline.facility,
                      cooling: event.target.value as CoolingType,
                    },
                  }
                  : null,
              })}
            >
              <option value="air">Air</option>
              <option value="liquid">Liquid</option>
            </select>
          </label>
        </details>
      )}

      <details className="forecast-advanced">
        <summary>Uncertainty and run controls</summary>
        <PercentField
          label="Utilization uncertainty"
          value={draft.scenario.uncertainty.utilization_relative_sd}
          max={60}
          onChange={(utilization_relative_sd) => updateScenario({
            uncertainty: {
              ...draft.scenario.uncertainty,
              utilization_relative_sd,
            },
          })}
        />
        <NumberField
          label="PUE uncertainty"
          value={draft.scenario.uncertainty.pue_absolute_sd}
          min={0}
          max={0.3}
          step={0.005}
          onChange={(pue_absolute_sd) => updateScenario({
            uncertainty: { ...draft.scenario.uncertainty, pue_absolute_sd },
          })}
        />
        <NumberField
          label="Phase timing uncertainty"
          value={draft.scenario.uncertainty.phase_start_delay_months_sd}
          min={0}
          max={24}
          step={0.5}
          unit="months"
          onChange={(phase_start_delay_months_sd) => updateScenario({
            uncertainty: {
              ...draft.scenario.uncertainty,
              phase_start_delay_months_sd,
            },
          })}
        />
        <NumberField
          label="Monte Carlo paths"
          value={draft.sample_count}
          min={32}
          max={1000}
          step={25}
          onChange={(sample_count) => setDraft({ ...draft, sample_count })}
        />
        <NumberField
          label="Random seed"
          value={draft.seed}
          min={0}
          max={2147483647}
          step={1}
          onChange={(seed) => setDraft({ ...draft, seed })}
        />
      </details>

      {!workloadValid && (
        <p className="forecast-warning">Workload shares must total exactly 100%.</p>
      )}
      {!phasesValid && (
        <p className="forecast-warning">
          Mature utilization cannot be lower than starting utilization.
        </p>
      )}
      <button
        className="primary forecast-run"
        disabled={busy || !workloadValid || !phasesValid}
        onClick={() => void runForecast(draft)}
      >
        {busy ? "Simulating hourly futures…" : `Run ${draft.scenario.horizon_years}-year forecast`}
      </button>
      <p className="hint">Runs are reproducible from the assumptions and seed.</p>

      {result && (
        <div className="forecast-results">
          <div className="forecast-results-head">
            <div>
              <b>Forecast result{resultIsStale ? " · inputs edited" : ""}</b>
              <span>{result.run_id}</span>
            </div>
            <button
              disabled={!completedRequest}
              onClick={() => completedRequest && downloadForecast(completedRequest, result)}
            >
              Export JSON
            </button>
          </div>
          {result.scenario.horizons.map((horizon) => (
            <section className="forecast-horizon" key={horizon.years}>
              <h4>Through year {horizon.years}</h4>
              <div className="forecast-metrics">
                <MetricCard
                  label="facility electricity"
                  values={horizon.cumulative_facility_energy_mwh}
                  format={formatEnergy}
                />
                <MetricCard
                  label="operational carbon"
                  values={horizon.cumulative_operational_carbon_t}
                  format={formatCarbon}
                />
              </div>
              <div className="stack">
                <div className="srow"><span>Installed IT</span><b>{horizon.installed_it_mw.p50.toFixed(1)} MW</b></div>
                <div className="srow"><span>Effective utilization</span><b>{(horizon.average_effective_utilization.p50 * 100).toFixed(1)}%</b></div>
                <div className="srow"><span>Average PUE</span><b>{horizon.average_pue.p50.toFixed(2)}</b></div>
                <div className="srow"><span>Peak facility power</span><b>{horizon.peak_facility_mw.p50.toFixed(1)} MW</b></div>
              </div>
              {result.deltas.find((delta) => delta.years === horizon.years) && (
                <div className="forecast-delta">
                  <span>vs baseline</span>
                  <b>{result.deltas.find((delta) => delta.years === horizon.years)?.facility_energy_pct_p50.toFixed(1)}% energy</b>
                  <b>{result.deltas.find((delta) => delta.years === horizon.years)?.operational_carbon_pct_p50.toFixed(1)}% carbon</b>
                </div>
              )}
            </section>
          ))}

          <h4>Monthly operational carbon · P10–P90</h4>
          <MonthlyCarbonChart periods={result.scenario.periods} />
          <div className="forecast-chart-legend"><i />P50 line <span />uncertainty band</div>

          <h4>What drives full-horizon carbon uncertainty</h4>
          <div className="forecast-drivers">
            {carbonDrivers.map((driver) => (
              <div className="forecast-driver" key={driver.driver}>
                <span>{driver.driver.replace(/_/g, " ")}</span>
                <div><i style={{ width: `${driver.impact_score * 100}%` }} /></div>
                <b>{driver.correlation >= 0 ? "+" : ""}{driver.correlation.toFixed(2)}</b>
              </div>
            ))}
          </div>

          <details className="forecast-provenance">
            <summary>Model provenance and limitations</summary>
            <p>{result.provenance.disclaimer}</p>
            <div className="srow"><span>Model</span><b>{result.provenance.model_version}</b></div>
            <div className="srow"><span>Assumptions</span><b>{result.provenance.assumption_set_version}</b></div>
            <div className="srow"><span>Resolution</span><b>hourly → monthly</b></div>
            {result.provenance.assumptions.map((assumption) => (
              <p className="hint" key={assumption}>• {assumption}</p>
            ))}
          </details>
        </div>
      )}
    </div>
  );
}
