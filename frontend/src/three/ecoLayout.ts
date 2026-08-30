import * as THREE from "three";
import type { DCModel } from "../types/api";

export interface SourceNode {
  type: string;          // solar | wind | gas | nuclear | battery | grid
  id: string;
  pos: THREE.Vector3;    // ground position of the installation
  nameplate: number;     // MW (or MWh for battery)
}

// Fixed angular sectors (degrees on the XZ plane) + distance multipliers, so the
// DC sits at the centre of a legible ring of its energy sources.
const LAYOUT: Record<string, { angle: number; dist: number }> = {
  solar:   { angle: 40,  dist: 1.5 },
  wind:    { angle: 145, dist: 1.6 },
  battery: { angle: 95,  dist: 0.95 },
  gas:     { angle: 215, dist: 1.3 },
  nuclear: { angle: 300, dist: 1.4 },
  grid:    { angle: 250, dist: 1.8 },
};

export function ecoLayout(model: DCModel): SourceNode[] {
  const span = Math.max(model.hall_dims.x, model.hall_dims.z);
  const nodes: SourceNode[] = [];
  const place = (type: string, nameplate: number, id: string) => {
    const l = LAYOUT[type];
    const r = span * l.dist + 8;
    const a = (l.angle * Math.PI) / 180;
    nodes.push({ type, id, nameplate, pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r) });
  };
  for (const gs of model.gen_sources) if (gs.nameplate_mw > 0) place(gs.type, gs.nameplate_mw, gs.id);
  if (model.storage.length && model.storage[0].energy_mwh > 0) place("battery", model.storage[0].energy_mwh, "bat-0");
  // grid is always present (the utility interconnection)
  place("grid", model.grid.interconnect_mw, "grid-0");
  return nodes;
}

export const HALL_CENTER = new THREE.Vector3(0, 1.4, 0);
