"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

import {
  CYLINDER_RADIUS,
  CYLINDER_WORLD_HEIGHT,
  POLE_FRAME_FRACTION,
  RADIAL_SEGMENTS,
  ROTATION_TURNS,
  STICKER_SURFACE_RADIUS_OFFSET,
  type SlapPlacement,
} from "@/content/projects/sticker-archive";
import { SLAP_TEXTURE_PAD, useSingleStickerTexture } from "./useSingleStickerTexture";

const CIRCUMFERENCE = 2 * Math.PI * CYLINDER_RADIUS;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Horizontal span of the camera frustum, in world units — CONSTANT
 * regardless of viewport aspect (CameraFraming derives frustum halfWidth
 * from CYLINDER_RADIUS/POLE_FRAME_FRACTION only; halfHeight is what varies
 * with aspect). Used to size entry distance as "N% of viewport width", per
 * direct reference-video comparison — see entryDistance below.
 */
const VIEWPORT_WORLD_WIDTH = (2 * CYLINDER_RADIUS) / POLE_FRAME_FRACTION;

/**
 * Pure screen-relative directions (no depth/Z component this pass — direct
 * comparison against a reference clip showed plain lateral/vertical travel
 * reads more clearly as "outside the pole, about to hit it" than adding a
 * toward-camera drift on top).
 */
const ENTRY_VECTORS: Record<SlapPlacement["entryDirection"], THREE.Vector3> = {
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
  top: new THREE.Vector3(0, 1, 0),
  "upper-left": new THREE.Vector3(-0.75, 0.75, 0).normalize(),
  "upper-right": new THREE.Vector3(0.75, 0.75, 0).normalize(),
};

/** Very brief anti-pop fade right as the sticker first appears — a few percent of the window, NOT the main reveal mechanism. Positional travel (see slapCurve/entryDistance) is what has to carry the "hit", per direct reference comparison. */
function opacityFor(t: number) {
  const FADE_END = 0.06;
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
 * the page's scroll progress. Proportions match a reference clip's own
 * pacing (a sticker closes the gap and hits within a handful of frames):
 * APPROACH takes the first 75% of the window, CONTACT the next 12.5%,
 * SETTLE the last 12.5%.
 *
 *   t=0.000  posBlend 0.00  scale 1.00  tilt  entryTilt        — OFF POLE
 *   t=0.750  posBlend 1.00  scale 1.04  tilt  entryTilt·0.15   — HIT (position locked, compression peak)
 *   t=0.875  posBlend 1.00  scale 0.985 tilt -2°               — undershoot
 *   t=1.000  posBlend 1.00  scale 1.00  tilt  0                — LOCKED
 *
 * APPROACH is near-linear (mild power-1.3 ease, not the soft easeOutCubic
 * used previously) — the deceleration a viewer perceives should come from
 * the impact itself (the scale/tilt snap at 0.75), not from the travel
 * quietly slowing to a stop beforehand, which is what read as "floating"
 * before. The 1.00→1.04 jump exactly at t=0.75 is a deliberate hard cut,
 * not eased into — that's the "hit" instant.
 */
function slapCurve(t: number, entryTiltDeg: number) {
  const APPROACH_END = 0.75;
  const CONTACT_END = 0.875;

  if (t <= APPROACH_END) {
    const local = t / APPROACH_END;
    const eased = 1 - (1 - local) ** 1.3;
    return {
      posBlend: eased,
      scale: 1.0,
      tiltDeg: entryTiltDeg * (1 - 0.85 * eased),
    };
  }
  if (t <= CONTACT_END) {
    const local = (t - APPROACH_END) / (CONTACT_END - APPROACH_END);
    const eased = 1 - (1 - local) ** 2;
    return {
      posBlend: 1,
      scale: 1.04 + (0.985 - 1.04) * eased,
      tiltDeg: entryTiltDeg * 0.15 + (-2 - entryTiltDeg * 0.15) * eased,
    };
  }
  const local = (t - CONTACT_END) / (1 - CONTACT_END);
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
    const radius = CYLINDER_RADIUS + STICKER_SURFACE_RADIUS_OFFSET;
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

  // Entry distance as a fraction of the camera's own viewport width —
  // 24–38% depending on sticker size — per direct request: the previous
  // pass's offsets were "too subtle" to read as arriving from clearly
  // outside the pole. Bigger (hero) stickers travel proportionally further.
  const entryDistance = useMemo(() => {
    const sizeFrac = Math.min(1, Math.max(0, placement.widthFrac / 0.18));
    return VIEWPORT_WORLD_WIDTH * (0.24 + sizeFrac * 0.14);
  }, [placement.widthFrac]);
  // Deterministic, hand-varied per sticker (not randomized): the entry tilt
  // leans with the entry direction (arriving from the left tilts as if
  // spun on from that side) so the flight itself reads as physical rather
  // than a straight linear slide.
  const entryTiltDeg = useMemo(() => {
    const dir = ENTRY_VECTORS[placement.entryDirection];
    return -dir.x * 12 + (dir.y > 0 ? 3 : -3);
  }, [placement.entryDirection]);

  useFrame(() => {
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
    const dir = ENTRY_VECTORS[placement.entryDirection];
    const worldOffset = dir.clone().multiplyScalar(entryDistance * (1 - posBlend));
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
      <meshBasicMaterial map={loaded.texture} transparent alphaTest={0.05} opacity={0} depthWrite={true} />
    </mesh>
  );
}
