"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

import {
  CYLINDER_RADIUS,
  CYLINDER_WORLD_HEIGHT,
  RADIAL_SEGMENTS,
  ROTATION_TURNS,
  STICKER_SURFACE_RADIUS_OFFSET,
  type SlapPlacement,
} from "@/content/projects/sticker-archive";
import { frontFacingFadeOnBeforeCompile } from "./frontFacingFade";
import { SLAP_TEXTURE_PAD, useSingleStickerTexture } from "./useSingleStickerTexture";

const CIRCUMFERENCE = 2 * Math.PI * CYLINDER_RADIUS;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Sign pattern per entryDirection — NOT a normalized travel vector. Entry
 * distance is anisotropic (see the worldOffset build in useFrame below):
 * horizontal reach is sized against the viewport's WORLD width, vertical
 * reach against its WORLD height, per the brief's own "25–35vw" / "20–30vh"
 * split. A single shared unit vector can't represent that, so direction
 * here is just which axes move which way; magnitude is computed separately,
 * live, from R3F's `state.viewport` each frame (auto-updates on resize,
 * unlike a hand-derived constant).
 */
const ENTRY_SIGNS: Record<SlapPlacement["entryDirection"], { x: -1 | 0 | 1; y: -1 | 0 | 1 }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: 1 },
  "upper-left": { x: -1, y: 1 },
  "upper-right": { x: 1, y: 1 },
  "lower-left": { x: -1, y: -1 },
};
/** Diagonal directions split their travel across both axes — scaled down a bit per axis so the COMBINED distance lands in the same ballpark as a straight left/right/top entry, not further. */
const DIAGONAL_AXIS_SCALE = 0.72;

/** Very brief anti-pop fade right as the sticker first appears — a couple of percent of the window. The reference clip's first visible frame already shows its incoming sticker fully opaque and static, so this is just enough to avoid a hard mount pop, not a reveal mechanism. */
function opacityFor(t: number) {
  const FADE_END = 0.03;
  if (t >= FADE_END) return 1;
  const local = t / FADE_END;
  return local * local * (3 - 2 * local);
}

/**
 * Deterministic "slap" curve — NOT a physics spring (no velocity/state to
 * integrate, which would make it timer- rather than scroll-driven). Every
 * output is a pure function of t, so scrubbing scroll forward or backward
 * always reproduces the exact same motion in reverse — required for
 * glitch-free backward scrolling / re-scrolling.
 *
 * `t` is progress WITHIN this sticker's own applicationWindow (0–1), not
 * the page's scroll progress. Reshaped after frame-stepping the actual
 * reference clip (not just estimating from the written brief): a sticker
 * there does NOT drift in continuously — it sits essentially STATIC off
 * the pole for the large majority of its on-screen time (frame-stepped in
 * ~0.03–0.05s increments, its position was visually unchanged across many
 * consecutive samples), then closes the entire remaining distance and hits
 * within only 1–2 frames. That hold-then-snap shape, not a continuous
 * glide, is what actually reads as "rude/quick" — the hold is what makes
 * the snap read as sudden.
 *
 *   t=0.00–0.82  posBlend 0.00  scale 1.00  tilt entryTilt              — HOLD, static off-pole
 *   t=0.82–0.90  posBlend 0→1   scale 1.00→1.03  tilt → entryTilt·0.15  — THE HIT (nearly all travel here)
 *   t=0.90–0.95  posBlend 1.00  scale 1.03→0.985 tilt → -2°             — compression undershoot
 *   t=0.95–1.00  posBlend 1.00  scale 0.985→1.00 tilt → 0               — LOCKED
 *
 * No motion at all during the hold (not even a subtle idle sway) — the
 * reference doesn't have one, and adding one would undercut the abruptness
 * of the snap. Each sub-phase eases with easeOutQuad (short, decisive, no
 * elastic overshoot).
 */
