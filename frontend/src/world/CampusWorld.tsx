import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { CouplingRequest, EnergyHour } from "../types/energy";
import {
  ASSETS, HUB, WATER_INTAKE, asset, assetCapacity, assetState, fmt, generation, liters, mw,
  type Asset, type AssetId, type Position, type WorldTab,
} from "./model";

interface WorldProps {
  request: CouplingRequest;
  hour: EnergyHour | null;
  tab: WorldTab;
  selection: AssetId;
  camera: { serial: number; target: AssetId };
  onSelect: (id: AssetId) => void;
}

function Box({ at, size, color, opacity = 1, glow = 0 }: {
  at: Position; size: Position; color: string; opacity?: number; glow?: number;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity}
        depthWrite={opacity >= 1} roughness={.65} metalness={.12}
        emissive={color} emissiveIntensity={glow} />
    </mesh>
  );
}

function Rotor({ at, speed, motion, size = 1 }: { at: Position; speed: number; motion: boolean; size?: number }) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (rotor.current && motion) rotor.current.rotation.z += dt * speed;
  });
  return (
    <group position={at} ref={rotor} scale={size}>
      <mesh><sphereGeometry args={[.18, 8, 8]} /><meshStandardMaterial color="#eaf4f5" /></mesh>
      {[0, 1, 2].map((blade) => <group key={blade} rotation={[0, 0, blade * Math.PI * 2 / 3]}>
        <Box at={[0, .9, 0]} size={[.13, 1.8, .08]} color="#d5e3e7" />
      </group>)}
    </group>
  );
}

