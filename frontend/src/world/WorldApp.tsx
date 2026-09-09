import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { EnergyControls } from "../energy/EnergyControls";
import { EnergyCharts } from "../energy/EnergyCharts";
import { EnergyResults } from "../energy/EnergyApp";
import { CampusWorld } from "./CampusWorld";
import { WorldInspector } from "./WorldInspector";
import { ASSETS, TABS, asset, assetCapacity, assetState, baselineFrame, fmt, generation, liters, mw } from "./model";
import type { AssetId, WorldTab } from "./model";
import { useWorldModel } from "./useWorldModel";
import "./world.css";

const DESIGN_TARGET: Record<AssetId, string> = {
  campus: '[data-testid="horizon-years"]', compute: '[data-testid="phase-capacity-0"]',
  cooling: '[data-testid="heat-rejection"]', solar: '[data-testid="solar-mw"]',
  wind: '[data-testid="wind-mw"]', hydro: '[data-testid="hydro-mw"]',
  nuclear: '[data-testid="nuclear-mw"]', gas: '[data-testid="gas-mw"]',
  battery: '[data-testid="battery-energy-mwh"]', grid: '[data-testid="unlimited-grid"]',
};

export function WorldApp() {
  const model = useWorldModel();
  const [analysis, setAnalysis] = useState<"hourly" | "totals" | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const scene = useRef<HTMLElement>(null);
  const tabButtons = useRef<Partial<Record<WorldTab, HTMLButtonElement | null>>>({});
  const { request, draft, hour, completed, tab, selection, busy, dirty, loading } = model;

  const navigate = (next: WorldTab) => { setAnalysis(null); model.chooseTab(next); };
  const selectAsset = (id: AssetId) => { setAnalysis(null); model.selectAsset(id); };
  const edit = () => navigate("design");
  useEffect(() => {
    if (tab !== "design") { if (inspector.current) inspector.current.scrollTop = 0; return; }
    const target = form.current?.querySelector<HTMLInputElement | HTMLSelectElement>(DESIGN_TARGET[selection]);
    if (target) {
      for (let parent = target.parentElement; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
      }
      target.scrollIntoView({ block: "center" });
    }
  }, [tab, selection]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = form.current?.querySelector(":invalid");
    for (let parent = invalid?.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    if (!draft || model.issues.length || !form.current?.reportValidity()) return;
    void model.run(draft);
  };

  const chartResult = useMemo(() => {
    if (!completed || !model.baseline) return completed?.result ?? null;
    return {
      ...completed.result,
      hourly_trace: completed.result.hourly_trace.map(baselineFrame),
      provenance: { ...completed.result.provenance, trace_label: `Grid-only baseline, paired with ${completed.result.provenance.trace_label}` },
    };
  }, [completed, model.baseline]);
  const dateLabel = hour ? `${hour.timestamp.slice(0, 10)} ${hour.timestamp.slice(11, 13)}:00` : "Draft / awaiting run";
  const showAnalysis = (mode: "hourly" | "totals") => { setAnalysis(mode); model.setPlaying(false); };
  const validHour = Boolean(hour && !busy && !dirty);
  const selectedReadout = !hour ? "Draft design" : selection === "cooling"
    ? liters(hour.cooling_water_consumption_l)
    : tab === "water" && selection === "hydro"
      ? hour.hydro_water_consumption_l === null ? "Water not estimated" : liters(hour.hydro_water_consumption_l)
      : selection === "battery" ? `${fmt(hour.battery_state_mwh, 2)} MWh stored`
        : mw(Math.abs(generation(selection, hour)));

  return (
    <div className="world-app coupling-app" data-testid="world-app" data-tab={tab}
      data-run-id={completed?.result.run_id ?? ""} data-hour-index={model.hourIndex}
      data-case={model.baseline ? "baseline" : "proposed"}
      onKeyDown={(event) => {
        const editing = event.target instanceof HTMLElement
          && ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName);
        if (event.key === "Escape" && !editing) {
          if (analysis) setAnalysis(null);
          else { navigate("overview"); model.focus("campus"); }
        }
      }}>
      <header className="world-header">
        <div className="world-brand">
          <span className="energy-mark" aria-hidden="true"><i /></span>
          <div><strong>The Clean Compute Engine</strong><small>Independent research / R0 synthetic</small></div>
        </div>
        <div className="world-scenario-heading">
          <b>{draft?.demand.name ?? "Loading campus"}</b>
          <span>{model.metadata?.locations.find((item) => item.id === draft?.demand.location)?.name}
            {draft && ` / ${draft.demand.horizon_years}-year scenario`}</span>
        </div>
        <div className="world-header-actions">
          <button className="world-action" onClick={() => showAnalysis("totals")} disabled={!completed}>Run totals</button>
          <a className="world-action" href={`${import.meta.env.BASE_URL}story`}>Story</a>
          <button className="world-run" data-testid="run-coupling" type="submit" form="world-design-form"
            disabled={!draft || busy || loading || model.issues.length > 0}>
            {busy ? "Simulating..." : dirty ? "Apply & run" : "Run scenario"}
          </button>
        </div>
      </header>
      <div className="world-navigation">
        <div className="world-tabs" role="tablist" aria-label="Campus views"
          onKeyDown={(event) => {
            const current = TABS.findIndex((item) => item.id === tab);
            const index = event.key === "ArrowRight" ? (current + 1) % TABS.length
              : event.key === "ArrowLeft" ? (current + TABS.length - 1) % TABS.length
                : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : null;
            if (index !== null) { event.preventDefault(); navigate(TABS[index].id); tabButtons.current[TABS[index].id]?.focus(); }
          }}>
          {TABS.map((item) => (
            <button key={item.id} role="tab" id={`world-tab-${item.id}`} aria-controls="world-tab-panel"
              aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1}
              ref={(element) => { tabButtons.current[item.id] = element; }}
              data-testid={`tab-${item.id}`} onClick={() => navigate(item.id)}>{item.label}</button>
          ))}
        </div>
        <span className={`world-case-badge ${model.baseline ? "baseline" : ""}`}>
          {dirty ? "UNAPPLIED DRAFT" : model.baseline ? "VIEWING GRID-ONLY BASELINE" : "VIEWING PROPOSED PORTFOLIO"}
        </span>
      </div>

      <div className="world-kpis" aria-label="Selected-hour metrics">
        <button onClick={() => selectAsset("compute")}><span>Facility demand</span>
          <b data-testid="world-demand" data-value={hour?.required_load_mw}>{hour ? mw(hour.required_load_mw) : "Run design"}</b></button>
        <button onClick={() => navigate("energy")}><span>Dedicated renewable coverage</span>
          <b>{!hour ? "Run design" : hour.required_load_mw > 0
            ? `${fmt(hour.renewable_to_load_mw / hour.required_load_mw * 100)}%` : "No demand"}</b></button>
        <button onClick={() => selectAsset("grid")}><span>Grid import</span>
          <b data-testid="world-grid" data-value={hour?.grid_to_load_mw}>{hour ? mw(hour.grid_to_load_mw) : "Run design"}</b></button>
        <button onClick={() => navigate("compare")}><span>Operational carbon</span>
          <b>{hour ? `${fmt(hour.operational_carbon_t, 2)} tCO2e/h` : "Run design"}</b></button>
        <button onClick={() => selectAsset("cooling")}><span>Cooling consumption required</span>
          <b data-testid="world-water" data-value={hour?.cooling_water_consumption_l}>{hour ? liters(hour.cooling_water_consumption_l) : "Run design"}</b></button>
      </div>

      <div className="world-body" id="world-tab-panel" role="tabpanel" aria-labelledby={`world-tab-${tab}`}>
        <aside className="world-assets" aria-label="Campus systems">
          <div className="world-assets-heading"><b>Campus systems</b><span>Select here or in the world</span></div>
          {(["Campus", "Supply", "Connections"] as const).map((group) => (
            <section key={group}><h3>{group}</h3>
              {ASSETS.filter((item) => item.group === group).map((item) => {
                const capacity = request ? item.id === "compute" && hour
                  ? hour.installed_it_mw : assetCapacity(request, item.id) : 0;
                return <button key={item.id} className={item.id === selection ? "selected" : ""}
                  data-testid={`asset-list-${item.id}`} onClick={() => selectAsset(item.id)}>
                  <i style={{ background: item.color }} />
                  <span><b>{item.name}</b><small>{request ? assetState(request, hour, item.id) : "Loading"}</small></span>
                  <em>{item.id === "cooling" ? "" : item.id === "campus" ? "" : !Number.isFinite(capacity) ? "No cap"
                    : `${fmt(capacity)} ${item.id === "battery" ? "MWh" : "MW"}`}</em>
                </button>;
              })}
            </section>
          ))}
          <p className="world-help">One scenario and clock across every tab. Source colors match the hourly chart.</p>
        </aside>

        <main className="world-viewport" ref={scene}>
          {request ? <CampusWorld request={request} hour={hour} tab={tab} selection={selection}
            camera={model.camera} onSelect={selectAsset} /> : <div className="loading">Loading the synthetic campus...</div>}
          <div className="world-scene-toolbar">
            <span>Campus / {asset(selection).name}</span>
            <button onClick={() => model.focus("campus")}>Fit system</button>
            <button data-testid="open-hourly-chart" onClick={() => showAnalysis("hourly")} disabled={!validHour}>Hourly chart</button>
          </div>
          <div className={`world-scene-status ${dirty ? "draft" : ""}`}>
            {dirty ? <><b>Draft design preview</b><span>Calculated flows are hidden until you apply the edits.</span>
              <button onClick={model.discard}>Discard edits</button></>
              : busy ? <><b>Computing shared hourly paths</b><span>The previous completed frame stays in place until ready.</span></>
                : <><b>{dateLabel}</b><span>{completed ? `Paired simulated path ${completed.result.provenance.trace_path_index + 1}; not a P50 hour` : "Synthetic assumptions / awaiting calculation"}</span></>}
          </div>
          {model.error && <div className="world-error" role="alert"><b>Scenario could not complete</b><p>{model.error}</p>
            {!draft && <button onClick={() => window.location.reload()}>Retry connection</button>}</div>}
          {hour && hour.unserved_mw > .000001 && <div className="world-shortfall" role="alert" data-testid="world-shortfall">
            <b>{mw(hour.unserved_mw)} unserved at this hour</b><span>Shortfall is not a carbon saving.</span>
          </div>}
          <div className="world-scene-note">
            <button className="world-mobile-details" onClick={() => inspector.current?.scrollIntoView({ block: "start" })}>
              {asset(selection).name} / {selectedReadout}
              {" / View details"}
            </button>
            {tab === "water" ? "Dashed cyan: cooling-water requirement (L/h). Hydro consumption is separate."
              : tab === "compute" ? "Cutaway schematic / aggregate IT model, not per-GPU predictions."
                : "Solid arrows: physical electricity (MW). Zero-output sources remain visible."}
            <span>Illustrative layout, not geographic or engineering site design.</span>
          </div>
        </main>

        <aside className={`world-inspector ${tab === "design" ? "design" : ""}`} ref={inspector} aria-label="Selected system details">
          {tab === "design" && draft && model.metadata ? <div>
            <div className="world-design-title"><span className="energy-kicker">Editing proposed design</span>
              <h2>{asset(selection).name}</h2><p>Select a system to jump to its assumptions. Apply once to update the whole world.</p></div>
            {model.issues.length > 0 && <div className="world-notice danger" role="alert">{model.issues.map((issue) => <p key={issue}>{issue}</p>)}</div>}
            <form id="world-design-form" ref={form} noValidate onSubmit={submit}>
              <EnergyControls request={draft} metadata={model.metadata} onChange={model.updateDraft} disabled={busy} />
            </form>
          </div> : <>
            <form id="world-design-form" noValidate onSubmit={(event) => {
              event.preventDefault();
              if (draft && !model.issues.length) void model.run(draft);
            }} />
            <WorldInspector model={model} onEdit={edit} onAnalysis={showAnalysis}
              onFocus={() => { model.focus(selection); scene.current?.scrollIntoView({ block: "center" }); }} />
          </>}
        </aside>
      </div>

      <footer className="world-timeline" aria-label="Shared scenario clock">
        <div className="world-clock">
          <b data-testid="world-clock">{dateLabel}</b>
          <span>{model.baseline ? "Grid-only baseline" : "Proposed"} / synthetic site clock</span>
        </div>
        <button className="world-play" data-testid="world-play" disabled={!validHour}
          aria-label={model.playing ? "Pause simulation clock" : "Play simulation clock"}
          onClick={() => model.setPlaying(!model.playing)}>{model.playing ? "Pause" : "Play"}</button>
        <div className="world-hour-control">
          <label><span>Selected hour across the sampled week</span>
            <input type="range" min={0} max={Math.max(0, (completed?.result.hourly_trace.length ?? 1) - 1)}
              step={1} value={model.hourIndex} disabled={!validHour} data-testid="world-hour"
              onChange={(event) => model.selectHour(event.currentTarget.valueAsNumber)} />
          </label>
          <span>{completed?.result.hourly_trace[0]?.timestamp.slice(0, 10)}</span>
          <span>{completed?.result.hourly_trace[completed.result.hourly_trace.length - 1]?.timestamp.slice(0, 10)}</span>
        </div>
        <label className="world-month"><span>Sampled month</span>
          <select disabled={!validHour} value={completed?.request.trace_month ?? 7} data-testid="world-month"
            onChange={(event) => model.changeMonth(Number(event.currentTarget.value))}>
            {(completed?.result.proposed.periods ?? []).map((period, index) => (
              <option key={period.period} value={index + 1}>{period.period}</option>
            ))}
          </select>
        </label>
      </footer>

      {analysis && completed && chartResult && <section className="world-analysis" aria-label="Expanded analysis">
        <header><div><button aria-pressed={analysis === "hourly"} onClick={() => setAnalysis("hourly")}>Hourly chart</button>
          <button aria-pressed={analysis === "totals"} onClick={() => setAnalysis("totals")}>Run totals</button></div>
          <span>{analysis === "hourly" ? `${model.baseline ? "Grid-only" : "Proposed"} / linked to the world clock` : "Both portfolios / full-horizon results"}</span>
          <button onClick={() => setAnalysis(null)} data-testid="close-analysis" aria-label="Close expanded analysis">Close</button>
        </header>
        <div className="world-analysis-body">
          {analysis === "hourly" ? <EnergyCharts result={chartResult} selectedHour={model.hourIndex} onSelectHour={model.selectHour} />
            : <EnergyResults completed={completed} stale={dirty} showHourlyChart={false} onEdit={edit} />}
        </div>
      </section>}
    </div>
  );
}
