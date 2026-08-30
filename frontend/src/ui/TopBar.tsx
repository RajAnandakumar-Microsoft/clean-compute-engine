import { useStore } from "../data/store";

const SRC_COLORS: Record<string, string> = {
  solar: "#f5b400", wind: "#4fc3f7", gas: "#b0693b", nuclear: "#9c6bff",
  battery: "#37d39b", import: "#7a8698",
};

function fmtHour(h: number) {
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h - Math.floor(h)) * 60);
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function Kpi({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-val" style={tone ? { color: tone } : undefined}>{value}<span>{unit}</span></div>
      <div className="kpi-lbl">{label}</div>
    </div>
  );
}

export function TopBar() {
  const model = useStore((s) => s.model)!;
  const frame = useStore((s) => s.frame);
  const scenarios = useStore((s) => s.scenarios);
  const scenario = useStore((s) => s.scenario);
  const setScenario = useStore((s) => s.setScenario);
  const k = frame?.kpis;
  const e = frame?.energy;

  const mix = e ? [
    ["solar", e.solar_mw], ["wind", e.wind_mw], ["nuclear", e.nuclear_mw],
    ["gas", e.gas_mw], ["battery", Math.max(0, e.battery_discharge_mw)], ["import", e.grid_import_mw],
  ].filter(([, v]) => (v as number) > 0.001) : [];
  const mixTotal = mix.reduce((s, [, v]) => s + (v as number), 0) || 1;

  const cueTone = !k ? undefined : k.cue < 80 ? "#37d39b" : k.cue < 250 ? "#f5b400" : "#e6603a";

  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">◆</div>
        <div>
          <div className="title">
            The Clean Compute Engine
            <a
              className="story-entry"
              href={`${import.meta.env.BASE_URL}story`}
            >
              Interactive story
            </a>
          </div>
          <div className="project-status">
            Independent hackathon research · Not an official product
          </div>
          <div className="sub">{model.facility.name} · {model.facility.region} · {model.total_gpus} GPUs · {model.installed_it_mw} MW IT</div>
        </div>
      </div>

      <div className="clock">
        <div className="clock-time">{frame ? fmtHour(frame.hour) : "--:--"}</div>
        <select value={scenario} onChange={(ev) => setScenario(ev.target.value)}>
          {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="kpis">
        <Kpi label="Facility" value={k ? (k.facility_kw / 1000).toFixed(2) : "–"} unit=" MW" />
        <Kpi label="PUE" value={k ? k.pue.toFixed(3) : "–"} />
        <Kpi label="Carbon (CUE)" value={k ? k.cue.toFixed(0) : "–"} unit=" g/kWh" tone={cueTone} />
        <Kpi label="Water (WUE)" value={k ? k.wue.toFixed(2) : "–"} unit=" L/kWh" />
        <Kpi label="Clean" value={k ? k.pct_renewable.toFixed(0) : "–"} unit=" %" tone="#37d39b" />
        <Kpi label="Energy $/hr" value={k ? Math.round(k.dollars_per_hr).toLocaleString() : "–"} tone={k && k.dollars_per_hr < 0 ? "#37d39b" : undefined} />
      </div>

      <div className="mix">
        <div className="mix-bar">
          {mix.map(([name, v]) => (
            <div key={name as string} title={`${name}: ${(v as number).toFixed(2)} MW`}
              style={{ width: `${((v as number) / mixTotal) * 100}%`, background: SRC_COLORS[name as string] }} />
          ))}
        </div>
        <div className="mix-legend">
          {mix.map(([name]) => (
            <span key={name as string}><i style={{ background: SRC_COLORS[name as string] }} />{name}</span>
          ))}
        </div>
      </div>
    </header>
  );
}
