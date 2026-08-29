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
  STICKER_SURFACE_RADIUS_OFFSET,
  type SlapPlacement,
} from "@/content/projects/sticker-archive";
import { frontFacingFadeOnBeforeCompile } from "./frontFacingFade";
import { SLAP_TEXTURE_PAD, useSingleStickerTexture } from "./useSingleStickerTexture";

const CIRCUMFERENCE = 2 * Math.PI * CYLINDER_RADIUS;
/**
 * Horizontal span of the camera frustum, in world units — CONSTANT
 * regardless of viewport aspect (CameraFraming derives frustum halfWidth
 * from CYLINDER_RADIUS/POLE_FRAME_FRACTION only; halfHeight is what varies
 * with aspect). NOT read from R3F's `state.viewport` — that's computed from
 * the camera's own props, but CameraFraming sets left/right/top/bottom
 * imperatively outside Fiber's normal reactive flow, so `state.viewport`
 * doesn't reflect it (confirmed via direct logging: it was returning the
 * canvas's PIXEL size, ~1330, instead of the ~6.67 world units expected —
 * a 200x error that sent the entry offset thousands of degrees around the
 * cylinder). `state.size` (the canvas's real pixel dimensions) is reliable
 * for deriving live aspect, so that's used for the vertical extent instead.
 */
const VIEWPORT_WORLD_WIDTH = (2 * CYLINDER_RADIUS) / POLE_FRAME_FRACTION;

/**
 * Where the approach ends and the tiny settle begins, as a fraction of the
 * sticker's own applicationWindow — matches the requested "~85% approach /
 * ~15% settle" (roughly 180–220ms / 40–60ms at typical scroll speed).
 */
const APPROACH_END = 0.85;
/** How far outside the surface (in cylinder radii) the incoming sticker starts, along its own outward normal — "0.5–0.8 radii closer to camera" from the brief; interpolated to exactly 0 (the true surface) by contact. */
const RADIAL_PUSH_RADII = 0.65;

/**
 * Deterministic "slap" curve — NOT a physics spring (no velocity/state to
 * integrate, which would make it timer- rather than scroll-driven). Every
 * output is a pure function of t, so scrubbing scroll forward or backward
 * always reproduces the exact same motion in reverse.
 *
 * Reworked from a previous "long static hold, then near-instant snap" shape
 * after direct feedback that holding still read as "sticker appears, sits
 * there, sticker is on pole" rather than a visible flight — a viewer needs
 * to actually watch it travel, not just perceive a sudden jump preceded by
 * nothing. This version moves continuously for the whole approach instead:
 *
 *   t=0.00       posBlend 0.00  scale 1.08                     — OFF POLE, full offset
 *   t=0.00–0.85  posBlend 0→1   scale 1.08→1.02  tilt→0  radial 1→0   — APPROACH (sharp ease-out, continuous)
 *   t=0.85       posBlend 1.00  scale 1.02  tilt 0  radial 0         — CONTACT (position/rotation/depth exactly final)
 *   t=0.85–~0.90 scale 1.02→0.985                                    — impact compression
 *   t=~0.90–1.00 scale 0.985→1.00                                    — settle to rest
 *
 * Position, tilt and the radial (depth) push all share the APPROACH
 * timeline and all reach their final value simultaneously at t=0.85 —
 * that's what guarantees position/rotation/depth match the resting
 * (attached) transform exactly at contact, with nothing left to correct
 * during settle. Only scale continues moving after contact, and only as
 * the requested "one subtle impact cue" (1.02 → 0.985 → 1.00) — no
 * position, rotation or depth change after contact, and no bounce/wobble.
 * Approach eases with a sharp cubic ease-out (heavier deceleration than a
 * quad) so the stop reads as decisive, not floaty.
 */
function slapCurve(t: number, entryTiltDeg: number) {
  if (t <= APPROACH_END) {
    const local = t / APPROACH_END;
    const eased = 1 - (1 - local) ** 3;
    return {
      posBlend: eased,
      scale: 1.08 + (1.02 - 1.08) * eased,
      tiltDeg: entryTiltDeg * (1 - eased),
      radialBlend: 1 - eased,
    };
  }
  const local = (t - APPROACH_END) / (1 - APPROACH_END);
  const DIP_END = 0.35;
  let scale;
  if (local <= DIP_END) {
    const l2 = local / DIP_END;
    const eased2 = 1 - (1 - l2) ** 2;
    scale = 1.02 + (0.985 - 1.02) * eased2;
  } else {
    const l2 = (local - DIP_END) / (1 - DIP_END);
    const eased2 = 1 - (1 - l2) ** 2;
    scale = 0.985 + (1.0 - 0.985) * eased2;
  }
  return { posBlend: 1, scale, tiltDeg: 0, radialBlend: 0 };
}