function AssetShape({ item, request, hour, computeView, opacity, motion }: {
  item: Asset; request: CouplingRequest; hour: EnergyHour | null; computeView: boolean; opacity: number; motion: boolean;
}) {
  switch (item.id) {
    case "compute":
      return (
        <group>
          <Box at={[0, .15, 0]} size={[7.8, .3, 5.4]} color="#294755" opacity={opacity} />
          <Box at={[0, 1.3, -2.5]} size={[7.7, 2.4, .22]} color="#cad8d9" opacity={computeView ? .2 : opacity} />
          <Box at={[-3.8, 1.3, 0]} size={[.2, 2.4, 5.2]} color="#a7c0c6" opacity={computeView ? .2 : opacity} />
          <Box at={[3.8, 1.3, 0]} size={[.2, 2.4, 5.2]} color="#a7c0c6" opacity={computeView ? .2 : opacity} />
          {!computeView && <Box at={[0, 2.65, 0]} size={[8.2, .22, 5.6]} color="#75aeba" opacity={opacity} />}
          {Array.from({ length: 16 }, (_, index) => (
            <group key={index}>
              <Box at={[-2.7 + index % 4 * 1.7, 1, -1.65 + Math.floor(index / 4) * 1.1]}
                size={[.68, 1.6, .65]} color="#1d3343" opacity={opacity} />
              <Box at={[-2.7 + index % 4 * 1.7, 1.2, -1.31 + Math.floor(index / 4) * 1.1]}
                size={[.44, .1, .02]} color="#6cddcf" opacity={opacity}
                glow={hour ? hour.effective_utilization * .7 : 0} />
            </group>
          ))}
          <Box at={[0, .75, 2.63]} size={[7.2, .28, .04]} color="#72dae2" opacity={opacity} />
        </group>
      );
    case "solar":
      return <group>
        <Box at={[0, .1, 0]} size={[6, .2, 4]} color="#3b5353" opacity={opacity} />
        {Array.from({ length: 8 }, (_, index) => (
          <group key={index} position={[-2.15 + index % 4 * 1.45, .6, -.95 + Math.floor(index / 4) * 1.95]} rotation={[-.32, 0, 0]}>
            <Box at={[0, 0, 0]} size={[1.2, .1, 1.65]} color="#244f78" opacity={opacity} />
            <Box at={[0, .065, 0]} size={[.035, .02, 1.62]} color="#88adce" opacity={opacity} />
          </group>
        ))}
      </group>;
    case "wind":
      return <group>{[-1.8, 1.8].map((x) => (
        <group key={x} position={[x, 0, x > 0 ? -1 : 1]}>
          <mesh position={[0, 2.4, 0]}>
            <cylinderGeometry args={[.13, .24, 4.8, 8]} />
            <meshStandardMaterial color="#cbdde0" transparent opacity={opacity} />
          </mesh>
          <Rotor at={[0, 4.8, .2]} speed={hour ? generation("wind", hour) / Math.max(request.supply.wind_mw, .1) * 3 : 0}
            motion={motion} />
        </group>
      ))}</group>;
    case "hydro":
      return <group>
        <Box at={[0, .12, -1]} size={[5.4, .22, 4.8]} color="#267da2" opacity={opacity} />
        <Box at={[0, .7, .65]} size={[5.3, 1.4, .6]} color="#8babb5" opacity={opacity} />
        {[-1.6, 0, 1.6].map((x) => <Box key={x} at={[x, .5, 1.35]} size={[.65, .7, 1.2]} color="#48b9ec" opacity={opacity} />)}
        <Box at={[2.1, 1.2, -.3]} size={[1.7, 1.1, 1.8]} color="#d0e1dc" opacity={opacity} />
      </group>;
    case "battery": {
      const fill = hour ? Math.min(1, hour.battery_state_mwh / Math.max(request.supply.battery_energy_mwh, .1)) : 0;
      return <group>{[-1.8, -.6, .6, 1.8].map((x) => <group key={x}>
        <Box at={[x, .85, 0]} size={[.95, 1.7, 1.25]} color="#b6cfc7" opacity={opacity} />
        <Box at={[x, .2 + fill * .6, .65]} size={[.6, Math.max(.04, fill * 1.2), .03]}
          color="#36c88a" opacity={opacity} glow={.2} />
      </group>)}</group>;
    }
    case "grid":
      return <group>
        <Box at={[0, .14, 0]} size={[4.8, .28, 3.5]} color="#566776" opacity={opacity} />
        <Box at={[0, 1.1, 0]} size={[2, 1.8, 1.6]} color="#9badb5" opacity={opacity} />
        {[-1.7, 1.7].map((x) => <group key={x}>
          <Box at={[x, 2, 0]} size={[.17, 4, .17]} color="#b1c7d0" opacity={opacity} />
          <Box at={[x, 3.6, 0]} size={[1.1, .14, .2]} color="#b1c7d0" opacity={opacity} />
        </group>)}
      </group>;
    case "cooling":
      return <group>
        <Box at={[0, .12, 0]} size={[3.5, .2, 3.4]} color="#3e686b" opacity={opacity} />
        {[-.8, .8].map((x) => <group key={x}>
          <Box at={[x, .8, 0]} size={[1.3, 1.4, 2.5]} color="#adced0" opacity={opacity} />
          <mesh position={[x, 1.54, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[.25, .47, 16]} />
            <meshStandardMaterial color="#1b4b59" side={THREE.DoubleSide} transparent opacity={opacity} />
          </mesh>
        </group>)}
      </group>;
    case "gas":
      return <group>
        <Box at={[0, .9, 0]} size={[3.4, 1.8, 2.4]} color="#a68e7e" opacity={opacity} />
        {[-.9, .9].map((x) => <Box key={x} at={[x, 2, -.55]} size={[.4, 2.8, .4]} color="#c2b7a4" opacity={opacity} />)}
      </group>;
    case "nuclear":
      return <group>
        <Box at={[0, .2, 0]} size={[4.5, .4, 3.5]} color="#6c6881" opacity={opacity} />
        <mesh position={[-.6, .25, 0]}><sphereGeometry args={[1.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#c9c7dc" transparent opacity={opacity} /></mesh>
        <Box at={[1.5, .8, 0]} size={[1.8, 1.2, 2.8]} color="#b3acc9" opacity={opacity} />
      </group>;
    default: return null;
  }
}

function Flow({ from, to, amount, color, motion, water = false, dim = false }: {
  from: Position; to: Position; amount: number; color: string; motion: boolean; water?: boolean; dim?: boolean;
}) {
  const marker = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from).add(new THREE.Vector3(0, .8, 0));
    const end = new THREE.Vector3(...to).add(new THREE.Vector3(0, .8, 0));
    return new THREE.QuadraticBezierCurve3(start, start.clone().lerp(end, .5).add(new THREE.Vector3(0, water ? .2 : 1.8, 0)), end);
  }, [from, to, water]);
  const points = useMemo(() => curve.getPoints(28), [curve]);
  const active = amount > .000001;
  useFrame(({ clock }) => {
    if (!marker.current || !active) return;
    const position = motion ? (clock.elapsedTime * .13) % 1 : .6;
    marker.current.position.copy(curve.getPoint(position));
    marker.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), curve.getTangent(position).normalize(),
    );
  });
  return <group>
    <Line points={points} color={color} lineWidth={active ? water ? 2 : Math.min(4, 1.4 + Math.sqrt(amount) * .4) : 1}
      transparent opacity={dim ? .1 : active ? .85 : .13} dashed={water || !active} dashSize={.35} gapSize={.2} />
    {active && !dim && <mesh ref={marker}>
      <coneGeometry args={[water ? .13 : .18, .48, 5]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>}
  </group>;
}

