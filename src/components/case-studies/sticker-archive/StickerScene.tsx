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
  INITIAL_Y_OFFSET,
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
    group.position.y = INITIAL_Y_OFFSET + p * VERTICAL_TRAVEL_WORLD;
  });

  const stickerRadius = CYLINDER_RADIUS + 0.012;

  return (
    <group ref={groupRef}>
      <mesh>
        <cylinderGeometry
          args={[CYLINDER_RADIUS, CYLINDER_RADIUS, CYLINDER_WORLD_HEIGHT, RADIAL_SEGMENTS, 1, true]}
        />
        <meshStandardMaterial map={metalTexture} roughness={0.5} metalness={0.48} />
      </mesh>

      {/* Sticker surface deliberately UNLIT (MeshBasicMaterial, not
          MeshStandardMaterial) — the metal's dramatic directional lighting
          is exactly what the reference wants for the pole itself, but that
          same lighting was flattening/darkening the printed artwork's own
          colours. Curvature still reads correctly (foreshortening + real
          back-face culling are pure geometry, not lighting), it's only the
          brightness/saturation of the art that's now independent of the
          metal's light response. */}
      <mesh>
        <cylinderGeometry
          args={[stickerRadius, stickerRadius, CYLINDER_WORLD_HEIGHT, RADIAL_SEGMENTS, 1, true]}
        />
        <meshBasicMaterial map={stickerTexture} transparent alphaTest={0.05} />
      </mesh>

      {/* ONE extremely subtle seam/joint — a shallow groove, not a graphic
          stripe: placed well outside the printed band (MANUAL_LAYOUT's
          v≈0.31–0.72) so it never crosses artwork, barely lighter than the
          surrounding metal so it reads as a construction joint, not a line
          dividing the pole into sections. */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry
          args={[CYLINDER_RADIUS + 0.002, CYLINDER_RADIUS + 0.002, 0.01, RADIAL_SEGMENTS, 1, true]}
        />
        <meshStandardMaterial color="#9198a0" roughness={0.6} metalness={0.42} />
      </mesh>
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
      {/* Low ambient + a strong, tight key light — the reference's
          left-dark / centre-bright-silver / right-dark falloff needs real
          contrast between the key light and everything else. Pushed
          further than the previous pass, which was still too even. */}
      <ambientLight intensity={0.12} />
      <directionalLight position={[0, 1.5, 9]} intensity={2.6} />
      <directionalLight position={[-5, 2, -2]} intensity={0.1} />
      <PoleGroup progress={progress} />
    </Canvas>
  );
}
