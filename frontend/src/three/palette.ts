import * as THREE from "three";
import type { GpuTelemetry, OverlayName, RackTelemetry } from "../types/api";

type Stop = [number, [number, number, number]];

// Vivid, colour-preserving ramps. Emissive is kept moderate so bloom adds a glow
// without blowing the colour out to white. Clean = emerald/teal, dirty = amber/coral.
const RAMPS: Record<string, Stop[]> = {
  thermal: [
    [0.0, [0.18, 0.5, 1.0]], [0.35, [0.12, 0.85, 0.92]],
    [0.65, [1.0, 0.8, 0.22]], [1.0, [1.0, 0.28, 0.36]],
  ],
  util: [
    [0.0, [0.24, 0.3, 0.46]], [0.45, [0.13, 0.82, 0.72]], [1.0, [1.0, 0.72, 0.2]],
  ],
  carbon: [
    [0.0, [0.1, 0.92, 0.6]], [0.45, [0.36, 0.66, 0.78]], [0.75, [0.95, 0.58, 0.24]], [1.0, [1.0, 0.32, 0.34]],
  ],
  power: [
    [0.0, [0.14, 0.2, 0.38]], [0.5, [0.24, 0.62, 1.0]], [1.0, [0.4, 0.92, 1.0]],
  ],
};

function sample(ramp: Stop[], t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < ramp.length - 1; i++) {
    const [t0, c0] = ramp[i];
    const [t1, c1] = ramp[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return ramp[ramp.length - 1][1];
}

const norm = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo);
const tmp = (c: [number, number, number]) => new THREE.Color(c[0], c[1], c[2]);

export interface Appearance { color: THREE.Color; emissive: number; opacity: number; }

export function rackAppearance(overlay: OverlayName, rt: RackTelemetry, cue: number): Appearance {
  switch (overlay) {
    case "temperature": {
      const t = norm(rt.outlet_c, 22, 72);
      return { color: tmp(sample(RAMPS.thermal, t)), emissive: 0.12 + t * 0.45, opacity: 1 };
    }
    case "power": {
      const t = norm(rt.pct_capacity, 0, 100);
      return { color: tmp(sample(RAMPS.power, t)), emissive: 0.1 + t * 0.5, opacity: 1 };
    }
    case "utilization": {
      const t = rt.util;
      return { color: tmp(sample(RAMPS.util, t)), emissive: 0.1 + t * 0.4, opacity: 1 };
    }
    case "idle":
      return rt.util < 0.05
        ? { color: new THREE.Color(0.16, 0.19, 0.26), emissive: 0.0, opacity: 0.45 }
        : { color: new THREE.Color(0.12, 0.85, 0.68), emissive: 0.5, opacity: 1 };
    case "carbon":
    default: {
      const t = norm(cue, 20, 450);
      return { color: tmp(sample(RAMPS.carbon, t)), emissive: 0.2 + t * 0.4, opacity: 1 };
    }
  }
}

export function gpuAppearance(overlay: OverlayName, g: GpuTelemetry, tdp: number, cue: number): Appearance {
  switch (overlay) {
    case "temperature": {
      const t = norm(g.temp_c, 25, 82);
      return { color: tmp(sample(RAMPS.thermal, t)), emissive: 0.15 + t * 0.5, opacity: 1 };
    }
    case "power": {
      const t = norm(g.power_w, tdp * 0.3, tdp);
      return { color: tmp(sample(RAMPS.power, t)), emissive: 0.12 + t * 0.55, opacity: 1 };
    }
    case "utilization":
      return { color: tmp(sample(RAMPS.util, g.util)), emissive: 0.12 + g.util * 0.45, opacity: 1 };
    case "idle":
      return g.idle
        ? { color: new THREE.Color(0.16, 0.19, 0.26), emissive: 0.0, opacity: 0.35 }
        : { color: new THREE.Color(0.12, 0.88, 0.7), emissive: 0.6, opacity: 1 };
    case "carbon":
    default: {
      const t = norm(cue, 20, 450);
      return { color: tmp(sample(RAMPS.carbon, t)), emissive: g.idle ? 0.08 : 0.28 + t * 0.35, opacity: g.idle ? 0.5 : 1 };
    }
  }
}

// Carbon -> color for environment / impact domes (clean emerald -> dirty coral)
export function carbonColor(cue: number): THREE.Color {
  return tmp(sample(RAMPS.carbon, norm(cue, 20, 500)));
}

export const SOURCE_COLORS: Record<string, string> = {
  solar: "#ffce3a", wind: "#5fd0ff", gas: "#c9743f", nuclear: "#b98bff",
  battery: "#37e2a0", grid: "#8fa0b5", import: "#8fa0b5", export: "#ffce3a",
};
export const SOURCE_COLOR3: Record<string, THREE.Color> = Object.fromEntries(
  Object.entries(SOURCE_COLORS).map(([k, v]) => [k, new THREE.Color(v)]),
);

export const OVERLAY_LEGEND: Record<OverlayName, { label: string; lo: string; hi: string; ramp: string }> = {
  temperature: { label: "Temperature", lo: "22°C", hi: "72°C", ramp: "linear-gradient(90deg,#2673ff,#1ad9f2,#ffd133,#ff4059)" },
  power:       { label: "Power intensity", lo: "0%", hi: "100%", ramp: "linear-gradient(90deg,#1a2952,#3399ff,#59f2ff)" },
  utilization: { label: "Utilization", lo: "idle", hi: "busy", ramp: "linear-gradient(90deg,#38476b,#1ad9bf,#ffb826)" },
  carbon:      { label: "Carbon intensity", lo: "clean", hi: "dirty", ramp: "linear-gradient(90deg,#0df29e,#59a0bf,#f28c33,#ff4759)" },
  idle:        { label: "Idle / stranded", lo: "idle", hi: "active", ramp: "linear-gradient(90deg,#2a3142,#1ae6b8)" },
};
