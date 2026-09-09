import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../data/api";
import type { ForecastMetadata, QuantileValues } from "../types/api";
import type { CompletedCoupling, CouplingRequest, CouplingResult, EnergyMetrics } from "../types/energy";
import { draftIssues, EnergyControls } from "./EnergyControls";
import { EnergyCharts } from "./EnergyCharts";
import "./energy.css";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const dollars = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2,
});
const energy = (value: number) => Math.abs(value) >= 1_000_000
  ? `${number.format(value / 1_000_000)} TWh`
  : Math.abs(value) >= 1_000 ? `${number.format(value / 1_000)} GWh` : `${number.format(value)} MWh`;
const carbon = (value: number) => Math.abs(value) >= 1_000
  ? `${number.format(value / 1_000)} ktCO2e` : `${number.format(value)} tCO2e`;
const water = (value: number) => Math.abs(value) >= 1_000_000
  ? `${number.format(value / 1_000_000)} ML` : `${number.format(value)} L`;
const percent = (value: number) => `${number.format(value)}%`;
const power = (value: number) => `${number.format(value)} MW`;

function Metric({
  label, proposed, baseline, format, change, note, testId,
}: {
  label: string;
  proposed: QuantileValues;
  baseline: QuantileValues;
  format: (value: number) => string;
  change?: number | null;
  note?: string;
  testId: string;
}) {
  return (
    <section className="energy-metric" data-testid={testId}>
      <h3>{label}</h3>
      <strong data-value={proposed.p50}>{format(proposed.p50)}</strong>
      <span className="energy-metric-range">P10 {format(proposed.p10)} / P90 {format(proposed.p90)}</span>
      <div className="energy-metric-baseline">Grid-only <b>{format(baseline.p50)}</b></div>
      {change !== undefined && (
        <span className={`energy-delta ${change === null ? "" : change < 0 ? "lower" : change > 0 ? "higher" : ""}`}>
          {change === null ? "No percentage comparison" : `${change > 0 ? "+" : ""}${number.format(change)}% paired change`}
        </span>
      )}
      {note && <p className="energy-help">{note}</p>}
    </section>
  );
}

function ComparisonTable({ result }: { result: CouplingResult }) {
  const rows: { key: Exclude<keyof EnergyMetrics, "hydro_water_consumption_l">; label: string; format: (value: number) => string }[] = [
    { key: "required_energy_mwh", label: "Required facility electricity", format: energy },
    { key: "served_energy_mwh", label: "Electricity actually served", format: energy },
    { key: "solar_generation_mwh", label: "Solar generation", format: energy },
    { key: "wind_generation_mwh", label: "Wind generation", format: energy },
    { key: "hydro_generation_mwh", label: "Hydro generation", format: energy },
    { key: "nuclear_generation_mwh", label: "Nuclear generation", format: energy },
    { key: "gas_generation_mwh", label: "Gas generation", format: energy },
    { key: "battery_charge_mwh", label: "Battery charging", format: energy },
    { key: "battery_discharge_mwh", label: "Battery delivered", format: energy },
    { key: "battery_losses_mwh", label: "Storage losses", format: energy },
    { key: "grid_export_mwh", label: "Grid exports", format: energy },
    { key: "curtailed_mwh", label: "Curtailed availability", format: energy },
    { key: "unserved_energy_mwh", label: "Unserved electricity", format: energy },
    { key: "shortfall_hours", label: "Hours with shortfall", format: (value) => number.format(value) },
    { key: "requested_compute_mwh_equivalent", label: "Requested work proxy (MW-hours equivalent)", format: (value) => number.format(value) },
    { key: "shifted_compute_mwh_equivalent", label: "Shifted work proxy (MW-hours equivalent)", format: (value) => number.format(value) },
  ];
  return (
    <details className="energy-card energy-comparison-ledger">
      <summary>Full-horizon energy and work ledger <span>P50 values</span></summary>
      <div className="energy-table-scroll">
        <table>
          <caption className="energy-sr-only">Proposed versus grid-only scenario, median totals</caption>
          <thead><tr><th scope="col">Metric</th><th scope="col">Proposed</th><th scope="col">Grid-only</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.key}><th scope="row">{row.label}</th>
              <td>{row.format(result.proposed.summary[row.key].p50)}</td>
              <td>{row.format(result.baseline.summary[row.key].p50)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="energy-help">Component medians do not necessarily add to a median total.
        Final stored energy: {energy(result.proposed.final_battery_energy_mwh.p50)}. This is not counted as electricity delivered.</p>
    </details>
  );
}

