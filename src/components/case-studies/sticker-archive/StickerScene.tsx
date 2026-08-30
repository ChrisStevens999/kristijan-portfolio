"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

import {
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  atlasStickerPlacements,
  CYLINDER_RADIUS,
  CYLINDER_WORLD_HEIGHT,
  INITIAL_Y_OFFSET,
  POLE_FRAME_FRACTION,
  RADIAL_SEGMENTS,
  ROTATION_TURNS,
  slapStickers,
  STICKER_SURFACE_RADIUS_OFFSET,
  VERTICAL_TRAVEL_WORLD,
} from "@/content/projects/sticker-archive";
import { getMetalTexture, METAL_TILE_WORLD_SIZE } from "./metalTexture";
import { SlapSticker } from "./SlapSticker";
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
  // Only the non-slap stickers go into the shared atlas now — the 6 chosen
  // for the slap-on animation (see slapStickers) are rendered as their own
  // individual meshes below instead, so they can fly in before attaching.
  const stickerTexture = useStickerAtlasTexture(atlasStickerPlacements, ATLAS_WIDTH, ATLAS_HEIGHT);

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

  const stickerRadius = CYLINDER_RADIUS + STICKER_SURFACE_RADIUS_OFFSET;

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
          metal's light response.

          RENDERING FIX 1 (transparency): depthWrite disabled — without
          this, every fragment that passes alphaTest writes its own full
          depth regardless of its actual (possibly near-transparent) alpha,
          so this mesh's own padded canvas margins were cutting
          rectangular/irregular holes through whatever a nearer slap
          sticker mesh sat in front of. depthTest stays on (default true)
          so the metal cylinder's real geometry still correctly hides the
          far side of the pole. renderOrder=0 makes this the explicit base
          layer — every slap sticker mesh (SlapSticker.tsx) renders with a
          higher renderOrder so any overlap resolves deterministically,
          never via three.js's default per-object distance sort (which is
          a poor fit for one huge atlas mesh against several small curved
          patches). alphaTest kept at 0.05 (within the requested
          0.01–0.05 range) — high enough to skip fully-empty canvas
          margin, low enough to leave soft PNG edges blending normally via
          real alpha, not a hard cutout.

          RENDERING FIX 2 (fake edge fade): the front-facing brightness/
          alpha falloff previously injected here via onBeforeCompile
          (frontFacingFade.ts) has been removed entirely — it was exactly
          the "fake opacity/brightness gradient as stickers approach the
          edge" the reference calls out. Curvature now reads purely from
          the real cylinder geometry + perspective; sticker colour stays
          clean until the surface actually turns away from the camera. */}
      <mesh renderOrder={0}>
        <cylinderGeometry
          args={[stickerRadius, stickerRadius, CYLINDER_WORLD_HEIGHT, RADIAL_SEGMENTS, 1, true]}
        />
        <meshBasicMaterial map={stickerTexture} transparent alphaTest={0.05} depthWrite={false} />
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

      {/* Slap-on animated stickers — individual curved patches (see
          SlapSticker.tsx), literal children of this same rotating group so
          their attached resting state moves with the pole for free, exactly
          like the atlas stickers above. */}
      {slapStickers.map((placement) => (
        <SlapSticker key={placement.src.src} placement={placement} progress={progress} />
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
      {/* RENDERING FIX 2: the previous balance here (ambient 0.12, key
          2.6, fill 0.1) was tuned for maximum centre/edge CONTRAST — with
          ambient this low and the fill this dim, the grazing sides of the
          cylinder (where the real Lambertian dot(N,L) term is naturally
          near zero) dropped close to pure black, reading as an obvious
          "dark edge -> bright centre -> dark edge" band rather than a
          photographed metal object. Rebalanced for the same real
          bright-centre/dark-side shape (still driven purely by geometry +
          lighting, nothing baked or screen-space) but with a visible metal
          floor all the way to the silhouette: more ambient plus a
          stronger fill light on the shadow side, key light eased back
          slightly so the centre doesn't blow out relative to the now-less-
          dark edges. */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 1.5, 9]} intensity={2} />
      <directionalLight position={[-5, 2, -2]} intensity={0.35} />
      <PoleGroup progress={progress} />
    </Canvas>
  );
}