function CameraGuide({ command, controls }: {
  command: WorldProps["camera"]; controls: RefObject<ComponentRef<typeof OrbitControls>>;
}) {
  const { camera, size } = useThree();
  const animation = useRef({
    t: 1, from: new THREE.Vector3(), to: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(), target: new THREE.Vector3(), fromZoom: 1, zoom: 1,
  });
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const state = animation.current;
    const position = asset(command.target).position;
    const target = new THREE.Vector3(position[0], 1, position[2]);
    state.from.copy(camera.position); state.fromTarget.copy(controls.current?.target ?? new THREE.Vector3());
    state.target.copy(target);
    state.to.copy(target).add(new THREE.Vector3(27, 25, 32));
    state.fromZoom = camera.zoom;
    state.zoom = Math.max(7, Math.min(size.width / 43, size.height / 32))
      * (command.target === "campus" ? 1 : command.target === "compute" ? 2.15 : 1.7);
    state.t = 0;
  }, [command.serial, command.target, size.width, size.height, camera, controls]);
  useFrame((_, dt) => {
    const state = animation.current;
    if (state.t >= 1 || !(camera instanceof THREE.OrthographicCamera)) return;
    state.t = Math.min(1, state.t + dt * 2);
    const progress = state.t * state.t * (3 - 2 * state.t);
    camera.position.lerpVectors(state.from, state.to, progress);
    camera.zoom = THREE.MathUtils.lerp(state.fromZoom, state.zoom, progress);
    camera.updateProjectionMatrix();
    controls.current?.target.lerpVectors(state.fromTarget, state.target, progress);
    controls.current?.update();
  });
  return null;
}

