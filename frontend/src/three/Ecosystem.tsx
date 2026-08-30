import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "../data/store";
import { SOURCE_COLORS } from "./palette";
import { ecoLayout, SourceNode } from "./ecoLayout";

function Label({ node, sub, value }: { node: SourceNode; sub: string; value: string }) {
  return (
    <Html position={[node.pos.x, 5.6, node.pos.z]} center className="eco-label-wrap" occlude={false} zIndexRange={[20, 0]}>
      <div className="eco-label" style={{ borderColor: SOURCE_COLORS[node.type] }}>
        <b style={{ color: SOURCE_COLORS[node.type] }}>{value}</b>
        <span>{sub}</span>
      </div>
    </Html>
  );
}

function SolarFarm({ node }: { node: SourceNode }) {
  const solarMw = useStore((s) => s.frame?.energy.solar_mw ?? 0);
  const frac = Math.min(1, solarMw / Math.max(node.nameplate, 0.1));
  const n = Math.max(6, Math.min(48, Math.round(node.nameplate * 2)));
  const cols = Math.ceil(Math.sqrt(n * 1.4));
  const rows = Math.ceil(n / cols);
  const panels = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    panels.push([ (c - (cols - 1) / 2) * 1.5, (r - (rows - 1) / 2) * 1.9 ]);
  }
  return (
    <group position={[node.pos.x, 0, node.pos.z]}>
      {panels.map(([x, z], i) => (
        <group key={i} position={[x, 0.5, z]} rotation={[-Math.PI / 5, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.3, 0.06, 1.5]} />
            <meshStandardMaterial color="#16305c" metalness={0.7} roughness={0.25}
              emissive="#ffce3a" emissiveIntensity={0.05 + frac * 0.5} />
          </mesh>
        </group>
      ))}
      {/* posts */}
      {panels.map(([x, z], i) => (
        <mesh key={`p${i}`} position={[x, 0.25, z]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
          <meshStandardMaterial color="#2a3446" />
        </mesh>
      ))}
      <Label node={node} sub={`solar · ${node.nameplate} MW`} value={`${solarMw.toFixed(1)} MW`} />
    </group>
  );
}

function Turbine({ x, z, spin, out }: { x: number; z: number; spin: number; out: number }) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.z += dt * spin; });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.22, 6, 8]} />
        <meshStandardMaterial color="#dfe8f2" metalness={0.3} roughness={0.5} />
      </mesh>
      <group ref={rotor} position={[0, 6, 0.35]}>
        <mesh><sphereGeometry args={[0.28, 12, 12]} /><meshStandardMaterial color="#eef3f8" emissive="#5fd0ff" emissiveIntensity={0.1 + out * 0.5} /></mesh>
        {[0, 1, 2].map((b) => (
          <mesh key={b} rotation={[0, 0, (b * Math.PI * 2) / 3]} position={[0, 0, 0]}>
            <mesh position={[0, 1.7, 0]}>
              <boxGeometry args={[0.16, 3.4, 0.05]} />
              <meshStandardMaterial color="#f2f6fa" metalness={0.2} roughness={0.6} />
            </mesh>
          </mesh>
        ))}
      </group>
    </group>
  );
}

function WindFarm({ node }: { node: SourceNode }) {
  const windMw = useStore((s) => s.frame?.energy.wind_mw ?? 0);
  const out = Math.min(1, windMw / Math.max(node.nameplate, 0.1));
  const n = Math.max(2, Math.min(5, Math.round(node.nameplate / 8)));
  return (
    <group position={[node.pos.x, 0, node.pos.z]}>
      {Array.from({ length: n }).map((_, i) => (
        <Turbine key={i} x={(i - (n - 1) / 2) * 4.5} z={(i % 2) * 3} spin={0.4 + out * 4} out={out} />
      ))}
      <Label node={node} sub={`wind · ${node.nameplate} MW`} value={`${windMw.toFixed(1)} MW`} />
    </group>
  );
}

function GasPlant({ node }: { node: SourceNode }) {
  const gasMw = useStore((s) => s.frame?.energy.gas_mw ?? 0);
  const on = gasMw > 0.01;
  return (
    <group position={[node.pos.x, 0, node.pos.z]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[4, 2.4, 3]} />
        <meshStandardMaterial color="#3a3026" metalness={0.4} roughness={0.6} />
      </mesh>
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 3.2, -0.8]} castShadow>
          <cylinderGeometry args={[0.4, 0.5, 3.2, 12]} />
          <meshStandardMaterial color="#4a3d30" emissive="#ff6a2a" emissiveIntensity={on ? 0.5 : 0} />
        </mesh>
      ))}
      <Label node={node} sub={`gas · ${node.nameplate} MW`} value={on ? `${gasMw.toFixed(1)} MW` : "idle"} />
    </group>
  );
}

