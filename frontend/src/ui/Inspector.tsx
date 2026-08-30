import { useStore } from "../data/store";
import { Sparkline } from "./Sparkline";

const NOW = 2026;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="irow"><span>{k}</span><b>{v}</b></div>;
}
function EmbodiedBar({ embodied, opPerYear, life }: { embodied: number; opPerYear: number; life: number }) {
  const op = opPerYear * life;
  const total = embodied + op || 1;
  return (
    <div className="embodied">
      <div className="split">
        <div style={{ width: `${(embodied / total) * 100}%` }} className="emb" />
        <div style={{ width: `${(op / total) * 100}%` }} className="op" />
      </div>
      <div className="split-legend">
        <span><i className="emb" />embodied {embodied.toFixed(0)} kg</span>
        <span><i className="op" />operational {(op).toFixed(0)} kg / {life}yr</span>
      </div>
    </div>
  );
}

export function Inspector() {
  const model = useStore((s) => s.model)!;
  const frame = useStore((s) => s.frame);
  const sel = useStore((s) => s.selection);
  const k = frame?.kpis;

  if (sel.kind === "facility") {
    const f = model.facility;
    return (
      <div className="inspector">
        <h3>▣ {f.name}</h3>
        <div className="tag">Facility · Tier {f.tier}</div>
        <Row k="Region" v={f.region} />
        <Row k="Power capacity" v={`${f.power_capacity_mw} MW`} />
        <Row k="Design PUE" v={f.design_pue} />
        <Row k="Water source" v={f.water_source} />
        <Row k="Commissioned" v={f.commissioned_year} />
        <h4>Live</h4>
        <Row k="Facility power" v={k ? `${(k.facility_kw / 1000).toFixed(2)} MW` : "–"} />
        <Sparkline value={k?.facility_kw ?? 0} color="#37b6ff" />
        <Row k="Carbon (CUE)" v={k ? `${k.cue.toFixed(0)} g/kWh` : "–"} />
        <Sparkline value={k?.cue ?? 0} color="#37d39b" />
        <Row k="Live carbon" v={k ? `${k.live_carbon_g_s.toFixed(1)} g/s` : "–"} />
        <Row k="Energy today" v={k ? `${(k.energy_today_kwh / 1000).toFixed(1)} MWh` : "–"} />
        <h4>Embodied carbon</h4>
        <Row k="GPUs" v={`${model.embodied.gpu_co2e_t} t`} />
        <Row k="Servers" v={`${model.embodied.server_co2e_t} t`} />
        <Row k="Total embodied" v={`${model.embodied.total_co2e_t} tCO₂e`} />
      </div>
    );
  }

  if (sel.kind === "hall") {
    const h = model.halls[0];
    const ht = frame?.halls[0];
    return (
      <div className="inspector">
        <h3>▤ {h.name}</h3>
        <div className="tag">Hall · {h.cooling} cooled</div>
        <Row k="Area" v={`${h.area_m2} m²`} />
        <Row k="Racks" v={h.rack_capacity} />
        <Row k="Design density" v={`${h.design_density_kw} kW/rack`} />
        <h4>Live</h4>
        <Row k="IT power" v={ht ? `${(ht.it_kw / 1000).toFixed(2)} MW` : "–"} />
        <Row k="Avg / max temp" v={ht ? `${ht.avg_temp_c}° / ${ht.max_temp_c}°C` : "–"} />
        <Row k="Utilization" v={ht ? `${(ht.util * 100).toFixed(0)}%` : "–"} />
        <Row k="Active racks" v={ht ? `${ht.active_racks} / ${h.rack_capacity}` : "–"} />
        <Sparkline value={ht?.it_kw ?? 0} color="#37b6ff" />
      </div>
    );
  }

  if (sel.kind === "rack") {
    const r = model.racks.find((x) => x.id === sel.id)!;
    const rt = frame?.racks.find((x) => x.id === sel.id);
    return (
      <div className="inspector">
        <h3>▮ {r.id}</h3>
        <div className="tag">Rack · row {r.row}, col {r.col}</div>
        <Row k="Breaker" v={`${r.breaker_kw} kW`} />
        <Row k="Height" v={`${r.u_height}U`} />
        <Row k="Cooling" v={r.cooling} />
        <h4>Live</h4>
        <Row k="Power" v={rt ? `${rt.power_kw.toFixed(1)} kW (${rt.pct_capacity.toFixed(0)}%)` : "–"} />
        <Sparkline value={rt?.power_kw ?? 0} color="#37b6ff" />
        <Row k="Inlet / outlet" v={rt ? `${rt.inlet_c}° / ${rt.outlet_c}°C (Δ${rt.delta_t})` : "–"} />
        <Row k="Utilization" v={rt ? `${(rt.util * 100).toFixed(0)}%` : "–"} />
        <Row k="Cooling load" v={rt ? `${rt.cooling_load_kw.toFixed(1)} kW` : "–"} />
        <Row k="Live carbon" v={rt ? `${rt.live_carbon_g_s.toFixed(2)} g/s` : "–"} />
        <p className="hint">Click a GPU in the 3D view to drill in.</p>
      </div>
    );
  }

  if (sel.kind === "server") {
    const s = model.servers.find((x) => x.id === sel.id)!;
    const st = frame?.servers.find((x) => x.id === sel.id);
    const remaining = s.install_year + s.useful_life_yr - NOW;
    return (
      <div className="inspector">
        <h3>▪ {s.id.split("-").slice(-2).join("-")}</h3>
        <div className="tag">Server · {s.model}</div>
        <Row k="GPUs" v={s.gpu_count} />
        <Row k="Rated power" v={`${s.rated_power_kw.toFixed(1)} kW`} />
        <h4>Live</h4>
        <Row k="Power" v={st ? `${st.power_kw.toFixed(2)} kW` : "–"} />
        <Row k="Utilization" v={st ? `${(st.util * 100).toFixed(0)}%` : "–"} />
        <Row k="Active jobs" v={st ? st.active_jobs : "–"} />
        <Sparkline value={st?.power_kw ?? 0} color="#37b6ff" />
        <h4>Lifecycle</h4>
        <Row k="Installed" v={s.install_year} />
        <Row k="Remaining life" v={remaining > 0 ? `${remaining} yr` : "END OF LIFE"} />
      </div>
    );
  }

  // gpu
  const g = model.gpus.find((x) => x.id === sel.id)!;
  const gt = frame?.gpus.find((x) => x.id === sel.id);
  const opPerYear = gt ? (gt.live_carbon_g_s * 3600 * 24 * 365) / 1000 : 0;
  const remaining = g.install_year + g.useful_life_yr - NOW;
  return (
    <div className="inspector">
      <h3>· {g.model} GPU</h3>
      <div className="tag">{g.id.split("-").slice(-3).join("-")}</div>
      <Row k="TDP" v={`${g.tdp_w} W`} />
      <Row k="Memory" v={`${g.memory_gb} GB`} />
      <h4>Live</h4>
      <Row k="Power" v={gt ? `${gt.power_w.toFixed(0)} W` : "–"} />
      <Sparkline value={gt?.power_w ?? 0} color="#37b6ff" />
      <Row k="Utilization" v={gt ? `${(gt.util * 100).toFixed(0)}%` : "–"} />
      <Row k="Temp" v={gt ? `${gt.temp_c.toFixed(1)}°C` : "–"} />
      <Row k="Memory used" v={gt ? `${gt.mem_used_gb.toFixed(0)} GB` : "–"} />
      <Row k="Job" v={gt?.job_id ?? (gt?.idle ? "idle" : "–")} />
      <Row k="State" v={gt?.idle ? "◌ idle / stranded" : "● active"} />
      <h4>Carbon: embodied vs operational</h4>
      <EmbodiedBar embodied={g.embodied_co2e_kg} opPerYear={opPerYear} life={g.useful_life_yr} />
      <h4>Lifecycle</h4>
      <Row k="Installed" v={g.install_year} />
      <Row k="Remaining life" v={remaining > 0 ? `${remaining} yr` : "END OF LIFE"} />
    </div>
  );
}