function WorldScene(props: WorldProps & { motion: boolean }) {
  const { request, hour, selection, tab, onSelect, motion } = props;
  const compact = useThree((state) => state.size.width < 600);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const waterView = tab === "water";
  const computeView = tab === "compute";
  const displayed = ASSETS.filter((item) => item.id !== "campus" && (
    !["gas", "nuclear"].includes(item.id) || assetCapacity(request, item.id) > 0 || item.id === selection || tab === "design"
  ));
  return (
    <>
      <color attach="background" args={["#152b3b"]} />
      <ambientLight intensity={1.0} />
      <hemisphereLight args={["#d4eff6", "#456b68", 1.2]} />
      <directionalLight position={[12, 25, 15]} color="#fff0d5" intensity={1.8} />
      <Box at={[0, -.25, 0]} size={[36, .5, 29]} color="#355259" />
      <Box at={[0, .03, 5.5]} size={[30, .04, .6]} color="#73818a" />
      <Box at={[5, .04, -1]} size={[.65, .03, 22]} color="#73818a" />
      <Box at={HUB} size={[1.7, 1.3, 1.2]} color="#91bec6" />
      <Html position={[HUB[0], 2.15, HUB[2]]} center zIndexRange={[8, 0]}>
        <span className="world-hub-label">POWER BUS</span>
      </Html>
      {displayed.map((item) => {
        const configured = assetCapacity(request, item.id) > 0;
        const relevant = item.id === selection || tab === "overview" || tab === "design" || tab === "compare"
          || (waterView ? item.id === "cooling" || item.id === "hydro"
            : computeView ? item.id === "compute" : item.id !== "cooling");
        const opacity = !configured ? .25 : relevant ? 1 : .4;
        const value = !hour ? "Draft / planned" : item.id === "cooling"
          ? `${liters(hour.cooling_water_consumption_l)} required`
          : item.id === "battery" ? `${fmt(hour.battery_state_mwh, 1)} MWh stored`
            : item.id === "compute" ? `${mw(hour.it_power_mw)} IT`
            : `${mw(Math.abs(generation(item.id, hour)))}`;
        const height = item.id === "wind" ? 7.3 : item.id === "grid" ? 2.8
          : item.id === "cooling" ? 4.1 : item.id === "compute" ? 3.8 : 3.1;
        const showLabel = computeView ? item.id === "compute" : !compact
          || (waterView ? item.id === "cooling" || item.id === "hydro"
            : tab === "design" ? item.id === selection : item.id !== "cooling" || item.id === selection);
        const labelPosition: Position = compact && item.id === "solar" ? [-1.6, height + 1, 0] : [0, height, 0];
        return (
          <group key={item.id} position={item.position}
            onClick={(event) => { event.stopPropagation(); onSelect(item.id); }}
            onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { document.body.style.cursor = ""; }}>
            <AssetShape item={item} request={request} hour={hour} opacity={opacity} computeView={computeView} motion={motion} />
            {item.id === selection && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .08, 0]}>
              <ringGeometry args={[item.id === "compute" ? 4.9 : 3.05, item.id === "compute" ? 5.02 : 3.17, 48]} />
              <meshBasicMaterial color={item.color} transparent opacity={.9} side={THREE.DoubleSide} />
            </mesh>}
            {showLabel && <Html position={labelPosition} center zIndexRange={[15, 0]}>
              <button className={`world-asset-label ${compact ? "compact" : ""} ${selection === item.id ? "selected" : ""} ${!configured ? "unbuilt" : ""}`}
                style={{ borderColor: item.color }} data-testid={`asset-label-${item.id}`}
                aria-label={`Inspect ${item.name}`} onClick={(event) => { event.stopPropagation(); onSelect(item.id); }}>
                <b style={{ color: item.color }}>{item.name}</b>
                <strong>{configured ? value : "Not configured"}</strong>
                <small>{assetState(request, hour, item.id)}</small>
              </button>
            </Html>}
          </group>
        );
      })}
      {hour && <>
        {displayed.filter((item) => ["solar", "wind", "hydro", "nuclear", "gas"].includes(item.id)).map((item) => (
          <Flow key={item.id} from={item.position} to={HUB} amount={generation(item.id, hour)}
            color={item.color} motion={motion} dim={waterView || computeView} />
        ))}
        <Flow from={hour.battery_charge_mw > 0 ? HUB : asset("battery").position}
          to={hour.battery_charge_mw > 0 ? asset("battery").position : HUB}
          amount={hour.battery_charge_mw + hour.battery_to_load_mw} color={asset("battery").color}
          motion={motion} dim={waterView || computeView} />
        <Flow from={hour.grid_export_mw > 0 ? HUB : asset("grid").position}
          to={hour.grid_export_mw > 0 ? asset("grid").position : HUB}
          amount={hour.grid_export_mw + hour.grid_to_load_mw} color={asset("grid").color}
          motion={motion} dim={waterView || computeView} />
        <Flow from={HUB} to={asset("compute").position} amount={hour.required_load_mw - hour.unserved_mw}
          color="#e6f6f9" motion={motion} dim={waterView} />
      </>}
      {(waterView || selection === "cooling") && <>
        <Box at={WATER_INTAKE} size={[2.2, .4, 2.2]} color="#4babb9" />
        <Html position={[WATER_INTAKE[0], 1.4, WATER_INTAKE[2]]} center zIndexRange={[10, 0]}>
          <span className="world-hub-label">WATER SUPPLY<br />Schematic connection</span>
        </Html>
        <Flow from={WATER_INTAKE} to={asset("cooling").position}
          amount={hour?.cooling_water_withdrawal_l ?? 0} color="#65f1f0" water motion={motion} />
      </>}
      <OrbitControls ref={controls} makeDefault enablePan={false} minZoom={6} maxZoom={65}
        minPolarAngle={.35} maxPolarAngle={1.35} enableDamping dampingFactor={.12} />
      <CameraGuide command={props.camera} controls={controls} />
    </>
  );
}

export function CampusWorld(props: WorldProps) {
  const [motion, setMotion] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setMotion(!query.matches);
    query.addEventListener("change", change);
    return () => { query.removeEventListener("change", change); document.body.style.cursor = ""; };
  }, []);
  return (
    <Canvas orthographic dpr={[1, 1.5]} camera={{ position: [27, 26, 32], zoom: 18, near: .1, far: 150 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1 }}>
      <WorldScene {...props} motion={motion} />
    </Canvas>
  );
}