/**
 * One individually-animated sticker: rendered as a small curved patch of
 * the SAME cylinder surface (a partial CylinderGeometry at the sticker's
 * exact (u, v)/widthFrac, not a flat plane) so its resting transform is
 * geometrically identical to a sticker baked into the shared atlas.
 *
 * This is deliberately ONE mesh, not two — there is no separate "incoming"
 * object handed off to a separate "attached" object. The brief's contact
 * requirement (incoming and attached must match position/scale/rotation
 * exactly, with an extremely short crossfade so there's zero visible pop)
 * is satisfied structurally instead: since it's the same object the whole
 * time, hidden (visible=false) until its applicationWindow starts and
 * always at full opacity once shown, there is nothing to hand off between
 * and nothing that could mismatch — a stronger guarantee than a real
 * crossfade could give. It's a literal JSX child of PoleGroup's rotating
 * `<group>`, so once at rest it moves with the pole for free, exactly like
 * every atlas sticker.
 *
 * Before/during its applicationWindow, the patch is displaced from that
 * resting position by ROTATING it further around the cylinder's own axis
 * and pushing it to a larger radius — NOT by translating it along a raw
 * XYZ vector. That distinction matters: an early version translated the
 * curved patch freely through space, which (confirmed via screenshot)
 * makes a wide patch self-intersect the metal cylinder's own geometry once
 * it's far from its "home" angular position — the translated curve, still
 * shaped as if wrapped around the ORIGINAL axis, ends up partly inside the
 * metal, producing a dark, semi-transparent smear. Expressing horizontal
 * entry as an angular offset (theta) instead keeps the patch always
 * genuinely wrapped around the same axis, just at a different angle and/or
 * radius, so it can never intersect the metal — physically closer to what
 * "a sticker swinging in and around onto the pole" actually is:
 *  - HORIZONTAL entry (`entryOffsetVw.x`) becomes an angular offset,
 *    θ = (entryOffsetVw.x · viewport.width) / CYLINDER_RADIUS (arc length
 *    ÷ radius — the same relationship `widthFracFor` already uses
 *    elsewhere in this codebase). Added to the mesh's OWN rotation too, so
 *    its baked-in curvature/normals stay consistent with its new position.
 *  - VERTICAL entry (`entryOffsetVw.y`) is a plain world-Y translation —
 *    sliding along the cylinder's length is always safe, no rotation
 *    needed.
 *  - The RADIAL (depth) push extends the radius outward at whatever the
 *    current angle is, so it starts proud of the surface and settles onto
 *    the true radius exactly at contact — "moving in depth, not purely
 *    2D", per the brief.
 * All three — plus the tilt wobble — share one easing timeline and reach
 * zero simultaneously at t=0.85, which is what makes contact exact.
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
    return { geometry, restPosition, centerTheta };
  }, [loaded, placement.widthFrac, placement.u, placement.v]);

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
    const { posBlend, scale, tiltDeg, radialBlend } = slapCurve(t, placement.entryTiltDeg);
    const remaining = 1 - posBlend;

    // Angular offset (radians): arc length ÷ radius, same relationship
    // widthFracFor uses elsewhere. This is a LOCAL-space theta delta, and
    // because both the rest position and this offset are expressed as
    // rotations around the same Y axis, the delta is rotation-invariant —
    // it reads as the same screen-relative direction regardless of the
    // group's current rotation, with no extra unrotate-then-rotate step
    // needed (unlike a raw world-space vector offset would require). Sign
    // verified directly against live world-space/NDC coordinates (not just
    // a screenshot) — this geometry's theta convention maps a positive
    // (rightward) entryOffsetVw.x to a positive theta delta.
    const deltaTheta = ((placement.entryOffsetVw.x * VIEWPORT_WORLD_WIDTH) / CYLINDER_RADIUS) * remaining;
    const incomingTheta = geo.centerTheta + deltaTheta;
    const incomingRadius = CYLINDER_RADIUS + RADIAL_PUSH_RADII * CYLINDER_RADIUS * radialBlend;
    // Offset = (position on the incoming arc) - (position on the rest arc,
    // via the same formula) — added to geo.restPosition (the geometry's
    // real bounding-box centre) rather than used as an absolute position,
    // so any small formula/bounding-box discrepancy at rest cancels out.
    const dx = incomingRadius * Math.sin(incomingTheta) - CYLINDER_RADIUS * Math.sin(geo.centerTheta);
    const dz = incomingRadius * Math.cos(incomingTheta) - CYLINDER_RADIUS * Math.cos(geo.centerTheta);
    // entryOffsetVw.y is stored in screen/CSS convention (negative = up);
    // world space is the opposite (positive = up), hence the negation.
    // Vertical entry is a plain world-Y translation — always safe, no
    // rotation needed, since sliding along the cylinder's length can't
    // intersect anything. Height genuinely does vary with aspect (unlike
    // width), so it's derived live from state.size (real canvas pixels,
    // unlike state.viewport — see VIEWPORT_WORLD_WIDTH's comment above).
    const aspect = state.size.width / Math.max(1, state.size.height);
    const viewportWorldHeight = VIEWPORT_WORLD_WIDTH / aspect;
    const dy = -placement.entryOffsetVw.y * viewportWorldHeight * remaining;

    mesh.position.set(geo.restPosition.x + dx, geo.restPosition.y + dy, geo.restPosition.z + dz);
    // The mesh's OWN rotation carries the same angular delta as its
    // position, so the geometry's baked-in curvature/normals stay
    // consistent with wherever it currently sits — plus the small tilt
    // wobble on top.
    mesh.rotation.y = deltaTheta + THREE.MathUtils.degToRad(tiltDeg);
    mesh.scale.setScalar(scale);
  });

  if (!loaded || !geo) return null;

  return (
    <mesh ref={meshRef} geometry={geo.geometry} visible={false}>
      <meshBasicMaterial
        map={loaded.texture}
        transparent
        alphaTest={0.05}
        depthWrite={true}
        onBeforeCompile={frontFacingFadeOnBeforeCompile}
      />
    </mesh>
  );
}
