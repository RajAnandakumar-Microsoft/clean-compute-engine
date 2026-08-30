import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "../data/store";

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`;

function Tower({ x, target, color, label, value }: {
  x: number; target: number; color: string; label: string; value: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const h = useRef(0.1);
  useFrame(() => {
    h.current += (target - h.current) * 0.12;
    if (ref.current) {
      ref.current.scale.y = Math.max(0.01, h.current);
      ref.current.position.y = h.current / 2;
    }
  });
  return (
    <group position={[x, 0, -9]}>
      <mesh ref={ref}>
        <boxGeometry args={[2.6, 1, 2.6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5}
          transparent opacity={0.85} metalness={0.3} roughness={0.4} />
      </mesh>
      <Html position={[0, Math.max(0.6, target) + 1.2, 0]} center>
        <div className="tower-label" style={{ borderColor: color }}>
          <b style={{ color }}>{fmt(value)} t</b><span>{label}</span>
        </div>
      </Html>
    </group>
  );
}

// Lifetime accumulation: two "carbon towers" rising behind the DC — the tall red
// one is what a grid-only build would emit, the short green one is this design.
export function LifetimeViz() {
  const timescale = useStore((s) => s.timescale);
  const lt = useStore((s) => s.lifetime);
  const i = useStore((s) => s.lifetimeIdx);
  if (timescale !== "lifetime" || !lt) return null;

  const maxCarbon = lt.baseline_carbon_t[lt.baseline_carbon_t.length - 1] || 1;
  const scale = 24 / maxCarbon;
  const baseH = lt.baseline_carbon_t[i] * scale;
  const designH = lt.design_carbon_t[i] * scale;

  return (
    <group>
      <Tower x={-3.2} target={baseH} color="#e6603a" label="grid-only emits" value={lt.baseline_carbon_t[i]} />
      <Tower x={3.2} target={designH} color="#37d39b" label="this design emits" value={lt.design_carbon_t[i]} />
    </group>
  );
}
