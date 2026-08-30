import { useEffect, useState } from "react";
import { useStore } from "../../data/store";

const fmt = (v: number, unit: string) => {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return `${v.toFixed(unit === "%" || unit === "yr" ? 1 : 0)}`;
};

export function ComparePanel() {
  const saved = useStore((s) => s.saved);
  const compareResult = useStore((s) => s.compareResult);
  const runCompare = useStore((s) => s.runCompare);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  useEffect(() => {
    if (saved.length >= 1 && !a) setA(saved[0].name);
    if (saved.length >= 2 && !b) setB(saved[1].name);
  }, [saved, a, b]);

  return (
    <div className="compare">
      <p className="hint">Save two or more designs (Design tab → Save design), then compare
        them side by side across all four dimensions.</p>
      <button onClick={saveCurrent}>+ Save current design</button>

      <div className="saved-list">
        {saved.length === 0 && <div className="muted">No saved designs yet.</div>}
        {saved.map((s) => (
          <div key={s.name} className="saved-item">
            <b>{s.name}</b>
            <span>{s.finance.clean_match_pct}% clean · {s.finance.annual_carbon_t.toLocaleString()} t · {(s.finance.net_annual_cost / 1e6).toFixed(1)}M/yr</span>
          </div>
        ))}
      </div>

      {saved.length >= 2 && (
        <>
          <div className="cmp-picks">
            <select value={a} onChange={(e) => setA(e.target.value)}>
              {saved.map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
            <span>vs</span>
            <select value={b} onChange={(e) => setB(e.target.value)}>
              {saved.map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <button className="primary" onClick={() => runCompare(a, b)}>Compare</button>
        </>
      )}

      {compareResult && (
        <table className="cmp-table">
          <thead>
            <tr><th></th><th>{compareResult.name_a}</th><th>{compareResult.name_b}</th><th>Δ</th></tr>
          </thead>
          <tbody>
            {compareResult.dimensions.map((d) => {
              const improved = d.better === "lower" ? d.delta < 0 : d.delta > 0;
              return (
                <tr key={d.label}>
                  <td>{d.label}<span className="unit"> {d.unit}</span></td>
                  <td>{fmt(d.a, d.unit)}</td>
                  <td>{fmt(d.b, d.unit)}</td>
                  <td style={{ color: improved ? "#37d39b" : "#e6603a" }}>
                    {d.delta_pct > 0 ? "+" : ""}{d.delta_pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
