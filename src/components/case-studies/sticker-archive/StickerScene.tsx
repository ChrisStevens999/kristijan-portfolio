"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

import {
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  CYLINDER_RADIUS,
  CYLINDER_WORLD_HEIGHT,
  POLE_FRAME_FRACTION,
  RADIAL_SEGMENTS,
  ROTATION_TURNS,
  VERTICAL_TRAVEL_WORLD,
  stickerPlacements,
} from "@/content/projects/sticker-archive";
import { getMetalTexture, METAL_TILE_WORLD_SIZE } from "./metalTexture";
import { useStickerAtlasTexture } from "./useStickerAtlasTexture";

/**
 * Real three.js cylinder replacing the old DOM/CSS slice-warp illusion.
 * ONE metal cylinder + ONE transparent sticker-atlas cylinder, both children
 * of the same group — the group's rotation.y and position.y are driven
 * directly from scroll progress every frame. Curvature, foreshortening and
 * back-face occlusion are genuine geometry/UV effects, not simulated.
 */

/** Keeps the orthographic frustum sized so the pole holds POLE_FRAME_FRACTION of the frame width, on every resize. */
function CameraFraming() {
  const { camera, size } = useThree();
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- three.js cameras are
       inherently mutable/imperative objects; this is the standard way
       R3F/drei itself keeps an orthographic frustum in sync with the
       canvas, not a case of treating React state as immutable data. */
    const cam = camera as THREE.OrthographicCamera;
    const halfWidth = CYLINDER_RADIUS / POLE_FRAME_FRACTION;
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

function PoleGroup({ progress }: { progress: MotionValue<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const metalTexture = getMetalTexture();
  const stickerTexture = useStickerAtlasTexture(stickerPlacements, ATLAS_WIDTH, ATLAS_HEIGHT);

  const circumference = 2 * Math.PI * CYLINDER_RADIUS;
  metalTexture.repeat.set(
    circumference / METAL_TILE_WORLD_SIZE,
    CYLINDER_WORLD_HEIGHT / METAL_TILE_WORLD_SIZE,
  );

  // Imperative per-frame update (not React state) — same lesson as the old
  // DOM renderer: this is a continuous rotation/translation, driving it
  // through React would just add re-render overhead for no benefit.
  useFrame(() => {
    const p = progress.get();
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y = p * ROTATION_TURNS * Math.PI * 2;
    // Scrolling down travels further down the printed surface.
    group.position.y = p * VERTICAL_TRAVEL_WORLD;
  });

  const stickerRadius = CYLINDER_RADIUS + 0.012;

  return (
    <group ref={groupRef}>
      <mesh>
        <cylinderGeometry
          args={[CYLINDER_RADIUS, CYLINDER_RADIUS, CYLINDER_WORLD_HEIGHT, RADIAL_SEGMENTS, 1, true]}
        />
        <meshStandardMaterial map={metalTexture} roughness={0.68} metalness={0.38} />
      </mesh>

      <mesh>
        <cylinderGeometry
          args={[stickerRadius, stickerRadius, CYLINDER_WORLD_HEIGHT, RADIAL_SEGMENTS, 1, true]}
        />
        <meshStandardMaterial
          map={stickerTexture}
          transparent
          alphaTest={0.05}
          roughness={0.55}
          metalness={0.04}
        />
      </mesh>

      {/* Horizontal seam/joint bands — a couple of pipe-section joints down the tall pole, as distinct thin geometry rather than a baked texture line. */}
      {[0.3, 0.72].map((frac) => (
        <mesh key={frac} position={[0, CYLINDER_WORLD_HEIGHT * (0.5 - frac), 0]}>
          <cylinderGeometry
            args={[CYLINDER_RADIUS + 0.006, CYLINDER_RADIUS + 0.006, CYLINDER_WORLD_HEIGHT * 0.006, RADIAL_SEGMENTS, 1, true]}
          />
          <meshStandardMaterial color="#14161a" roughness={0.8} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function StickerScene({ progress }: { progress: MotionValue<number> }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#000000"]} />
      <CameraFraming />
      <ambientLight intensity={0.32} />
      <directionalLight position={[0, 1.5, 8]} intensity={1.15} />
      <directionalLight position={[-5, 2, -2]} intensity={0.22} />
      <PoleGroup progress={progress} />
    </Canvas>
  );
}
