import type { ReactNode } from "react";
import { ASSETS, asset, assetCapacity, assetState, directDelivery, fmt, generation, liters, mw } from "./model";
import type { AssetId } from "./model";
import type { useWorldModel } from "./useWorldModel";

type Model = ReturnType<typeof useWorldModel>;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="world-detail-row"><span>{label}</span><b>{children}</b></div>;
}

function SourceBalance({ model }: { model: Model }) {
  const { hour } = model;
  if (!hour) return null;
  const sources: { id: AssetId; value: number }[] = [
    { id: "solar", value: hour.solar_to_load_mw }, { id: "wind", value: hour.wind_to_load_mw },
    { id: "hydro", value: hour.hydro_to_load_mw }, { id: "nuclear", value: hour.nuclear_to_load_mw },
    { id: "battery", value: hour.battery_to_load_mw }, { id: "gas", value: hour.gas_to_load_mw },
    { id: "grid", value: hour.grid_to_load_mw },
  ];
  return (
    <section className="world-inspector-section">
      <h3>Serving the facility this hour</h3>
      {sources.filter((source) => source.value > .000001).map((source) => (
        <button className="world-source-row" key={source.id} onClick={() => model.selectAsset(source.id)}>
          <span><i style={{ background: asset(source.id).color }} />{asset(source.id).name}</span>
          <b>{mw(source.value)}</b>
        </button>
      ))}
      <Row label="Required">{mw(hour.required_load_mw)}</Row>
      <Row label="Unserved"><span className={hour.unserved_mw > .000001 ? "world-danger" : ""}>{mw(hour.unserved_mw)}</span></Row>
      <p className="world-help">This delivery mix excludes charging and exports. Click any source to inspect it in the world.</p>
    </section>
  );
}

