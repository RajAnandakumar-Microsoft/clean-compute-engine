import { useState } from "react";
import { useStore } from "../../data/store";

const fmt$ = (v: number) => {
  const a = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}k`;
  return `${s}$${a.toFixed(0)}`;
};

function Big({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className="big"><div className="big-v" style={tone ? { color: tone } : undefined}>{value}</div><div className="big-l">{label}</div></div>;
}

function CashFlow({ data }: { data: number[] }) {
  const W = 240, H = 96, pad = 4;
  const min = Math.min(0, ...data), max = Math.max(0, ...data);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const zeroY = y(0);
  const breakeven = data.findIndex((v) => v >= 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cashflow">
      <line x1={pad} x2={W - pad} y1={zeroY} y2={zeroY} className="zero" />
      <path d={`${line} L${x(data.length - 1)},${zeroY} L${x(0)},${zeroY} Z`} className="area" />
      <path d={line} className="cf-line" />
      {breakeven > 0 && <line x1={x(breakeven)} x2={x(breakeven)} y1={0} y2={H} className="be" />}
    </svg>
  );
}

export function FinancePanel() {
  const finance = useStore((s) => s.finance);
  const config = useStore((s) => s.config);
  const scheduleResult = useStore((s) => s.scheduleResult);
  const runSchedule = useStore((s) => s.runSchedule);
  const [busy, setBusy] = useState(false);
  if (!finance || !config) return null;
  const f = finance;
  const smart = config.toggles.smart_scheduling;

  const toggleSmart = async () => {
    setBusy(true);
    try { await runSchedule(!smart); } finally { setBusy(false); }
  };

  return (
    <div className="finance">
      <div className="big-grid">
        <Big label="Net annual cost" value={fmt$(f.net_annual_cost)} />
        <Big label="Annual savings vs grid-only" value={fmt$(f.annual_savings)} tone={f.annual_savings >= 0 ? "#37d39b" : "#e6603a"} />
        <Big label="Payback" value={f.payback_years ? `${f.payback_years} yr` : "—"} />
        <Big label="24/7 clean match" value={`${f.clean_match_pct}%`} tone="#37d39b" />
      </div>

      <h4>Cumulative cash flow vs grid-only baseline</h4>
      <CashFlow data={f.cash_flow} />
      <div className="cf-caption">
        <span>Year 0: {fmt$(f.cash_flow[0])}</span>
        <span>Year {f.cash_flow.length - 1}: {fmt$(f.cash_flow[f.cash_flow.length - 1])}</span>
      </div>

      <h4>Annual cost stack</h4>
      <div className="stack">
        <Row k="Annualized capex" v={fmt$(f.annualized_capex)} />
        <Row k="Opex" v={fmt$(f.opex)} />
        <Row k="Grid energy" v={fmt$(f.energy_cost)} />
        <Row k="− Grid services" v={fmt$(-f.grid_services_revenue)} good />
        <Row k="− Heat reuse credit" v={fmt$(-f.heat_reuse_credit)} good />
        <Row k="= Net annual" v={fmt$(f.net_annual_cost)} bold />
      </div>

      <h4>Capex ({fmt$(f.capex.total)})</h4>
      <div className="stack">
        <Row k="IT hardware" v={fmt$(f.capex.it_hardware)} />
        <Row k="Facility" v={fmt$(f.capex.facility)} />
        <Row k="Solar" v={fmt$(f.capex.solar)} />
        <Row k="Wind" v={fmt$(f.capex.wind)} />
        {f.capex.gas > 0 && <Row k="Gas" v={fmt$(f.capex.gas)} />}
        {f.capex.nuclear > 0 && <Row k="Nuclear" v={fmt$(f.capex.nuclear)} />}
        <Row k="Battery" v={fmt$(f.capex.battery)} />
      </div>

      <h4>Four-dimension summary</h4>
      <div className="stack">
        <Row k="Annual energy" v={`${(f.annual_energy_mwh / 1000).toFixed(1)} GWh`} />
        <Row k="Annual carbon" v={`${f.annual_carbon_t.toLocaleString()} tCO₂e`} />
        <Row k="Annual water" v={`${f.annual_water_ml} ML`} />
        <Row k="$/MWh-compute" v={`$${f.dollars_per_mwh_compute}`} />
        <Row k="NPV" v={fmt$(f.npv)} />
        <Row k="ROI" v={`${(f.roi * 100).toFixed(0)}%`} />
      </div>

      <h4>Smart scheduling (flexible load)</h4>
      <button className={`smart ${smart ? "on" : ""}`} disabled={busy} onClick={toggleSmart}>
        {busy ? "Recomputing…" : smart ? "✓ Smart scheduling ON" : "Enable smart scheduling"}
      </button>
      {scheduleResult && (
        <div className="sched">
          <Row k="Carbon" v={`${scheduleResult.carbon_before_t.toFixed(1)} → ${scheduleResult.carbon_after_t.toFixed(1)} t/day`} />
          <Row k="Change" v={`${scheduleResult.carbon_delta_pct}%`} good={scheduleResult.carbon_delta_pct < 0} />
          <Row k="Storage reliance" v={`${scheduleResult.battery_need_before_mwh} → ${scheduleResult.battery_need_after_mwh} MWh`} />
          <p className="hint">{scheduleResult.note}</p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, good, bold }: { k: string; v: string; good?: boolean; bold?: boolean }) {
  return <div className={`srow ${bold ? "bold" : ""}`}><span>{k}</span>
    <b style={good ? { color: "#37d39b" } : undefined}>{v}</b></div>;
}
