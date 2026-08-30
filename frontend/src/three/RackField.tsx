import { useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RackTelemetry } from "../types/api";
import { useStore } from "../data/store";
import { rackAppearance } from "./palette";

const RACK_GEO = new THREE.BoxGeometry(0.5, 2.05, 1.05);

function Rack({ id, pos, rt, overlay, cue, selected, onSelect, onHover, onOut }: any) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  const app = rt ? rackAppearance(overlay, rt, cue)
    : { color: new THREE.Color("#2a3348"), emissive: 0.05, opacity: 1 };
  // smooth the emissive so streaming frames don't strobe
  useFrame(() => {
    if (!ref.current) return;
    ref.current.color.lerp(app.color, 0.25);
    ref.current.emissive.lerp(app.color, 0.25);
    ref.current.emissiveIntensity += (app.emissive - ref.current.emissiveIntensity) * 0.2;
  });
  return (
    <mesh geometry={RACK_GEO} position={[pos.x, pos.y, pos.z]}
      scale={selected ? [1.12, 1.03, 1.12] : 1}
      onClick={(e) => { e.stopPropagation(); onSelect(id); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(id); }}
      onPointerOut={() => onOut(id)}>
      <meshStandardMaterial ref={ref} roughness={0.35} metalness={0.35}
        emissive={app.color} emissiveIntensity={app.emissive} />
    </mesh>
  );
}

export function RackField() {
  const model = useStore((s) => s.model)!;
  const frame = useStore((s) => s.frame);
  const overlay = useStore((s) => s.overlay);
  const selection = useStore((s) => s.selection);
  const select = useStore((s) => s.select);
  const [hover, setHover] = useState<string | null>(null);

  const rackTel = useMemo(() => {
    const m = new Map<string, RackTelemetry>();
    frame?.racks.forEach((r) => m.set(r.id, r));
    return m;
  }, [frame]);

  const cue = frame?.kpis.cue ?? 100;
  const drilledRack = selection.kind === "rack" ? selection.id
    : selection.kind === "server" || selection.kind === "gpu"
    ? selection.id.split("-srv-")[0] : null;

  // when drilled into a rack, hide the field so DetailView shows it isolated
  if (drilledRack) return null;

  return (
    <group>
      {/* hall floor slab under the racks */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[model.hall_dims.x + 2, model.hall_dims.z + 2]} />
        <meshStandardMaterial color="#0c1220" roughness={0.6} metalness={0.4} />
      </mesh>

      {model.racks.map((r) => (
        <Rack key={r.id} id={r.id} pos={r.pos} rt={rackTel.get(r.id)} overlay={overlay} cue={cue}
          selected={selection.kind === "rack" && selection.id === r.id}
          onSelect={select} onHover={setHover} onOut={(id: string) => setHover((h) => (h === id ? null : h))} />
      ))}

      {hover && rackTel.get(hover) && (() => {
        const r = model.racks.find((x) => x.id === hover)!;
        const rt = rackTel.get(hover)!;
        return (
          <Html position={[r.pos.x, r.pos.y + 1.5, r.pos.z]} center distanceFactor={10}>
            <div className="tooltip">
              <b>{hover}</b><br />
              {rt.power_kw.toFixed(1)} kW · {rt.pct_capacity.toFixed(0)}%<br />
              {rt.outlet_c.toFixed(1)}°C · util {(rt.util * 100).toFixed(0)}%
            </div>
          </Html>
        );
      })()}
    </group>
  );
}
