"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import { CYLINDER_RADIUS, RADIAL_SEGMENTS, stickerPlacements } from "@/content/projects/sticker-archive";
import { getMetalTexture, METAL_TILE_WORLD_SIZE } from "../sticker-archive/metalTexture";
import { DemoSlapSticker, type DemoClock } from "./DemoSlapSticker";
import {
  CLOCK_START,
  POLE_FRAME_FRACTION_DEMO,
  ROTATION_RAD_PER_S,
  SHELL_HEIGHT,
  VERTICAL_PERIOD,
  VERTICAL_SPEED,
  readClockOverrides,
} from "./demoConfig";

/** Orthographic frustum sized so the pole holds POLE_FRAME_FRACTION_DEMO of the stage width; height follows the stage's own aspect. Fixed camera — nothing here ever moves it. */
function CameraFraming() {
  const { camera, size } = useThree();
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- three.js cameras are imperative objects; this mirrors the approved archive's CameraFraming. */
    const cam = camera as THREE.OrthographicCamera;
    const halfWidth = CYLINDER_RADIUS / POLE_FRAME_FRACTION_DEMO;
    const aspect = size.width / Math.max(1, size.height);
    const halfHeight = halfWidth / aspect;
    cam.left = -halfWidth;
    cam.right = halfWidth;
    cam.top = halfHeight;
    cam.bottom = -halfHeight;
    cam.near = 0.1;
    cam.far = 100;
    cam.position.set(0, 0, 10);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    /* eslint-enable react-hooks/immutability */
  }, [camera, size]);
  return null;
}

