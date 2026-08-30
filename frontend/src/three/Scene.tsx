import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useStore } from "../data/store";
import { RackField } from "./RackField";
import { DetailView } from "./DetailView";
import { Ecosystem } from "./Ecosystem";
import { EnergyFlow } from "./EnergyFlow";
import { LifetimeViz } from "./LifetimeViz";

function GradientSky() {
  return (
    <mesh scale={240}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial side={THREE.BackSide} depthWrite={false}
        uniforms={{ top: { value: new THREE.Color("#0c2038") }, mid: { value: new THREE.Color("#0a1424") }, bottom: { value: new THREE.Color("#04060c") } }}
        vertexShader={`varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={`varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
          void main(){ float h=normalize(vP).y; vec3 c = h>0.0 ? mix(mid,top,smoothstep(0.0,0.6,h)) : mix(mid,bottom,smoothstep(0.0,-0.4,h)); gl_FragColor=vec4(c,1.0);} `} />
    </mesh>
  );
}

function GroundGlow({ radius }: { radius: number }) {
  return (
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 64]} />
      <shaderMaterial transparent depthWrite={false}
        uniforms={{ color: { value: new THREE.Color("#1a9fd4") } }}
        vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `}
        fragmentShader={`varying vec2 vUv; uniform vec3 color; void main(){ float d=distance(vUv,vec2(0.5)); float a=smoothstep(0.5,0.0,d)*0.22; gl_FragColor=vec4(color, a);} `} />
    </mesh>
  );
}

function CameraRig({ controls }: { controls: React.MutableRefObject<any> }) {
  const model = useStore((s) => s.model)!;
  const selection = useStore((s) => s.selection);
  const view = useStore((s) => s.view);
  const { camera } = useThree();
  const prev = useRef<string>("");
  const anim = useRef({ t: 1, from: new THREE.Vector3(), fromTgt: new THREE.Vector3(),
    to: new THREE.Vector3(), toTgt: new THREE.Vector3() });

  const desired = () => {
    const hd = model.hall_dims;
    const span = Math.max(hd.x, hd.z);
    if (view === "ecosystem" || selection.kind === "facility") {
      const R = span * 2.4 + 20;
      return { tgt: new THREE.Vector3(0, 0.5, 0), cam: new THREE.Vector3(R * 0.5, R * 1.15, R * 0.85) };
    }
    if (selection.kind === "hall") {
      return { tgt: new THREE.Vector3(0, 1, 0), cam: new THREE.Vector3(hd.x * 0.8 + 5, span * 0.9 + 4, hd.z * 1.1 + 6) };
    }
    const rackId = selection.kind === "rack" ? selection.id : selection.id.split("-srv-")[0];
    const r = model.racks.find((x) => x.id === rackId);
    const p = r ? new THREE.Vector3(r.pos.x, r.pos.y + 1.2, r.pos.z) : new THREE.Vector3(0, 1.5, 0);
    return { tgt: p, cam: new THREE.Vector3(p.x + 4.5, p.y + 3, p.z + 5.5) };
  };

  useFrame((_, dt) => {
    const key = `${view}:${selection.kind}:${selection.id}`;
    if (key !== prev.current) {
      prev.current = key;
      const d = desired();
      const a = anim.current;
      a.from.copy(camera.position);
      a.fromTgt.copy(controls.current ? controls.current.target : new THREE.Vector3());
      a.to.copy(d.cam); a.toTgt.copy(d.tgt); a.t = 0;
    }
    const a = anim.current;
    if (a.t < 1) {
      a.t = Math.min(1, a.t + dt * 1.8);
      const e = a.t * a.t * (3 - 2 * a.t);
      camera.position.lerpVectors(a.from, a.to, e);
      if (controls.current) {
        controls.current.target.lerpVectors(a.fromTgt, a.toTgt, e);
        controls.current.update();
      }
    }
  });
  return null;
}

export function Scene() {
  const controls = useRef<any>(null);
  const model = useStore((s) => s.model)!;
  const select = useStore((s) => s.select);
  const hd = model.hall_dims;
  const span = Math.max(hd.x, hd.z);

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [span * 2, span * 1.6, span * 2.2], fov: 46 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onPointerMissed={() => select("facility", "fac-0")}>
      <GradientSky />
      <fog attach="fog" args={["#060a12", span * 3, span * 9 + 60]} />

      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#2a4a6a", "#0a0d13", 0.5]} />
      <directionalLight position={[18, 28, 12]} intensity={1.4} color="#eaf2ff"
        castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={120}
        shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} />
      <directionalLight position={[-20, 10, -16]} intensity={0.5} color="#4aa8ff" />
      <pointLight position={[0, 6, 0]} intensity={0.6} color="#2ad6ff" distance={span * 4} />

      {/* ground */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[span * 20, span * 20]} />
        <meshStandardMaterial color="#070b12" roughness={0.85} metalness={0.5} />
      </mesh>
      <GroundGlow radius={span * 3.2} />
      <Grid args={[span * 12, span * 12]} cellSize={1.5} cellColor="#12283a"
        sectionSize={span} sectionColor="#1d4a63" fadeDistance={span * 6 + 40}
        fadeStrength={2} position={[0, 0.02, 0]} infiniteGrid />

      <RackField />
      <DetailView />
      <Ecosystem />
      <EnergyFlow />
      <LifetimeViz />

      <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.1}
        minDistance={3} maxDistance={span * 12 + 60} maxPolarAngle={Math.PI / 2.03} />
      <CameraRig controls={controls} />

      <EffectComposer>
        <Bloom intensity={0.55} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur radius={0.6} />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
