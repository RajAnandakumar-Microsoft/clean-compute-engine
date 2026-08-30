import { useEffect, useState } from "react";
import { useStore } from "../../data/store";
import type { DesignConfig, GpuModelName } from "../../types/api";

function Range({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}<b>{value}{unit}</b></span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function DesignPanel() {
  const config = useStore((s) => s.config);
  const locations = useStore((s) => s.locations);
  const building = useStore((s) => s.building);
  const rebuild = useStore((s) => s.rebuild);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const [draft, setDraft] = useState<DesignConfig | null>(config);

  useEffect(() => { setDraft(config); }, [config]);
  if (!draft) return null;

  const set = (path: string, value: unknown) => {
    const next = structuredClone(draft) as any;
    const parts = path.split(".");
    let o = next;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
    setDraft(next);
  };

  const it = draft.it_build, eb = draft.energy_build, wl = draft.workload, fi = draft.finance;

  return (
    <div className="design">
      <label className="field">
        <span>Design name</span>
        <input type="text" value={draft.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <label className="field">
        <span>Location</span>
        <select value={draft.location} onChange={(e) => set("location", e.target.value)}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>

      <div className="section-label">IT build</div>
      <Range label="Racks" value={it.rack_count} min={8} max={120} step={1} onChange={(v) => set("it_build.rack_count", v)} />
      <label className="field"><span>GPU model</span>
        <select value={it.gpu_model} onChange={(e) => set("it_build.gpu_model", e.target.value as GpuModelName)}>
          {["H100", "GB200", "A100", "MI300X"].map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
      <Range label="Servers / rack" value={it.servers_per_rack} min={2} max={16} step={1} onChange={(v) => set("it_build.servers_per_rack", v)} />
      <Range label="GPUs / server" value={it.gpus_per_server} min={1} max={8} step={1} onChange={(v) => set("it_build.gpus_per_server", v)} />
      <label className="field"><span>Cooling</span>
        <select value={it.cooling} onChange={(e) => set("it_build.cooling", e.target.value)}>
          <option value="liquid">liquid</option><option value="air">air</option>
        </select>
      </label>
      <Range label="Density" value={it.design_density_kw} min={20} max={120} step={1} unit=" kW" onChange={(v) => set("it_build.design_density_kw", v)} />

      <div className="section-label">Energy build</div>
      <Range label="Grid interconnect" value={eb.grid_interconnect_mw} min={0} max={40} step={0.5} unit=" MW" onChange={(v) => set("energy_build.grid_interconnect_mw", v)} />
      <Range label="Solar" value={eb.solar_mw} min={0} max={30} step={0.5} unit=" MW" onChange={(v) => set("energy_build.solar_mw", v)} />
      <Range label="Wind" value={eb.wind_mw} min={0} max={30} step={0.5} unit=" MW" onChange={(v) => set("energy_build.wind_mw", v)} />
      <Range label="Gas" value={eb.gas_mw} min={0} max={20} step={0.5} unit=" MW" onChange={(v) => set("energy_build.gas_mw", v)} />
      <Range label="Nuclear (SMR)" value={eb.nuclear_mw} min={0} max={20} step={0.5} unit=" MW" onChange={(v) => set("energy_build.nuclear_mw", v)} />
      <Range label="Battery energy" value={eb.battery_mwh} min={0} max={60} step={1} unit=" MWh" onChange={(v) => set("energy_build.battery_mwh", v)} />
      <Range label="Battery power" value={eb.battery_mw} min={0} max={20} step={0.5} unit=" MW" onChange={(v) => set("energy_build.battery_mw", v)} />

      <div className="section-label">Workload</div>
      <Range label="Base load" value={wl.base_load_frac} min={0.1} max={1} step={0.05} onChange={(v) => set("workload.base_load_frac", v)} />
      <Range label="Peak load" value={wl.peak_load_frac} min={0.3} max={1} step={0.05} onChange={(v) => set("workload.peak_load_frac", v)} />
      <Range label="Deferrable" value={wl.deferrable_frac} min={0} max={0.8} step={0.05} onChange={(v) => set("workload.deferrable_frac", v)} />
      <label className="field"><span>Placement</span>
        <select value={draft.toggles.placement} onChange={(e) => set("toggles.placement", e.target.value)}>
          <option value="pack">pack</option><option value="spread">spread</option>
        </select>
      </label>

      <div className="section-label">Financial</div>
      <Range label="Import price" value={fi.import_price} min={0.02} max={0.25} step={0.005} unit=" $/kWh" onChange={(v) => set("finance.import_price", v)} />
      <Range label="Export price" value={fi.export_price} min={0} max={0.15} step={0.005} unit=" $/kWh" onChange={(v) => set("finance.export_price", v)} />
      <Range label="Discount rate" value={fi.discount_rate} min={0.02} max={0.2} step={0.01} onChange={(v) => set("finance.discount_rate", v)} />
      <Range label="Horizon" value={fi.horizon_years} min={5} max={30} step={1} unit=" yr" onChange={(v) => set("finance.horizon_years", v)} />

      <div className="design-actions">
        <button className="primary" disabled={building} onClick={() => rebuild(draft)}>
          {building ? "Building…" : "▶ Rebuild simulation"}
        </button>
        <button onClick={saveCurrent}>Save design</button>
      </div>
    </div>
  );
}