export function EnergyResults({ completed, stale, onEdit, showHourlyChart = true }: {
  completed: CompletedCoupling;
  stale: boolean;
  onEdit?: () => void;
  showHourlyChart?: boolean;
}) {
  const { result, request } = completed;
  const proposed = result.proposed.summary;
  const baseline = result.baseline.summary;
  const comparison = result.comparison;
  const download = () => {
    const blob = new Blob([JSON.stringify(completed, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.run_id}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="coupling-results" data-run-id={result.run_id}>
      <div className="energy-results-heading">
        <div>
          <span className="energy-kicker">Paired synthetic outcomes</span>
          <h2>{request.demand.name}</h2>
          <p>{request.demand.horizon_years} year{request.demand.horizon_years > 1 ? "s" : ""} /
            {" "}{result.sample_count} paths / {request.weather_case} / {result.run_id}</p>
        </div>
        <div className="energy-result-actions">
          {onEdit
            ? <button type="button" className="energy-secondary" onClick={onEdit}>Edit assumptions</button>
            : <a className="energy-secondary" href="#energy-assumptions">Edit assumptions</a>}
          <button type="button" className="energy-secondary" onClick={download} data-testid="export-coupling">Export this run</button>
        </div>
      </div>
      {stale && <div className="coupling-stale energy-notice" role="status">
        <b>Inputs have changed.</b> These results still describe the completed run above. Run the comparison again to apply your edits.
      </div>}
      <div className={comparison.comparable ? "energy-feasibility" : "coupling-shortfall energy-notice danger"}
        role={comparison.comparable ? "status" : "alert"} data-testid="comparison-status">
        <b>{comparison.comparable ? "Modeled demand is served in both cases." : "Supply shortfall: not an equivalent-service comparison."}</b>
        <span>{comparison.explanation}</span>
      </div>
      <div className="energy-metrics-grid">
        <Metric label="Dedicated renewable coverage" proposed={proposed.renewable_match_pct}
          baseline={baseline.renewable_match_pct} format={percent} testId="metric-renewable"
          note="Delivered to load, including renewable-origin storage. Excludes embedded grid renewables and nuclear." />
        <Metric label="Grid electricity" proposed={proposed.grid_import_mwh}
          baseline={baseline.grid_import_mwh} format={energy} change={comparison.grid_import_change_pct_p50}
          testId="metric-grid" note="Same physical import limit in both portfolios." />
        <Metric label="Operational carbon" proposed={proposed.operational_carbon_t}
          baseline={baseline.operational_carbon_t} format={carbon} change={comparison.carbon_change_pct_p50}
          testId="metric-carbon" note="Scenario accounting. No export offsets or lifecycle claim." />
        <Metric label="Peak grid import" proposed={proposed.peak_grid_import_mw}
          baseline={baseline.peak_grid_import_mw} format={power} change={comparison.peak_grid_change_pct_p50}
          testId="metric-peak" note="A modeled peak, not a reliability guarantee or utility-bill forecast." />
      </div>

      {showHourlyChart && <EnergyCharts result={result} key={result.run_id} />}

      <div className="energy-impact-grid">
        <section className="energy-card energy-water-card">
          <span className="energy-kicker">Separate water boundaries</span>
          <h2>Cooling water is not hydropower</h2>
          <p className="energy-help">{request.demand.facility.cooling} internal cooling / {request.cooling_water.heat_rejection} heat rejection.
            Required water for the full modeled workload; unmet load does not become water savings.</p>
          <dl className="energy-water-values">
            <div><dt>Cooling consumption</dt><dd data-testid="water-consumption" data-value={proposed.cooling_water_consumption_l.p50}>
              {water(proposed.cooling_water_consumption_l.p50)}<small>Grid-only {water(baseline.cooling_water_consumption_l.p50)}</small>
            </dd></div>
            <div><dt>Cooling withdrawal</dt><dd>{water(proposed.cooling_water_withdrawal_l.p50)}
              <small>Grid-only {water(baseline.cooling_water_withdrawal_l.p50)}</small></dd></div>
            <div><dt>Hydro net consumption</dt><dd data-testid="hydro-water-result">
              {proposed.hydro_water_consumption_l === null ? "Not estimated" : water(proposed.hydro_water_consumption_l.p50)}
              <small>Turbine flow is not consumption</small>
            </dd></div>
          </dl>
          <p className="energy-water-boundary">No combined water-footprint claim. Other generation, domestic use, and watershed effects are outside this model.</p>
        </section>
        <section className="energy-card">
          <span className="energy-kicker">Costs & service</span>
          <h2>Make the trade-offs visible</h2>
          <Metric label="Variable energy cost" proposed={proposed.variable_energy_cost_usd}
            baseline={baseline.variable_energy_cost_usd} format={(value) => dollars.format(value)}
            change={comparison.variable_cost_change_pct_p50} testId="metric-cost"
            note="Illustrative energy tariffs and operating costs only. Excludes capex, demand charges, water tariffs, and financing." />
          <div className="energy-service-row">
            <span>Proposed unserved energy</span>
            <b data-testid="unserved-energy" data-value={proposed.unserved_energy_mwh.p50}>{energy(proposed.unserved_energy_mwh.p50)}</b>
          </div>
          <div className="energy-service-row"><span>P90 shortfall hours</span><b>{number.format(proposed.shortfall_hours.p90)}</b></div>
          <p className="energy-help">The shortfall banner examines every sampled path, including failures beyond P90.</p>
        </section>
      </div>

      <section className="energy-card">
        <div className="energy-card-heading"><div><span className="energy-kicker">Across the buildout</span><h2>Monthly scenario profile</h2></div>
          <span className="energy-table-note">Proposed P50 values</span></div>
        <div className="energy-table-scroll">
          <table>
            <caption className="energy-sr-only">Monthly proposed portfolio outcomes</caption>
            <thead><tr><th scope="col">Month</th><th scope="col">Required</th><th scope="col">Renewable</th>
              <th scope="col">Grid import</th><th scope="col">Carbon</th><th scope="col">Unserved</th></tr></thead>
            <tbody>{result.proposed.periods.map((period) => <tr key={period.period}>
              <th scope="row">{period.period}</th>
              <td>{energy(period.metrics.required_energy_mwh.p50)}</td>
              <td>{percent(period.metrics.renewable_match_pct.p50)}</td>
              <td>{energy(period.metrics.grid_import_mwh.p50)}</td>
              <td>{carbon(period.metrics.operational_carbon_t.p50)}</td>
              <td>{energy(period.metrics.unserved_energy_mwh.p50)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <ComparisonTable result={result} />
      <section className="energy-card energy-boundaries">
        <h2>What this run does and does not establish</h2>
        {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        <details className="energy-advanced">
          <summary>Model assumptions and provenance</summary>
          <p>Coupling v{result.provenance.coupling_version} / demand model v{result.provenance.demand_model_version} / seed {result.seed}</p>
          <ul>{result.provenance.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        </details>
      </section>
    </div>
  );
}

export function EnergyApp() {
  const [draft, setDraft] = useState<CouplingRequest | null>(null);
  const [initial, setInitial] = useState<CouplingRequest | null>(null);
  const [metadata, setMetadata] = useState<ForecastMetadata | null>(null);
  const [completed, setCompleted] = useState<CompletedCoupling | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const runController = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const output = useRef<HTMLElement>(null);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([api.couplingExample(controller.signal), api.forecastMetadata(controller.signal)])
      .then(([example, options]) => {
        if (controller.signal.aborted) return;
        setInitial(example);
        setDraft(structuredClone(example));
        setMetadata(options);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(`Could not load the energy workspace. ${reason instanceof Error ? reason.message : String(reason)}`);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); runController.current?.abort(); };
  }, [attempt]);

  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (completed) output.current?.scrollIntoView({ block: "start" });
  }, [completed]);

  const issues = draft ? draftIssues(draft) : [];
  const stale = Boolean(draft && completed && JSON.stringify(draft) !== JSON.stringify(completed.request));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || runController.current) return;
    const invalid = form.current?.querySelector(":invalid");
    for (let parent = invalid?.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    if (issues.length || !form.current?.reportValidity()) {
      setError("Correct the highlighted assumptions before running.");
      return;
    }
    const controller = new AbortController();
    const request = structuredClone(draft);
    runController.current = controller;
    setBusy(true);
    setError("");
    try {
      const result = await api.couplingEvaluate(request, controller.signal);
      if (!controller.signal.aborted) setCompleted({ request, result });
    } catch (reason: unknown) {
      if (!controller.signal.aborted) {
        setError(`Comparison could not complete. ${reason instanceof Error ? reason.message : String(reason)}`);
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      if (runController.current === controller) runController.current = null;
    }
  };

  return (
    <div className="coupling-app">
      <header className="energy-header">
        <a className="energy-brand" href={base} aria-label="Clean Compute Engine home">
          <span className="energy-mark" aria-hidden="true"><i /></span>
          <span><b>THE CLEAN COMPUTE ENGINE</b><small>Independent research / not an official product</small></span>
        </a>
        <nav aria-label="Project experiences">
          <a href={base}>Full engine</a><a href={`${base}story`}>Voxel story</a>
          <span aria-current="page">Energy system</span>
        </nav>
      </header>
      <div className="energy-page">
        <section className="energy-hero">
          <div><span className="energy-kicker">R0 synthetic / physical energy coupling</span>
            <h1>Plan how the compute is powered.</h1>
            <p>Compare generation, storage, and flexible work against the same demand on the grid.
              See the hourly match, the shortfalls, and the environmental trade-offs.</p></div>
          <div className="energy-status-pill"><i />R0 / SYNTHETIC<span>Scenario evaluator, not an optimizer</span></div>
        </section>
        <div className="energy-runbar">
          <span>Local preview <b>No private data or publication</b></span>
          <div>
            <button type="button" className="energy-secondary" disabled={!initial || busy}
              onClick={() => { if (initial) { setDraft(structuredClone(initial)); setError(""); } }}>
              Reset example
            </button>
            <button className="energy-primary" form="coupling-inputs" type="submit" data-testid="run-coupling"
              disabled={loading || !draft || busy || issues.length > 0}>
              {busy ? `Simulating hourly paths... ${elapsed}s` : "Run comparison"}
            </button>
          </div>
        </div>
        {loading && <p className="energy-loading" role="status">Loading the synthetic scenario...</p>}
        {error && <div className="energy-notice danger energy-error" role="alert">
          <b>{error}</b>
          {!draft && <><p>Start the local FastAPI backend, then retry. The public Pages site does not host this API.</p>
            <button className="energy-secondary" onClick={() => setAttempt((value) => value + 1)}>Retry connection</button></>}
        </div>}
        {draft && metadata && (
          <div className="energy-workspace">
            <aside className="energy-sidebar" id="energy-assumptions" aria-label="Scenario assumptions">
              <div className="energy-sidebar-heading"><h2>Design assumptions</h2><span>Editable, synthetic inputs</span></div>
              <form id="coupling-inputs" ref={form} noValidate onSubmit={(event) => void submit(event)}>
                <EnergyControls request={draft} metadata={metadata} onChange={setDraft} disabled={busy} />
              </form>
              {issues.length > 0 && <div className="energy-notice" role="alert">
                <b>Before running</b><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
              </div>}
            </aside>
            <main className="energy-output" ref={output} aria-busy={busy}>
              {busy && <p className="energy-running" role="status">
                Evaluating both portfolios on the same hourly demand paths. Longer horizons take more time.
              </p>}
              {completed ? <EnergyResults completed={completed} stale={stale} /> : (
                <section className="energy-empty energy-card">
                  <span className="energy-kicker">One workload. Two ways to power it.</span>
                  <h2>Your energy system, hour by hour.</h2>
                  <p>Start with the example, or change the assumptions in the design panel.
                    Run the comparison to see actual model outputs here.</p>
                  <div className="energy-empty-flow">
                    <div><b>01</b><h3>Demand</h3><p>Buildout, computing work, cooling, and weather.</p></div>
                    <div><b>02</b><h3>Physical supply</h3><p>Renewables, firm sources, storage, and grid limits.</p></div>
                    <div><b>03</b><h3>Consequences</h3><p>Hourly matching, carbon, water, cost, and unmet load.</p></div>
                  </div>
                  <div className="energy-empty-boundary">
                    <strong>No comparison has been run yet.</strong>
                    <span>Every result will be labeled synthetic. Supply shortages will never be presented as carbon savings.</span>
                  </div>
                </section>
              )}
            </main>
          </div>
        )}
        <footer className="energy-footer">Synthetic physical-portfolio research. No calibrated site forecasts, optimality claims, or investment recommendations.</footer>
      </div>
    </div>
  );
}
