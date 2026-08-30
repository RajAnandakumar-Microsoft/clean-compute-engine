import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GpuTelemetry } from "../types/api";
import { useStore } from "../data/store";
import { gpuAppearance } from "./palette";

const GPU_GEO = new THREE.BoxGeometry(0.36, 0.34, 0.36);
const SHELF_GEO = new THREE.BoxGeometry(1, 0.05, 0.7);

function GpuUnit({ g, tdp, overlay, cue, pos, selected, onSelect }: any) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  const app = gpuAppearance(overlay, g, tdp, cue);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.color.lerp(app.color, 0.3);
    ref.current.emissive.lerp(app.color, 0.3);
    ref.current.emissiveIntensity += (app.emissive - ref.current.emissiveIntensity) * 0.25;
    ref.current.opacity += (app.opacity - ref.current.opacity) * 0.25;
  });
  return (
    <mesh geometry={GPU_GEO} position={pos} scale={selected ? 1.35 : 1}
      onClick={(e) => { e.stopPropagation(); onSelect("gpu", g.id); }}>
      <meshStandardMaterial ref={ref} roughness={0.3} metalness={0.4}
        emissive={app.color} emissiveIntensity={app.emissive}
        transparent opacity={app.opacity} />
      {selected && (
        <mesh geometry={GPU_GEO} scale={1.25}>
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}
    </mesh>
  );
}

// Isolated "exploded" view of a single rack: servers as shelves, GPUs as glowing
// units. The rack field is hidden while this shows, so nothing overlaps.
export function DetailView() {
  const model = useStore((s) => s.model)!;
  const frame = useStore((s) => s.frame);
  const overlay = useStore((s) => s.overlay);
  const selection = useStore((s) => s.selection);
  const select = useStore((s) => s.select);

  const rackId = selection.kind === "rack" ? selection.id
    : selection.kind === "server" || selection.kind === "gpu"
    ? selection.id.split("-srv-")[0] : null;

  const rack = rackId ? model.racks.find((r) => r.id === rackId) : null;
  const tdp = useMemo(() => model.gpus.find((g) => g.rack_id === rackId)?.tdp_w ?? 700, [model, rackId]);

  if (!rack || !frame || frame.detail_rack_id !== rackId) return null;

  const perServer = model.config.it_build.gpus_per_server;
  const nServers = model.config.it_build.servers_per_rack;
  const gapX = 0.5, gapY = 0.62;
  const cx = rack.pos.x, cz = rack.pos.z;
  const baseY = 0.6;
  const rowW = (perServer - 1) * gapX;
  const stackH = (nServers - 1) * gapY;

  const parse = (g: GpuTelemetry) => {
    const m = g.id.match(/-srv-(\d+)-gpu-(\d+)$/);
    return m ? { srv: +m[1], gpu: +m[2] } : { srv: 0, gpu: 0 };
  };

  return (
    <group>
      {/* glowing platform */}
      <mesh position={[cx, 0.03, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.max(rowW, stackH) * 0.9 + 1.4, 48]} />
        <meshStandardMaterial color="#0b1524" emissive="#123" emissiveIntensity={0.5} roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[cx, 0.05, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(rowW, stackH) * 0.9 + 1.35, Math.max(rowW, stackH) * 0.9 + 1.5, 64]} />
        <meshBasicMaterial color="#2ad6ff" toneMapped={false} transparent opacity={0.6} />
      </mesh>

      {/* chassis frame */}
      <mesh position={[cx, baseY + stackH / 2, cz]}>
        <boxGeometry args={[rowW + 1.1, stackH + 1.1, 1.2]} />
        <meshBasicMaterial color="#2a4a66" wireframe transparent opacity={0.35} />
      </mesh>

      {/* server shelves */}
      {Array.from({ length: nServers }).map((_, s) => {
        const serverId = `${rackId}-srv-${String(s).padStart(2, "0")}`;
        const sel = selection.kind === "server" && selection.id === serverId;
        return (
          <mesh key={s} geometry={SHELF_GEO} position={[cx, baseY + s * gapY - 0.28, cz]}
            scale={[rowW + 0.8, 1, 1]}
            onClick={(e) => { e.stopPropagation(); select("server", serverId); }}>
            <meshStandardMaterial color={sel ? "#1d5673" : "#0f1a2a"} emissive={sel ? "#1a4a66" : "#0a1220"}
              emissiveIntensity={sel ? 0.8 : 0.2} roughness={0.6} metalness={0.5} />
          </mesh>
        );
      })}

      {/* GPUs */}
      {frame.gpus.map((g) => {
        const { srv, gpu } = parse(g);
        const pos: [number, number, number] = [cx - rowW / 2 + gpu * gapX, baseY + srv * gapY, cz];
        return (
          <GpuUnit key={g.id} g={g} tdp={tdp} overlay={overlay} cue={frame.kpis.cue} pos={pos}
            selected={selection.kind === "gpu" && selection.id === g.id} onSelect={select} />
        );
      })}

      <Html position={[cx, baseY + stackH + 0.9, cz]} center distanceFactor={14}>
        <div className="tooltip"><b>{rackId}</b> · {nServers} servers · {frame.gpus.length} GPUs</div>
      </Html>
    </group>
  );
}
