import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "../data/store";
import { SOURCE_COLORS } from "./palette";
import { ecoLayout, HALL_CENTER, SourceNode } from "./ecoLayout";

const MAXP = 16;

function Flow({ from, to, color, intensity, reverse }: {
  from: THREE.Vector3; to: THREE.Vector3; color: string; intensity: number; reverse: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const curve = useMemo(() => {
    const a = from.clone().add(new THREE.Vector3(0, 2.4, 0));
    const b = to.clone();
    const lift = a.length() * 0.14 + 3;
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, lift, 0));
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }, [from, to]);
  const offsets = useMemo(() => Array.from({ length: MAXP }, (_, i) => i / MAXP), []);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.035, 6, false), [curve]);

  useFrame((state) => {
    const m = meshRef.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const active = intensity > 0.03 ? Math.max(1, Math.min(MAXP, Math.ceil(intensity * 3.2))) : 0;
    const speed = 0.14 + Math.min(0.55, intensity * 0.06);
    const size = 0.13 + Math.min(0.22, intensity * 0.035);
    for (let i = 0; i < MAXP; i++) {
      if (i < active) {
        let u = (offsets[i] + t * speed) % 1;
        if (reverse) u = 1 - u;
        dummy.position.copy(curve.getPoint(u));
        dummy.scale.setScalar(size);
      } else {
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={tube}>
        <meshBasicMaterial color={color} transparent opacity={intensity > 0.03 ? 0.22 : 0.06} toneMapped={false} />
      </mesh>
      <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, MAXP]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export function EnergyFlow() {
  const model = useStore((s) => s.model)!;
  const energy = useStore((s) => s.frame?.energy);
  const selection = useStore((s) => s.selection);
  if (selection.kind === "rack" || selection.kind === "server" || selection.kind === "gpu") return null;
  if (!energy) return null;

  const nodes = ecoLayout(model);
  const flowFor = (n: SourceNode): { intensity: number; reverse: boolean; color: string } => {
    switch (n.type) {
      case "solar": return { intensity: energy.solar_mw, reverse: false, color: SOURCE_COLORS.solar };
      case "wind": return { intensity: energy.wind_mw, reverse: false, color: SOURCE_COLORS.wind };
      case "gas": return { intensity: energy.gas_mw, reverse: false, color: SOURCE_COLORS.gas };
      case "nuclear": return { intensity: energy.nuclear_mw, reverse: false, color: SOURCE_COLORS.nuclear };
      case "battery":
        return energy.battery_discharge_mw > 0.01
          ? { intensity: energy.battery_discharge_mw, reverse: false, color: SOURCE_COLORS.battery }
          : { intensity: energy.battery_charge_mw, reverse: true, color: SOURCE_COLORS.battery };
      case "grid":
        return energy.grid_import_mw > 0.01
          ? { intensity: energy.grid_import_mw, reverse: false, color: "#ff9a4a" }
          : { intensity: energy.grid_export_mw, reverse: true, color: SOURCE_COLORS.export };
      default: return { intensity: 0, reverse: false, color: "#fff" };
    }
  };

  return (
    <group>
      {/* receiving hub glow at the DC */}
      <mesh position={[HALL_CENTER.x, HALL_CENTER.y, HALL_CENTER.z]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#2ad6ff" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {nodes.map((n) => {
        const f = flowFor(n);
        return <Flow key={n.id} from={n.pos} to={HALL_CENTER} color={f.color}
          intensity={f.intensity} reverse={f.reverse} />;
      })}
    </group>
  );
}
