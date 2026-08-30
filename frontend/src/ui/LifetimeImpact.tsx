import { useStore } from "../data/store";

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmt$ = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}k`;
  return `${s}$${a.toFixed(0)}`;
};
const fmtYear = (y: number) => (y < 1 ? "6 months" : y === 1 ? "1 year" : `${y} years`);

export function LifetimeImpact() {
  const timescale = useStore((s) => s.timescale);
  const lt = useStore((s) => s.lifetime);
  const i = useStore((s) => s.lifetimeIdx);
  if (timescale !== "lifetime" || !lt) return null;

  const designC = lt.design_carbon_t[i];
  const baseC = lt.baseline_carbon_t[i];
  const pctCleaner = baseC > 0 ? Math.round((1 - designC / baseC) * 100) : 0;

  return (
    <div className="lifetime-impact">
      <div className="li-head">Lifetime impact · <b>{fmtYear(lt.years[i])}</b></div>
      <div className="li-hero">
        <div className="li-hero-val">{fmt(lt.avoided_carbon_t[i])}</div>
        <div className="li-hero-lbl">tCO₂e avoided vs grid-only</div>
      </div>

      <div className="li-bars">
        <div className="li-bar-row"><span>Grid-only</span><div className="li-bar"><div style={{ width: "100%", background: "#e6603a" }} /></div><b>{fmt(baseC)}</b></div>
        <div className="li-bar-row"><span>This design</span><div className="li-bar"><div style={{ width: `${baseC ? (designC / baseC) * 100 : 0}%`, background: "#37d39b" }} /></div><b>{fmt(designC)}</b></div>
        <div className="li-cleaner">{pctCleaner}% lower emissions</div>
      </div>

      <div className="li-grid">
        <div className="li-cell"><b>{fmt(lt.cars_equiv[i])}</b><span>cars off the road</span></div>
        <div className="li-cell"><b>{fmt(lt.trees_equiv[i])}</b><span>trees' worth of CO₂</span></div>
        <div className="li-cell"><b>{fmt(lt.homes_equiv)}</b><span>homes on clean power</span></div>
        <div className="li-cell"><b>{lt.clean_gwh[i].toLocaleString(undefined, { maximumFractionDigits: 0 })} GWh</b><span>clean energy delivered</span></div>
        <div className="li-cell"><b>{fmt$(lt.saved_cost[i])}</b><span>cost saved</span></div>
        <div className="li-cell"><b>{lt.water_ml[i].toLocaleString(undefined, { maximumFractionDigits: 0 })} ML</b><span>water used</span></div>
      </div>
    </div>
  );
}
