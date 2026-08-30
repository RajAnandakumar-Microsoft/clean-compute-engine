import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { CoolingType } from "../types/api";
import type { StoryForecastOutcome } from "./forecast";
import type { WorldSignals, WorkloadChoice } from "./model";

type Position = [number, number, number];

interface VoxelWorldProps {
  stage: number;
  year: number;
  hour: number;
  workload: WorkloadChoice;
  cooling: CoolingType;
  signals: WorldSignals;
  result: StoryForecastOutcome | null;
  onBuild: () => void;
}

interface BlockProps {
  position: Position;
  size?: Position;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  rotation?: Position;
  onClick?: () => void;
}

function Block({
  position,
  size = [1, 1, 1],
  color,
  emissive = "#000000",
  emissiveIntensity = 0,
  opacity = 1,
  rotation = [0, 0, 0],
  onClick,
}: BlockProps) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onPointerOver={() => {
        if (onClick) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (onClick) document.body.style.cursor = "default";
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={0.72}
      />
    </mesh>
  );
}

function Terrain() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(0.98, 1, 0.98), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }),
    [],
  );
  const tiles = useMemo(() => {
    const values: { position: Position; color: THREE.Color }[] = [];
    for (let x = -15; x <= 15; x += 1) {
      for (let z = -11; z <= 11; z += 1) {
        const river = x === -11 || x === -10 || (x === -9 && z > 4);
        const site = x >= -5 && x <= 6 && z >= -4 && z <= 4;
        const variation = ((x * 17 + z * 31 + 200) % 7) / 100;
        const elevation = site ? 0 : variation;
        values.push({
          position: [x, river ? -0.72 : -0.50 + elevation, z],
          color: new THREE.Color(
            river
              ? (z % 2 === 0 ? "#226d91" : "#287da4")
              : site
                ? "#63705a"
                : (x + z) % 3 === 0
                  ? "#496b45"
                  : "#53774b",
          ),
        });
      }
    }
    return values;
  }, []);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new THREE.Object3D();
    tiles.forEach((tile, index) => {
      object.position.set(...tile.position);
      object.updateMatrix();
      mesh.current?.setMatrixAt(index, object.matrix);
      mesh.current?.setColorAt(index, tile.color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [tiles]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, tiles.length]}
      receiveShadow
    />
  );
}

function Tree({ position, scale = 1 }: { position: Position; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Block position={[0, 0.65, 0]} size={[0.34, 1.3, 0.34]} color="#6c4a2f" />
      <Block position={[0, 1.50, 0]} size={[1.2, 0.72, 1.2]} color="#2f6f42" />
      <Block position={[0, 2.05, 0]} size={[0.82, 0.60, 0.82]} color="#3d8450" />
    </group>
  );
}

function Forest() {
  const trees = useMemo(() => {
    const positions: Position[] = [];
    for (let index = 0; index < 34; index += 1) {
      const x = -7 + ((index * 7) % 21);
      const z = 6 + ((index * 11) % 5);
      if (x > -3 && x < 6 && z < 8) continue;
      positions.push([x, 0, z]);
    }
    return positions;
  }, []);
  return (
    <group>
      {trees.map((position, index) => (
        <Tree
          key={`${position[0]}-${position[2]}-${index}`}
          position={position}
          scale={0.75 + (index % 4) * 0.08}
        />
      ))}
    </group>
  );
}

function House({ position, color }: { position: Position; color: string }) {
  return (
    <group position={position}>
      <Block position={[0, 0.65, 0]} size={[1.7, 1.3, 1.45]} color={color} />
      <Block
        position={[0, 1.55, 0]}
        size={[1.9, 0.50, 1.65]}
        color="#4e3a38"
        rotation={[0, 0, Math.PI / 4]}
      />
      <Block
        position={[0, 0.68, 0.735]}
        size={[0.36, 0.68, 0.05]}
        color="#20334a"
        emissive="#ffd86b"
        emissiveIntensity={0.45}
      />
    </group>
  );
}

function Community({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <group>
      <House position={[-7.0, 0, -6.6]} color="#c7a56d" />
      <House position={[-4.6, 0, -7.4]} color="#b97e68" />
      <House position={[-2.2, 0, -6.4]} color="#8da6b8" />
      <House position={[-6.0, 0, -9.1]} color="#9dba86" />
      <Html position={[-5.0, 3.0, -7.2]} center>
        <div className="voxel-label quiet">COMMUNITY</div>
      </Html>
    </group>
  );
}