export function WorldInspector({ model, onEdit, onAnalysis, onFocus }: {
  model: Model; onEdit: () => void; onAnalysis: (mode: "hourly" | "totals") => void;
  onFocus?: () => void;
}) {
  const { request, hour, selection, tab, completed, baseline } = model;
  if (!request) return null;
  const selected = asset(selection);
  const capacity = assetCapacity(request, selection);
  return (
    <div className="world-inspector-content" data-testid="world-inspector" data-asset={selection}>
      <div className="world-inspector-title">
        <span className="energy-kicker">{tab} / {baseline ? "grid-only" : "proposed"}</span>
        <h2 style={{ borderColor: selected.color }}>{selected.name}</h2>
        <span className="world-state">{assetState(request, hour, selection)}</span>
      </div>
      <div className="world-context-actions">
        <button onClick={onEdit} data-testid="edit-selected">Edit this system</button>
        <button onClick={onFocus ?? (() => model.focus(selection))}>Focus in 3D</button>
      </div>
      {!hour && <p className="world-notice">This is a planned design. Apply it before viewing calculated flows and impacts.</p>}

      {tab === "compare" && completed && (
        <section className="world-inspector-section">
          <h3>Same work. Same selected hour.</h3>
          <div className="world-case-toggle">
            <button aria-pressed={!baseline} onClick={() => model.setBaseline(false)} data-testid="view-proposed">Proposed</button>
            <button aria-pressed={baseline} onClick={() => model.setBaseline(true)} data-testid="view-baseline">Grid-only</button>
          </div>
          <p className="world-help">The world, hourly metrics, and chart switch together. Asset selection and time stay in place.</p>
          <div className={completed.result.comparison.comparable ? "world-notice good" : "world-notice danger"}>
            {completed.result.comparison.explanation}
          </div>
          <h3>Full-horizon median totals</h3>
          <div className="world-comparison-head"><span>Metric</span><b>Proposed / grid-only</b></div>
          <Row label="Grid electricity">{fmt(completed.result.proposed.summary.grid_import_mwh.p50 / 1000)} /
            {" "}{fmt(completed.result.baseline.summary.grid_import_mwh.p50 / 1000)} GWh</Row>
          <Row label="Operational carbon">{fmt(completed.result.proposed.summary.operational_carbon_t.p50 / 1000)} /
            {" "}{fmt(completed.result.baseline.summary.operational_carbon_t.p50 / 1000)} ktCO2e</Row>
          <Row label="Cooling consumption">{fmt(completed.result.proposed.summary.cooling_water_consumption_l.p50 / 1e6)} /
            {" "}{fmt(completed.result.baseline.summary.cooling_water_consumption_l.p50 / 1e6)} ML</Row>
          <button className="world-wide-button" onClick={() => onAnalysis("totals")}>Open the paired result ledger</button>
        </section>
      )}

      {(selection === "campus" || (tab === "overview" && selection !== "compute")) && hour && <>
        <section className="world-inspector-section">
          <h3>Selected-hour system state</h3>
          <Row label="Installed IT">{mw(hour.installed_it_mw)}</Row>
          <Row label="IT power requirement">{mw(hour.it_power_mw)}</Row>
          <Row label="Facility requirement">{mw(hour.required_load_mw)}</Row>
          <Row label="Dynamic PUE">{hour.it_power_mw > 0 ? fmt(hour.required_load_mw / hour.it_power_mw, 2) : "Not operating"}</Row>
          <Row label="Cooling consumption">{liters(hour.cooling_water_consumption_l)}</Row>
          <Row label="Ambient">{fmt(hour.ambient_c)} C</Row>
        </section>
        <SourceBalance model={model} />
      </>}

      {(selection === "cooling" || tab === "water") && (
        <section className="world-inspector-section">
          <h3>{selection === "hydro" ? "Hydro water boundary" : "Cooling-water requirements"}</h3>
          {selection === "hydro" ? <>
            <Row label="Net hydro consumption">{!hour ? "Run design" : hour.hydro_water_consumption_l === null ? "Not estimated" : liters(hour.hydro_water_consumption_l)}</Row>
            <Row label="Hydro operation">{request.supply.hydro_mode}</Row>
            <p className="world-help">Turbine flow is not consumed water. A reservoir volume, environmental flow, and full watershed impact are not modeled.</p>
          </> : <>
            <Row label="Internal cooling">{request.demand.facility.cooling}</Row>
            <Row label="External heat rejection">{request.cooling_water.heat_rejection}</Row>
            <Row label="Withdrawal">{hour ? liters(hour.cooling_water_withdrawal_l) : "Run design"}</Row>
            <Row label="Consumption">{hour ? liters(hour.cooling_water_consumption_l) : "Run design"}</Row>
            <Row label="Hydro net consumption">{!hour ? "Run design" : hour.hydro_water_consumption_l === null ? "Not estimated" : liters(hour.hydro_water_consumption_l)}</Row>
            <button className="world-wide-button" onClick={() => model.selectAsset("hydro")}>Inspect the separate hydro boundary</button>
          </>}
          <p className="world-notice">These are requirements for the full requested workload, not measured consumption. Heat rejection does not automatically change design PUE.</p>
        </section>
      )}

      {selection === "compute" && (
        <section className="world-inspector-section">
          <h3>Facility-level compute model</h3>
          <Row label="Installed IT">{hour ? mw(hour.installed_it_mw) : `${mw(capacity)} planned`}</Row>
          <Row label="Effective utilization">{hour ? `${fmt(hour.effective_utilization * 100)}%` : "Run design"}</Row>
          <Row label="IT power requirement">{hour ? mw(hour.it_power_mw) : "Run design"}</Row>
          <Row label="Facility overhead">{hour ? mw(hour.required_load_mw - hour.it_power_mw) : "Run design"}</Row>
          <h3>Planned capacity phases</h3>
          {request.demand.phases.map((phase, index) => (
            <div className="world-phase-summary" key={index}><b>{phase.name} / {phase.it_capacity_mw} MW</b>
              <span>{phase.start_date} / {phase.hardware_profile}</span>
              <small>Utilization ramp {fmt(phase.initial_utilization * 100)}% to {fmt(phase.mature_utilization * 100)}%</small>
            </div>
          ))}
          <p className="world-notice">Rack geometry is schematic, not a counted hardware layout. The coupled model does not estimate per-GPU telemetry.</p>
          <a className="world-legacy-link" href={`${import.meta.env.BASE_URL}legacy`}>Open the separate legacy equipment sandbox</a>
        </section>
      )}

      {["solar", "wind", "hydro", "nuclear", "gas"].includes(selection) && tab !== "water" && (
        <section className="world-inspector-section">
          <h3>Source power</h3>
          <Row label="Configured capacity">{mw(capacity)}</Row>
          <Row label="Generated">{hour ? mw(generation(selection, hour)) : "Run design"}</Row>
          <Row label="Directly to facility">{hour ? mw(directDelivery(selection, hour)) : "Run design"}</Row>
          {hour && <Row label="To charging / export">{mw(Math.max(0, generation(selection, hour) - directDelivery(selection, hour)))}</Row>}
          {selection === "solar" && hour && <Row label="Available solar">{mw(hour.solar_available_mw)}</Row>}
          {selection === "wind" && hour && <Row label="Available wind">{mw(hour.wind_available_mw)}</Row>}
          {selection === "hydro" && <>
            <Row label="Operation">{request.supply.hydro_mode}</Row>
            <Row label="Nominal availability">{fmt(request.supply.hydro_capacity_factor * 100)}%</Row>
            <p className="world-help">Seasonal availability and a finite daily energy budget constrain the modeled resource.</p>
          </>}
          <p className="world-help">{selection === "nuclear" ? "Nuclear is not renewable. Its direct operational emissions are assumed zero within this scenario boundary."
            : "Generation and direct facility delivery differ when power charges storage or is exported. Curtailed availability is not generated energy."}</p>
          <p className="world-help">Source factors and availability are synthetic assumptions, not measured plant output.</p>
        </section>
      )}

      {selection === "battery" && (
        <section className="world-inspector-section">
          <h3>Storage state and origin</h3>
          <Row label="Energy / power">{fmt(capacity)} MWh / {mw(request.supply.battery_power_mw)}</Row>
          <Row label="Stored now">{hour ? `${fmt(hour.battery_state_mwh, 2)} MWh` : "Run design"}</Row>
          <Row label="Charging">{hour ? mw(hour.battery_charge_mw) : "Run design"}</Row>
          <Row label="Discharging">{hour ? mw(hour.battery_to_load_mw) : "Run design"}</Row>
          <Row label="Renewable-origin delivery">{hour ? mw(Math.max(0, hour.renewable_to_load_mw
            - hour.solar_to_load_mw - hour.wind_to_load_mw - hour.hydro_to_load_mw)) : "Run design"}</Row>
          <Row label="Round-trip efficiency">{fmt(request.supply.battery_round_trip_efficiency * 100)}%</Row>
          <p className="world-notice">Starts empty, charges only from physical surplus, and carries charge across days and months. Stored nuclear energy is not relabeled renewable.</p>
        </section>
      )}
      {selection === "grid" && (
        <section className="world-inspector-section">
          <h3>Connection and remaining demand</h3>
          <Row label="Import limit">{Number.isFinite(capacity) ? mw(capacity) : "Unconstrained"}</Row>
          <Row label="Export limit">{mw(request.grid.export_limit_mw)}</Row>
          <Row label="Importing">{hour ? mw(hour.grid_to_load_mw) : "Run design"}</Row>
          <Row label="Exporting">{hour ? mw(hour.grid_export_mw) : "Run design"}</Row>
          <Row label="Unserved demand">{hour ? mw(hour.unserved_mw) : "Run design"}</Row>
          <Row label="Grid intensity">{hour ? `${fmt(hour.grid_carbon_g_per_kwh)} gCO2e/kWh` : "Run design"}</Row>
          <p className="world-help">Exports receive no automatic avoided-carbon credit. Grid renewable content is not included in dedicated renewable coverage.</p>
        </section>
      )}
      {hour && !["campus", "compute", "cooling"].includes(selection) && tab !== "water" && <SourceBalance model={model} />}
      <button className="world-wide-button" disabled={!completed || model.dirty}
        onClick={() => onAnalysis("hourly")}>Expand the synchronized hourly chart</button>
      <div className="world-small-legend">
        {ASSETS.filter((item) => item.group === "Supply").map((item) => (
          <span key={item.id}><i style={{ background: item.color }} />{item.name}</span>
        ))}
      </div>
    </div>
  );
}
