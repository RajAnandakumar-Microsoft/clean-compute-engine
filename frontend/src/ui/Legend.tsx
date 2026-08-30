import { useStore } from "../data/store";
import { OVERLAY_LEGEND } from "../three/palette";
import type { LensName, OverlayName } from "../types/api";

const OVERLAYS: OverlayName[] = ["carbon", "temperature", "power", "utilization", "idle"];
const LENS_OVERLAY: Record<LensName, OverlayName> = {
  sustainability: "carbon", operator: "temperature", financial: "carbon",
};
const LENSES: { id: LensName; label: string }[] = [
  { id: "sustainability", label: "Sustainability" },
  { id: "operator", label: "Operator" },
  { id: "financial", label: "Financial" },
];

export function Legend() {
  const overlay = useStore((s) => s.overlay);
  const info = OVERLAY_LEGEND[overlay];
  return (
    <div className="legend">
      <div className="legend-title">{info.label}</div>
      <div className="legend-ramp" style={{ background: info.ramp }} />
      <div className="legend-scale"><span>{info.lo}</span><span>{info.hi}</span></div>
    </div>
  );
}

export function OverlayPicker() {
  const overlay = useStore((s) => s.overlay);
  const setOverlay = useStore((s) => s.setOverlay);
  return (
    <div className="overlay-picker">
      <div className="section-label">Overlay</div>
      <div className="ov-grid">
        {OVERLAYS.map((o) => (
          <button key={o} className={overlay === o ? "on" : ""} onClick={() => setOverlay(o)}>
            {OVERLAY_LEGEND[o].label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LensToggle() {
  const lens = useStore((s) => s.lens);
  const setLens = useStore((s) => s.setLens);
  const setOverlay = useStore((s) => s.setOverlay);
  return (
    <div className="lens-toggle">
      <div className="section-label">Lens</div>
      <div className="lens-grid">
        {LENSES.map((l) => (
          <button key={l.id} className={lens === l.id ? "on" : ""}
            onClick={() => { setLens(l.id); setOverlay(LENS_OVERLAY[l.id]); }}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