function Waterway() {
  return (
    <group>
      <Html position={[-10.5, 1.1, 5.0]} center>
        <div className="voxel-label quiet">WATERSHED</div>
      </Html>
      {Array.from({ length: 10 }, (_, index) => (
        <Block
          key={index}
          position={[-10.5, 0.04, -8.5 + index * 1.7]}
          size={[1.8, 0.08, 1.2]}
          color="#3ca4cb"
          emissive="#1c7da8"
          emissiveIntensity={0.2}
          opacity={0.72}
        />
      ))}
    </group>
  );
}

function BuildPad({ onBuild }: { onBuild: () => void }) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.emissiveIntensity = 0.35 + Math.sin(clock.elapsedTime * 2.2) * 0.18;
  });
  return (
    <group>
      <mesh
        position={[0, 0.08, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onBuild();
        }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        <boxGeometry args={[8.5, 0.16, 6.4]} />
        <meshStandardMaterial
          ref={material}
          color="#477080"
          emissive="#35c8ff"
          transparent
          opacity={0.72}
        />
      </mesh>
      <Html position={[0, 0.6, 0]} center>
        <button
          className="voxel-action"
          onClick={(event) => {
            event.stopPropagation();
            onBuild();
          }}
        >
          PLACE PHASE 1 · 20 MW
        </button>
      </Html>
    </group>
  );
}

