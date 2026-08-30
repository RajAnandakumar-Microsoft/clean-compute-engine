import { useEffect, useState } from "react";
import { useStore } from "../data/store";
import { api } from "../data/api";
import type { Curves, LifetimeReport } from "../types/api";

const SPEEDS = [1, 10, 60];
const fmtYear = (y: number) => (y < 1 ? "6mo" : `${y}y`);

function DayTimeline() {
  const frame = useStore((s) => s.frame);
  const scenario = useStore((s) => s.scenario);
  const scrub = useStore((s) => s.scrub);
  const [curves, setCurves] = useState<Curves | null>(null);
  useEffect(() => { api.curves().then(setCurves).catch(() => {}); }, [scenario]);

  const hour = frame?.hour ?? 0;
  const W = 100;
  const carbonPath = curves ? (() => {
    const max = Math.max(...curves.grid_carbon), min = Math.min(...curves.grid_carbon);
    const span = max - min || 1;
    return curves.grid_carbon.map((c, i) =>
      `${i === 0 ? "M" : "L"}${((i / 23) * W).toFixed(2)},${(30 - ((c - min) / span) * 26 - 2).toFixed(2)}`).join(" ");
  })() : "";
  const solarPath = curves ? curves.solar_cf.map((c, i) =>
    `${i === 0 ? "M" : "L"}${((i / 23) * W).toFixed(2)},${(30 - c * 26 - 2).toFixed(2)}`).join(" ") : "";

  return (
    <div className="timeline">
      <svg viewBox={`0 0 ${W} 30`} preserveAspectRatio="none" className="curve">
        <defs>
          <linearGradient id="cg" x1="0" x2="1">
            <stop offset="0" stopColor="#29ba6b" /><stop offset="0.5" stopColor="#8c8c8c" /><stop offset="1" stopColor="#b0693b" />
          </linearGradient>
        </defs>
        {solarPath && <path d={solarPath} className="solar-curve" />}
        {carbonPath && <path d={carbonPath} className="carbon-curve" stroke="url(#cg)" />}
        <line x1={(hour / 24) * W} x2={(hour / 24) * W} y1="0" y2="30" className="playhead" />
      </svg>
      <input type="range" min={0} max={23.99} step={0.05} value={hour}
        onChange={(e) => scrub(parseFloat(e.target.value))} />
      <div className="ticks">
        {[0, 6, 12, 18, 24].map((t) => <span key={t} style={{ left: `${(t / 24) * 100}%` }}>{t}:00</span>)}
      </div>
    </div>
  );
}

function YearsTimeline({ lt }: { lt: LifetimeReport }) {
  const idx = useStore((s) => s.lifetimeIdx);
  const setIdx = useStore((s) => s.setLifetimeIdx);
  const n = lt.years.length;
  const W = 100, H = 30;
  const max = Math.max(...lt.baseline_carbon_t) || 1;
  const xi = (i: number) => (i / (n - 1)) * W;
  const yv = (v: number) => H - (v / max) * (H - 3) - 1.5;
  const linePath = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${xi(i).toFixed(2)},${yv(v).toFixed(2)}`).join(" ");
  const area = `${linePath(lt.baseline_carbon_t)} L${xi(n - 1)},${yv(lt.design_carbon_t[n - 1])} ` +
    lt.design_carbon_t.map((v, i) => `L${xi(n - 1 - i).toFixed(2)},${yv(lt.design_carbon_t[n - 1 - i]).toFixed(2)}`).join(" ") + " Z";

  return (
    <div className="timeline">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="curve">
        <path d={area} className="lt-gap" />
        <path d={linePath(lt.baseline_carbon_t)} className="lt-baseline" />
        <path d={linePath(lt.design_carbon_t)} className="lt-design" />
        <line x1={xi(idx)} x2={xi(idx)} y1="0" y2={H} className="playhead" />
      </svg>
      <input type="range" min={0} max={n - 1} step={1} value={idx}
        onChange={(e) => setIdx(parseInt(e.target.value))} />
      <div className="ticks">
        {lt.years.map((y, i) => (i % 2 === 0 || i === n - 1) &&
          <span key={y} style={{ left: `${(i / (n - 1)) * 100}%` }}>{fmtYear(y)}</span>)}
      </div>
    </div>
  );
}

export function TimeControls() {
  const timescale = useStore((s) => s.timescale);
  const setTimescale = useStore((s) => s.setTimescale);
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const play = useStore((s) => s.play);
  const pause = useStore((s) => s.pause);
  const setSpeed = useStore((s) => s.setSpeed);
  const frame = useStore((s) => s.frame);
  const lifetime = useStore((s) => s.lifetime);
  const idx = useStore((s) => s.lifetimeIdx);
  const day = timescale === "day";

  return (
    <footer className="timebar">
      <div className="transport">
        <div className="timescale-toggle">
          <button className={day ? "on" : ""} onClick={() => setTimescale("day")}>24h Day</button>
          <button className={!day ? "on" : ""} onClick={() => setTimescale("lifetime")}>Lifetime</button>
        </div>
        {day && (
          <>
            <button className="play" onClick={() => (playing ? pause() : play())}>{playing ? "❚❚" : "▶"}</button>
            <div className="speeds">
              {SPEEDS.map((s) => <button key={s} className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>{s}×</button>)}
            </div>
          </>
        )}
      </div>

      {day ? <DayTimeline /> : lifetime ? <YearsTimeline lt={lifetime} /> : <div className="timeline muted">loading projection…</div>}

      <div className="tstat">
        {day ? (
          <>
            <div><b>{frame ? frame.kpis.cue.toFixed(0) : "–"}</b> gCO₂/kWh grid</div>
            <div className="muted">green = clean hours · scrub to watch the hall recolor</div>
          </>
        ) : lifetime ? (
          <>
            <div><b style={{ color: "#37d39b" }}>{lifetime.avoided_carbon_t[idx].toLocaleString()}</b> tCO₂e avoided</div>
            <div className="muted">at {fmtYear(lifetime.years[idx])} vs grid-only · scrub the lifetime</div>
          </>
        ) : null}
      </div>
    </footer>
  );
}