function NuclearPlant({ node }: { node: SourceNode }) {
  const nukeMw = useStore((s) => s.frame?.energy.nuclear_mw ?? 0);
  // hyperbolic cooling tower via a lathe profile
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = t * 5;
    const r = 2.2 - Math.sin(t * Math.PI) * 0.9;
    pts.push(new THREE.Vector2(r, y));
  }
  return (
    <group position={[node.pos.x, 0, node.pos.z]}>
      <mesh castShadow>
        <latheGeometry args={[pts, 24]} />
        <meshStandardMaterial color="#c9c2d6" metalness={0.2} roughness={0.7} side={THREE.DoubleSide}
          emissive="#b98bff" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 5.4, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 1.2, 24, 1, true]} />
        <meshStandardMaterial color="#e8e4f2" transparent opacity={0.35} emissive="#d8ccff" emissiveIntensity={0.4} />
      </mesh>
      <Label node={node} sub={`nuclear · ${node.nameplate} MW`} value={`${nukeMw.toFixed(1)} MW`} />
    </group>
  );
}

function BatteryBank({ node }: { node: SourceNode }) {
  const soc = useStore((s) => s.frame?.energy.battery_soc ?? 0);
  const charge = useStore((s) => (s.frame?.energy.battery_charge_mw ?? 0) - (s.frame?.energy.battery_discharge_mw ?? 0));
  const active = Math.abs(charge) > 0.01;
  const cabinets = 4;
  return (
    <group position={[node.pos.x, 0, node.pos.z]}>
      {Array.from({ length: cabinets }).map((_, i) => (
        <group key={i} position={[(i - (cabinets - 1) / 2) * 1.5, 0, 0]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[1.1, 1.8, 1.1]} />
            <meshStandardMaterial color="#182430" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* charge-level bar */}
          <mesh position={[0, 0.2 + soc * 0.7, 0.58]}>
            <boxGeometry args={[0.8, Math.max(0.05, soc * 1.4), 0.04]} />
            <meshStandardMaterial color="#37e2a0" emissive="#37e2a0" emissiveIntensity={active ? 1.2 : 0.5} />
          </mesh>
        </group>
      ))}
      <Label node={node} sub={`battery · ${node.nameplate} MWh`} value={`${(soc * 100).toFixed(0)}%`} />
    </group>
  );
}

function GridTie({ node }: { node: SourceNode }) {
  const imp = useStore((s) => s.frame?.energy.grid_import_mw ?? 0);
  const exp = useStore((s) => s.frame?.energy.grid_export_mw ?? 0);
  const glow = imp > 0.01 ? "#ff9a4a" : exp > 0.01 ? "#ffce3a" : "#8fa0b5";
  return (
    <group position={[node.pos.x, 0, node.pos.z]}>
      {[-1.6, 1.6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.12, 0.18, 6, 6]} /><meshStandardMaterial color="#4a5666" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, 5, 0]}><boxGeometry args={[2.2, 0.15, 0.15]} /><meshStandardMaterial color="#5a6676" /></mesh>
          <mesh position={[0, 4, 0]}><boxGeometry args={[1.6, 0.15, 0.15]} /><meshStandardMaterial color="#5a6676" /></mesh>
          <mesh position={[0, 5.6, 0]}><sphereGeometry args={[0.16, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.0} /></mesh>
        </group>
      ))}
      <Label node={node} sub={`grid · ${node.nameplate} MW`}
        value={imp > 0.01 ? `import ${imp.toFixed(1)}` : exp > 0.01 ? `export ${exp.toFixed(1)}` : "islanded"} />
    </group>
  );
}

export function Ecosystem() {
  const model = useStore((s) => s.model)!;
  const selection = useStore((s) => s.selection);
  // hide the surrounding ecosystem while drilled into a single rack
  if (selection.kind === "rack" || selection.kind === "server" || selection.kind === "gpu") return null;

  const nodes = ecoLayout(model);
  return (
    <group>
      {nodes.map((n) => {
        switch (n.type) {
          case "solar": return <SolarFarm key={n.id} node={n} />;
          case "wind": return <WindFarm key={n.id} node={n} />;
          case "gas": return <GasPlant key={n.id} node={n} />;
          case "nuclear": return <NuclearPlant key={n.id} node={n} />;
          case "battery": return <BatteryBank key={n.id} node={n} />;
          case "grid": return <GridTie key={n.id} node={n} />;
          default: return null;
        }
      })}
    </group>
  );
}