function ServerLight({
  position,
  utilization,
  opacity,
  offset,
}: {
  position: Position;
  utilization: number;
  opacity: number;
  offset: number;
}) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!material.current) return;
    const pulse = 0.82 + Math.sin(clock.elapsedTime * 2.8 + offset) * 0.18;
    material.current.emissiveIntensity = (0.45 + utilization * 1.8) * pulse;
  });
  return (
    <mesh position={position}>
      <boxGeometry args={[0.54, 0.28, 0.06]} />
      <meshStandardMaterial
        ref={material}
        color="#56d6ff"
        emissive="#25c9ff"
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

function Hall({
  position,
  utilization,
  cooling,
  refreshed,
  opacity,
  compact,
}: {
  position: Position;
  utilization: number;
  cooling: CoolingType;
  refreshed: boolean;
  opacity: number;
  compact: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  useFrame((_, delta) => {
    progress.current = Math.min(1, progress.current + delta * 0.75);
    if (group.current) {
      const eased = progress.current * progress.current * (3 - 2 * progress.current);
      group.current.scale.y = Math.max(0.01, eased);
    }
  });
  const width = compact ? 4.1 : 6.4;
  const depth = compact ? 2.7 : 4.2;
  const height = compact ? 1.8 : 2.5;
  return (
    <group ref={group} position={position}>
      <Block
        position={[0, height / 2, 0]}
        size={[width, height, depth]}
        color="#d7e0df"
        opacity={opacity}
      />
      <Block
        position={[0, height + 0.16, 0]}
        size={[width + 0.18, 0.22, depth + 0.18]}
        color={refreshed ? "#38b8cf" : "#526a72"}
        emissive={refreshed ? "#1ed6ee" : "#000000"}
        emissiveIntensity={refreshed ? 0.38 : 0}
        opacity={opacity}
      />
      {Array.from({ length: compact ? 5 : 8 }, (_, index) => (
        <ServerLight
          key={index}
          position={[
            -width / 2 + 0.65 + index * ((width - 1.3) / (compact ? 4 : 7)),
            height * 0.58,
            depth / 2 + 0.035,
          ]}
          utilization={utilization}
          opacity={opacity}
          offset={index * 0.7}
        />
      ))}
      {cooling === "air" ? (
        <>
          {[-1.7, 0, 1.7].map((x) => (
            <mesh key={x} position={[x * (compact ? 0.65 : 1), height + 0.47, 0]}>
              <cylinderGeometry args={[0.46, 0.46, 0.36, 12]} />
              <meshStandardMaterial color="#667981" metalness={0.35} roughness={0.6} />
            </mesh>
          ))}
        </>
      ) : (
        <Line
          points={[
            [-width / 2 - 0.20, 0.55, depth / 2 + 0.12],
            [width / 2 + 0.20, 0.55, depth / 2 + 0.12],
            [width / 2 + 0.20, 1.10, depth / 2 + 0.12],
          ]}
          color="#24a9e8"
          lineWidth={3}
          transparent
          opacity={opacity}
        />
      )}
    </group>
  );
}

function DataCenter({
  position,
  capacityMw,
  utilization,
  cooling,
  refreshed,
  label,
  detail,
  opacity = 1,
  scale = 1,
  compact = false,
}: {
  position: Position;
  capacityMw: number;
  utilization: number;
  cooling: CoolingType;
  refreshed: boolean;
  label: string;
  detail?: string;
  opacity?: number;
  scale?: number;
  compact?: boolean;
}) {
  const phaseTwo = capacityMw > 20;
  return (
    <group position={position} scale={scale}>
      <Hall
        position={phaseTwo ? [0, 0, 1.55] : [0, 0, 0]}
        utilization={utilization}
        cooling={cooling}
        refreshed={refreshed}
        opacity={opacity}
        compact={compact}
      />
      {phaseTwo && (
        <Hall
          position={[0, 0, -1.55]}
          utilization={utilization * 0.94}
          cooling={cooling}
          refreshed={refreshed}
          opacity={opacity}
          compact={compact}
        />
      )}
      <Block
        position={[compact ? -2.5 : -3.8, 0.65, 0]}
        size={[0.8, 1.3, 1.5]}
        color="#314a56"
        emissive="#2bc8ff"
        emissiveIntensity={0.22}
        opacity={opacity}
      />
      <Html position={[0, compact ? 3.4 : 4.4, 0]} center>
        <div className="voxel-label">
          <b>{label}</b>
          <span>{detail ?? `${capacityMw} MW · ${(utilization * 100).toFixed(0)}% utilized`}</span>
        </div>
      </Html>
    </group>
  );
}

function EnergyParticle({
  index,
  color,
  active,
}: {
  index: number;
  color: string;
  active: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = (clock.elapsedTime * 0.16 + index / 7) % 1;
    const start = new THREE.Vector3(10, 1.9, -4.8);
    const end = new THREE.Vector3(3.4, 0.7, 0);
    mesh.current.position.lerpVectors(start, end, t);
    mesh.current.position.y += Math.sin(t * Math.PI) * 1.7;
    mesh.current.scale.setScalar(active ? 0.12 + t * 0.05 : 0);
  });
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function GridInfrastructure({
  connected,
  gridCarbon,
}: {
  connected: boolean;
  gridCarbon: number;
}) {
  const color = gridCarbon < 220 ? "#48e0a4" : gridCarbon < 390 ? "#f2bd45" : "#ff765d";
  return (
    <group>
      <group position={[10, 0, -5]}>
        <Block position={[0, 0.45, 0]} size={[3.0, 0.9, 2.2]} color="#3d4b52" />
        {[-0.85, 0, 0.85].map((x) => (
          <Block
            key={x}
            position={[x, 1.3, 0]}
            size={[0.42, 1.0, 0.42]}
            color="#77858c"
          />
        ))}
        <Html position={[0, 2.7, 0]} center>
          <div className="voxel-label quiet">REGIONAL GRID</div>
        </Html>
      </group>
      <Line
        points={[[10, 1.9, -4.8], [7.3, 3.0, -3.2], [3.4, 0.7, 0]]}
        color={color}
        lineWidth={connected ? 3 : 1}
        transparent
        opacity={connected ? 0.88 : 0.28}
      />
      {Array.from({ length: 7 }, (_, index) => (
        <EnergyParticle
          key={index}
          index={index}
          color={color}
          active={connected}
        />
      ))}
    </group>
  );
}

function ImpactColumn({
  position,
  height,
  color,
  opacity = 0.7,
}: {
  position: Position;
  height: number;
  color: string;
  opacity?: number;
}) {
  return (
    <group position={position}>
      <Block
        position={[0, height / 2, 0]}
        size={[0.62, height, 0.62]}
        color={color}
        emissive={color}
        emissiveIntensity={0.35}
        opacity={opacity}
      />
    </group>
  );
}

function FutureWorlds({
  result,
  signals,
  cooling,
}: {
  result: StoryForecastOutcome;
  signals: WorldSignals;
  cooling: CoolingType;
}) {
  const horizon = result.scenario;
  const carbon = horizon.cumulative_operational_carbon_t;
  const maximum = Math.max(carbon.p90, 1);
  const futures = [
    { label: "P10 · LOWER", value: carbon.p10, x: -7, color: "#48e0a4", opacity: 0.38 },
    { label: "P50 · EXPECTED", value: carbon.p50, x: 0, color: "#39bff2", opacity: 0.62 },
    { label: "P90 · HIGHER", value: carbon.p90, x: 7, color: "#ff8b62", opacity: 0.42 },
  ];
  return (
    <group>
      {futures.map((future) => (
        <group key={future.label} position={[future.x, 0, 0]}>
          <DataCenter
            position={[0, 0, 0]}
            capacityMw={signals.installedItMw}
            utilization={signals.utilization}
            cooling={cooling}
            refreshed={signals.refreshed}
            label={future.label}
            detail={`${(future.value / 1000).toFixed(1)} kt carbon`}
            opacity={future.opacity}
            scale={0.60}
            compact
          />
          <ImpactColumn
            position={[2.1, 0, 1.3]}
            height={1.2 + future.value / maximum * 3.8}
            color={future.color}
            opacity={future.opacity + 0.18}
          />
        </group>
      ))}
    </group>
  );
}

function ComparisonWorlds({
  result,
  signals,
  cooling,
}: {
  result: StoryForecastOutcome;
  signals: WorldSignals;
  cooling: CoolingType;
}) {
  const scenario = result.scenario;
  const baseline = result.baseline;
  const maximum = Math.max(
    scenario.cumulative_operational_carbon_t.p50,
    baseline.cumulative_operational_carbon_t.p50,
  );
  return (
    <group>
      <DataCenter
        position={[-5.0, 0, 0]}
        capacityMw={signals.installedItMw}
        utilization={signals.utilization}
        cooling={cooling}
        refreshed={signals.refreshed}
        label="PROPOSED WORLD"
        detail={`${(scenario.cumulative_operational_carbon_t.p50 / 1000).toFixed(1)} kt P50 carbon`}
        scale={0.78}
        compact
      />
      <ImpactColumn
        position={[-1.9, 0, 1.2]}
        height={1 + scenario.cumulative_operational_carbon_t.p50 / maximum * 4.4}
        color="#48e0a4"
      />
      <DataCenter
        position={[5.0, 0, 0]}
        capacityMw={signals.installedItMw}
        utilization={signals.utilization}
        cooling="air"
        refreshed={false}
        label="BASELINE WORLD"
        detail={`${(baseline.cumulative_operational_carbon_t.p50 / 1000).toFixed(1)} kt P50 carbon`}
        scale={0.78}
        compact
      />
      <ImpactColumn
        position={[8.1, 0, 1.2]}
        height={1 + baseline.cumulative_operational_carbon_t.p50 / maximum * 4.4}
        color="#ff765d"
      />
      <Line
        points={[[0, 0.05, -5], [0, 0.05, 5]]}
        color="#91a3b0"
        lineWidth={1}
        dashed
        transparent
        opacity={0.6}
      />
    </group>
  );
}

function Sky({ hour }: { hour: number }) {
  const daylight = Math.max(0, Math.sin((hour - 6) / 12 * Math.PI));
  const background = new THREE.Color("#07111e").lerp(
    new THREE.Color("#79b7cd"),
    daylight * 0.75,
  );
  const sunX = -13 + hour / 24 * 26;
  const sunY = 4 + daylight * 12;
  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 26, 60]} />
      <mesh position={[sunX, sunY, -14]}>
        <sphereGeometry args={[0.85, 16, 16]} />
        <meshBasicMaterial
          color={daylight > 0.08 ? "#ffe18a" : "#b7cff5"}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

function WorldScene(props: VoxelWorldProps) {
  const built = props.stage >= 1;
  const showFutureWorlds = props.stage === 3 && props.result;
  const showComparison = props.stage === 4 && props.result;
  return (
    <>
      <Sky hour={props.hour} />
      <ambientLight intensity={0.62} />
      <hemisphereLight args={["#bfe9ff", "#233122", 0.75]} />
      <directionalLight
        position={[12, 22, 8]}
        intensity={1.7}
        color="#fff1cc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <Terrain />
      <Forest />
      <Waterway />
      <Community visible={!showFutureWorlds && !showComparison} />
      <GridInfrastructure
        connected={built}
        gridCarbon={props.signals.gridCarbon}
      />

      {!built && <BuildPad onBuild={props.onBuild} />}
      {built && !showFutureWorlds && !showComparison && (
        <DataCenter
          position={[0, 0, 0]}
          capacityMw={props.signals.installedItMw}
          utilization={props.signals.utilization}
          cooling={props.cooling}
          refreshed={props.signals.refreshed}
          label={props.signals.phaseCount === 1 ? "PHASE 1" : "PHASES 1 + 2"}
        />
      )}
      {showFutureWorlds && props.result && (
        <FutureWorlds
          result={props.result}
          signals={props.signals}
          cooling={props.cooling}
        />
      )}
      {showComparison && props.result && (
        <ComparisonWorlds
          result={props.result}
          signals={props.signals}
          cooling={props.cooling}
        />
      )}

      <OrbitControls
        makeDefault
        enablePan={false}
        minZoom={28}
        maxZoom={68}
        minPolarAngle={0.65}
        maxPolarAngle={1.18}
        minAzimuthAngle={-1.25}
        maxAzimuthAngle={1.25}
        target={[0, 0.4, 0]}
      />
      <EffectComposer>
        <Bloom
          intensity={0.45}
          luminanceThreshold={0.75}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.28} darkness={0.35} />
      </EffectComposer>
    </>
  );
}

export function VoxelWorld(props: VoxelWorldProps) {
  return (
    <Canvas
      className="voxel-canvas"
      orthographic
      shadows
      dpr={[1, 2]}
      camera={{ position: [22, 18, 22], zoom: 42, near: 0.1, far: 120 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0.4, 0);
      }}
    >
      <WorldScene {...props} />
    </Canvas>
  );
}