function slapCurve(t: number, entryTiltDeg: number) {
  const HOLD_END = 0.82;
  const SNAP_END = 0.9;
  const SETTLE_MID = 0.95;

  if (t <= HOLD_END) {
    return { posBlend: 0, scale: 1.0, tiltDeg: entryTiltDeg };
  }
  if (t <= SNAP_END) {
    const local = (t - HOLD_END) / (SNAP_END - HOLD_END);
    const eased = 1 - (1 - local) ** 2;
    return {
      posBlend: eased,
      scale: 1.0 + (1.03 - 1.0) * eased,
      tiltDeg: entryTiltDeg + (entryTiltDeg * 0.15 - entryTiltDeg) * eased,
    };
  }
  if (t <= SETTLE_MID) {
    const local = (t - SNAP_END) / (SETTLE_MID - SNAP_END);
    const eased = 1 - (1 - local) ** 2;
    return {
      posBlend: 1,
      scale: 1.03 + (0.985 - 1.03) * eased,
      tiltDeg: entryTiltDeg * 0.15 + (-2 - entryTiltDeg * 0.15) * eased,
    };
  }
  const local = (t - SETTLE_MID) / (1 - SETTLE_MID);
  const eased = 1 - (1 - local) ** 2;
  return {
    posBlend: 1,
    scale: 0.985 + (1.0 - 0.985) * eased,
    tiltDeg: -2 + (0 - -2) * eased,
  };
}

/**
 * One individually-animated sticker: rendered as a small curved patch of
 * the SAME cylinder surface (a partial CylinderGeometry at the sticker's
 * exact (u, v)/widthFrac, not a flat plane) so its resting transform is
 * geometrically identical to a sticker baked into the shared atlas — no
 * separate "attached representation" to hand off to, no risk of a visible
 * jump at contact. It's a literal JSX child of PoleGroup's rotating
 * `<group>`, so once at rest (offset 0) it moves with the pole for free,
 * exactly like every atlas sticker.
 *
 * Before/during its applicationWindow, an additional WORLD-space offset is
 * added on top of that same resting local position — computed fresh every
 * frame by converting the sticker's fixed entryDirection into the group's
 * CURRENT local space (the group keeps rotating slowly while a slap plays),
 * so the incoming trajectory always reads as arriving from a consistent
 * screen-relative direction regardless of when in the rotation it happens
 * to attach.
 */