/** Dev-only (capture mode) ResizeObserver stand-in: reports the observed element's current box once, synchronously — see the `resize` prop in DemoScene. */
class ImmediateResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const rect = target.getBoundingClientRect();
    this.callback([{ target, contentRect: rect } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

/** Which vertical periods (within the shell cylinder) carry a copy of the repeating hardware. */
const PERIOD_INDICES = [-1, 0, 1];

/**
 * The pole SHELL: metal cylinder + weld seams + the yellow clamp, rotating
 * at w and descending at s. Its Y is taken modulo VERTICAL_PERIOD — the
 * hardware repeats every period and the metal texture tiles a whole (even)
 * number of times per period, so the wrap is invisible and the pole is
 * effectively endless. Stickers are NOT in this group (see StickerTrack) —
 * they ride an unbounded track so they never snap.
 */
function PoleShell({ clockRef }: { clockRef: React.RefObject<DemoClock> }) {
  const shellRef = useRef<THREE.Group>(null);
  const clampsRef = useRef<THREE.Group>(null);
  const metalTexture = getMetalTexture();
  const circumference = 2 * Math.PI * CYLINDER_RADIUS;
  metalTexture.repeat.set(circumference / METAL_TILE_WORLD_SIZE, SHELL_HEIGHT / METAL_TILE_WORLD_SIZE);

  useFrame(() => {
    const shell = shellRef.current;
    const clamps = clampsRef.current;
    if (!shell || !clamps) return;
    const t = clockRef.current.t;
    const y = -((VERTICAL_SPEED * t) % VERTICAL_PERIOD);
    shell.rotation.y = ROTATION_RAD_PER_S * t;
    shell.position.y = y;
    // The clamp only descends — it never turns with the metal, so it stays
    // pinned to the pole's LEFT edge exactly as in the reference (where the
    // pole's rotation is imperceptible anyway).
    clamps.position.y = y;
  });

  // Clamp: a slim bracket straddling the pole's left silhouette — its inner
  // 0.2 sits "inside" the pole (hidden by the metal's own depth), leaving a
  // ~0.6-world-unit lip visible, ≈ 60px of the 620px frame like the reference.
  const clampX = -(CYLINDER_RADIUS + 0.2);

  return (
    <>
      <group ref={shellRef}>
        <mesh>
          <cylinderGeometry args={[CYLINDER_RADIUS, CYLINDER_RADIUS, SHELL_HEIGHT, RADIAL_SEGMENTS, 1, true]} />
          <meshStandardMaterial map={metalTexture} roughness={0.5} metalness={0.48} />
        </mesh>

        {PERIOD_INDICES.map((k) => (
          <group key={k} position={[0, k * VERTICAL_PERIOD, 0]}>
            {/* Weld seam: a dark groove with a slightly raised, lighter lip just above it. */}
            <mesh>
              <cylinderGeometry
                args={[CYLINDER_RADIUS + 0.003, CYLINDER_RADIUS + 0.003, 0.055, RADIAL_SEGMENTS, 1, true]}
              />
              <meshStandardMaterial color="#474b52" roughness={0.75} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.045, 0]}>
              <cylinderGeometry
                args={[CYLINDER_RADIUS + 0.007, CYLINDER_RADIUS + 0.007, 0.028, RADIAL_SEGMENTS, 1, true]}
              />
              <meshStandardMaterial color="#c3c8cf" roughness={0.45} metalness={0.5} />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={clampsRef}>
        {PERIOD_INDICES.map((k) => (
          <group key={k} position={[clampX, k * VERTICAL_PERIOD + VERTICAL_PERIOD * 0.38, 0]}>
            <RoundedBox args={[0.8, 3.2, 0.95]} radius={0.06} smoothness={4}>
              <meshStandardMaterial color="#e2a600" roughness={0.55} metalness={0.15} />
            </RoundedBox>
            {/* Two dark fixings on the face toward the camera, like the reference's. */}
            {[1.1, -1.1].map((y) => (
              <mesh key={y} position={[-0.1, y, 0.49]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
                <meshStandardMaterial color="#2b2b2b" roughness={0.6} metalness={0.6} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </>
  );
}

/** Every sticker computes its own WORLD transform from the clock each frame (see DemoSlapSticker), so this is just a static container. */
function StickerTrack({ clockRef }: { clockRef: React.RefObject<DemoClock> }) {
  return (
    <group>
      {stickerPlacements.map((placement, index) => (
        <DemoSlapSticker key={placement.src.src} index={index} placement={placement} clockRef={clockRef} />
      ))}
    </group>
  );
}

/** Advances the shared clock once per frame, BEFORE every other subscriber (priority -1), with the frame delta clamped so a backgrounded tab resumes without a huge jump. The clock lives in a ref (the one sanctioned mutable escape hatch) — every other component only reads it. */
function ClockDriver({ clockRef }: { clockRef: React.RefObject<DemoClock> }) {
  useFrame((_, delta) => {
    clockRef.current.t += Math.min(delta, 1 / 20) * clockRef.current.speed;
  }, -1);
  return null;
}

export function DemoScene() {
  // This component is only ever mounted client-side (dynamic, ssr: false),
  // so the URL is available at first render; the dev overrides default to
  // CLOCK_START / real time when absent.
  const clockRef = useRef<DemoClock>({ t: CLOCK_START, speed: 1 });
  useEffect(() => {
    const { t, speed } = readClockOverrides(window.location.search);
    clockRef.current.t = t;
    clockRef.current.speed = speed;
  }, []);
  // `?capture=1` (dev only) keeps the drawing buffer so the canvas can be
  // read back with toDataURL for pixel checks (off by default as it costs
  // a little GPU bandwidth on some devices), and measures the container
  // directly instead of via ResizeObserver, which never fires in a hidden
  // document — headless/background capture would otherwise get an unsized
  // canvas.
  const [capture] = useState(() => new URLSearchParams(window.location.search).has("capture"));
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], near: 0.1, far: 100 }}
      gl={{ antialias: true, preserveDrawingBuffer: capture }}
      dpr={[1, 2]}
      resize={capture ? { polyfill: ImmediateResizeObserver as unknown as typeof ResizeObserver } : undefined}
    >
      <color attach="background" args={["#000000"]} />
      <CameraFraming />
      <ClockDriver clockRef={clockRef} />
      {/* Same three-light layout as the approved archive, but brighter
          overall: the reference's pole is a light, almost white galvanized
          silver with its specular band a little left of centre. */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[-1.8, 1.5, 9]} intensity={2.4} />
      <directionalLight position={[-5, 2, -2]} intensity={0.5} />
      <PoleShell clockRef={clockRef} />
      <StickerTrack clockRef={clockRef} />
    </Canvas>
  );
}
