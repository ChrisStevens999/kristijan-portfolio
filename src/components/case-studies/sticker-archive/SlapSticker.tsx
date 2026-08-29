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
import { SLAP_TEXTURE_PAD, useSingleStickerTexture } from "./useSingleStickerTexture";

const CIRCUMFERENCE = 2 * Math.PI * CYLINDER_RADIUS;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * World-space (camera-relative) unit directions an incoming sticker can fly
 * in from. +Z leans toward the camera (it sits at world z=10 looking at the
 * origin) — that shared +Z bias is what gives every direction "starts
 * slightly closer to camera", per the brief, without needing a separate
 * depth parameter.
 */
const ENTRY_VECTORS: Record<SlapPlacement["entryDirection"], THREE.Vector3> = {
  left: new THREE.Vector3(-1, 0, 0.35).normalize(),
  right: new THREE.Vector3(1, 0, 0.35).normalize(),
  top: new THREE.Vector3(0, 1, 0.35).normalize(),
  "upper-left": new THREE.Vector3(-0.75, 0.75, 0.35).normalize(),
  "upper-right": new THREE.Vector3(0.75, 0.75, 0.35).normalize(),
  "diagonal-left": new THREE.Vector3(-0.7, -0.7, 0.35).normalize(),
  "diagonal-right": new THREE.Vector3(0.7, -0.7, 0.35).normalize(),
};

/** Quick fade-in right as the sticker first appears (t within its own window), so it doesn't hard-pop into existence. Motion itself stays fast — only the alpha ramps. */
function opacityFor(t: number) {
  const FADE_END = 0.12;
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
 * the page's scroll progress. Four keyframes:
 *   t=0.00  posBlend 0.00  scale 1.18  tilt  entryTilt      — still "incoming"
 *   t=0.55  posBlend 1.00  scale 1.03  tilt  entryTilt·0.2  — CONTACT, position locked
 *   t=0.80  posBlend 1.00  scale 0.99  tilt -1.5°           — tiny settle undershoot
 *   t=1.00  posBlend 1.00  scale 1.00  tilt  0              — LOCK
 * Matches the brief's own example almost exactly (scale 1.03 → 0.99 → 1.00,
 * 1–3° of rotational correction). posBlend within phase 1 eases with
 * easeOutCubic (fast, decisive arrival, no bounce); the post-contact settle
 * eases with easeOutQuad (short, no elastic overshoot).
 */
function slapCurve(t: number, entryTiltDeg: number) {
  if (t <= 0.55) {
    const local = t / 0.55;
    const eased = 1 - (1 - local) ** 3;
    return {
      posBlend: eased,
      scale: 1.18 + (1.03 - 1.18) * eased,
      tiltDeg: entryTiltDeg + (entryTiltDeg * 0.2 - entryTiltDeg) * eased,
    };
  }
  if (t <= 0.8) {
    const local = (t - 0.55) / 0.25;
    const eased = 1 - (1 - local) ** 2;
    return {
      posBlend: 1,
      scale: 1.03 + (0.99 - 1.03) * eased,
      tiltDeg: entryTiltDeg * 0.2 + (-1.5 - entryTiltDeg * 0.2) * eased,
    };
  }
  const local = (t - 0.8) / 0.2;
  const eased = 1 - (1 - local) ** 2;
  return {
    posBlend: 1,
    scale: 0.99 + (1.0 - 0.99) * eased,
    tiltDeg: -1.5 + (0 - -1.5) * eased,
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

  // Deterministic, hand-varied per sticker (not randomized): bigger
  // stickers travel a little further, and the entry tilt leans with the
  // entry direction (arriving from the left tilts as if spun on from that
  // side) so the flight itself reads as physical rather than a straight
  // linear slide.
  const entryDistance = useMemo(() => 0.85 + placement.widthFrac * CIRCUMFERENCE * 0.5, [placement.widthFrac]);
  const entryTiltDeg = useMemo(() => {
    const dir = ENTRY_VECTORS[placement.entryDirection];
    return -dir.x * 9 + (dir.y > 0 ? 2 : -2);
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