export function SlapSticker({ placement, progress }: { placement: SlapPlacement; progress: MotionValue<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const loaded = useSingleStickerTexture(placement.src, placement.rotationDeg);

  const geo = useMemo(() => {
    if (!loaded) return null;

    const patchWidthWorld = placement.widthFrac * CIRCUMFERENCE * SLAP_TEXTURE_PAD;
    const patchHeightWorld = patchWidthWorld * loaded.aspect;
    const thetaLength = patchWidthWorld / CYLINDER_RADIUS;
    const centerTheta = placement.u * Math.PI * 2;
    const thetaStart = centerTheta - thetaLength / 2;
    // A touch PROUD of the shared atlas sticker cylinder (which sits at
    // exactly CYLINDER_RADIUS + STICKER_SURFACE_RADIUS_OFFSET) rather than
    // at the identical radius — two coplanar transparent meshes fight over
    // the same depth-buffer pixels wherever their padded canvases overlap
    // (SLAP_TEXTURE_PAD's blank margin extends past the visible artwork, so
    // this overlaps neighbouring atlas content more often than it looks
    // like it should), which rendered as a flickering vertical-stripe
    // z-fighting artifact — confirmed via screenshot, only ever appeared
    // near a just-attached slap sticker. The extra 0.004 is well under
    // what's visually perceptible as a "step" at this radius but enough to
    // resolve depth ordering unambiguously.
    const radius = CYLINDER_RADIUS + STICKER_SURFACE_RADIUS_OFFSET + 0.004;
    const segments = Math.max(6, Math.round(RADIAL_SEGMENTS * (thetaLength / (Math.PI * 2))));

    const geometry = new THREE.CylinderGeometry(radius, radius, patchHeightWorld, segments, 1, true, thetaStart, thetaLength);
    // CylinderGeometry's vertices already encode the correct absolute
    // azimuth (via thetaStart) and are auto-centred vertically — but scale/
    // rotation need to pivot around the PATCH's own centre, not the group's
    // Y axis, or a scale bump would visibly slide the patch radially.
    // Bounding-box centring sidesteps needing to hand-derive Three's own
    // sin/cos vertex convention.
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox!.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const localY = (0.5 - placement.v) * CYLINDER_WORLD_HEIGHT;
    const restPosition = new THREE.Vector3(center.x, localY + center.y, center.z);
    return { geometry, restPosition };
  }, [loaded, placement.widthFrac, placement.u, placement.v]);

  // How far along each axis the sticker travels, as a FRACTION of that
  // axis's own viewport extent — 25–35% for the axis(es) actually used,
  // scaled a little larger for bigger stickers. Multiplied by live
  // viewport.width/height (world units) every frame in useFrame below, not
  // here, since viewport.height changes with aspect/resize.
  const axisFrac = useMemo(() => {
    const sizeFrac = Math.min(1, Math.max(0, placement.widthFrac / 0.18));
    return 0.25 + sizeFrac * 0.1; // 0.25–0.35
  }, [placement.widthFrac]);
  // ENTRY_SIGNS is a stable module-level lookup, so this reference stays
  // constant across renders as long as entryDirection doesn't change — no
  // memoization needed for these trivially-cheap derivations.
  const signs = ENTRY_SIGNS[placement.entryDirection];
  const isDiagonal = signs.x !== 0 && signs.y !== 0;
  // Deterministic, hand-varied per sticker (not randomized): the entry tilt
  // leans with the entry direction (arriving from the left tilts as if
  // spun on from that side) so the flight itself reads as physical rather
  // than a straight linear slide.
  const entryTiltDeg = -signs.x * 12 + (signs.y > 0 ? 3 : -3);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh || !geo) return;

    const p = progress.get();
    const [start, end] = placement.applicationWindow;
    if (p < start) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    const t = Math.min(1, Math.max(0, (p - start) / Math.max(0.0001, end - start)));
    const { posBlend, scale, tiltDeg } = slapCurve(t, entryTiltDeg);

    // The group (see PoleGroup) rotates purely as a function of the same
    // `progress` value — recomputed here rather than read off the live
    // object, so it's guaranteed consistent within this exact frame without
    // needing a ref into the parent.
    const groupRotY = p * ROTATION_TURNS * Math.PI * 2;
    const remaining = 1 - posBlend;
    const axisScale = isDiagonal ? DIAGONAL_AXIS_SCALE : 1;
    const worldOffset = new THREE.Vector3(
      signs.x * state.viewport.width * axisFrac * axisScale * remaining,
      signs.y * state.viewport.height * axisFrac * axisScale * remaining,
      0,
    );
    const localOffset = worldOffset.applyAxisAngle(Y_AXIS, -groupRotY);

    mesh.position.set(
      geo.restPosition.x + localOffset.x,
      geo.restPosition.y + localOffset.y,
      geo.restPosition.z + localOffset.z,
    );
    mesh.rotation.y = THREE.MathUtils.degToRad(tiltDeg);
    mesh.scale.setScalar(scale);

    const material = mesh.material as THREE.MeshBasicMaterial;
    material.opacity = opacityFor(t);
  });

  if (!loaded || !geo) return null;

  return (
    <mesh ref={meshRef} geometry={geo.geometry} visible={false}>
      <meshBasicMaterial
        map={loaded.texture}
        transparent
        alphaTest={0.05}
        opacity={0}
        depthWrite={true}
        onBeforeCompile={frontFacingFadeOnBeforeCompile}
      />
    </mesh>
  );
}
