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
 * doesn't reflect it (confirmed via direct logging in a previous pass: it
 * returned the canvas's PIXEL size, ~1330, instead of the ~6.67 world units
 * expected). `state.size` (the canvas's real pixel dimensions) is reliable
 * for deriving live aspect, so that's used for the vertical extent instead.
 */
const VIEWPORT_WORLD_WIDTH = (2 * CYLINDER_RADIUS) / POLE_FRAME_FRACTION;

/**
 * Where CONTACT happens, as a fraction of the sticker's own
 * applicationWindow -- the approach (off-surface -> surface) runs
 * 0..CONTACT_T, the tiny settle runs CONTACT_T..1. Was 0.85; the "make the
 * approach about 10% faster" micro-adjustment shortens the approach's own
 * duration by 10% (0.85 * 0.9) rather than touching applicationWindow
 * itself (PASS 2's territory) -- the approach simply consumes less of the
 * existing window, leaving the settle a bit more room after it.
 */
const CONTACT_T = 0.85 * 0.9;
/**
 * Width of the incoming->attached crossfade band -- "no more than
 * approximately 2-3 rendered frames" translated into scroll-progress terms.
 * Runs from CONTACT_T to CONTACT_T + CROSSFADE_WIDTH (strictly AFTER
 * contact, not straddling it) so the attached mesh stays fully hidden right
 * up until exact contact, per the latest micro-adjustment. This costs
 * nothing visually: the incoming mesh's transform is clamped to CONTACT_T,
 * so both meshes already read identical position/scale from that instant
 * on -- only opacity is left to cross over.
 */
const CROSSFADE_WIDTH = 0.02;
/** "Approximately 0.5 cylinder radii closer to camera than its final surface position" — interpolated to exactly 0 (the true surface) by CONTACT_T. */
const RADIAL_PUSH_RADII = 0.5;
/**
 * "Make their detached starting position about 10-15% farther from the
 * pole" -- a single multiplier (12.5%, the midpoint of that range) applied
 * to the lateral (x/y) entry-offset distance only. Depth (RADIAL_PUSH_RADII
 * above) is untouched -- the ask was specifically about lateral distance
 * from the pole, not proximity to camera.
 */
const ENTRY_DISTANCE_MULTIPLIER = 1.125;

/**
 * TEMPORARY DEV-ONLY VERIFICATION AID — must be `false` before this pass is
 * considered done. Widens every slap sticker's effective applicationWindow
 * (without touching the actual values in sticker-archive.ts — PASS 2 owns
 * timing) so the same motion plays out over more scroll distance, easier to
 * scrub through frame-by-frame while checking the 5-point debug list from
 * the brief (incoming starts detached / travels correctly / depth is
 * visible / contact matches / attached takes over with no jump).
 */
const DEBUG_SLOW_MOTION = false;
const DEBUG_SLOW_MOTION_FACTOR = 4;

/**
 * Approach curve for the INCOMING mesh only -- a pure function of
 * `t` in [0, CONTACT_T] (NOT the whole window), so it's meaningless past
 * contact; the incoming mesh freezes/fades out there. Not a physics spring
 * (no velocity/state to integrate) -- scrubbing scroll forward or backward
 * always reproduces the exact same motion in reverse.
 *
 *   t=0             posBlend 0  scale 1.06  tilt entryTilt  radial 1  -- OFF SURFACE
 *   t=0..CONTACT_T  posBlend 0->1  scale 1.06->1.02  tilt->0  radial 1->0
 *   t=CONTACT_T     posBlend 1  scale 1.02  tilt 0  radial 0  -- CONTACT
 *
 * Scale eases smoothly from 1.06 to 1.02 -- ONE curve, no intermediate
 * checkpoint -- because the latest micro-adjustment moves the 0.985 dip
 * into the post-contact settle instead (see settleScale below): "at
 * contact use only a tiny 1.02 -> 0.985 -> 1.0 settle" reads the approach
 * as ending at 1.02, with the dip-then-rise happening AFTER contact, not
 * during it. Position/tilt/radial share ONE sharp cubic ease-out --
 * heavier deceleration than a quad, so the stop reads as decisive/fast,
 * not floaty. No bounce/spring/wobble: strictly monotonic, no overshoot.
 */
function approachCurve(t: number, entryTiltDeg: number) {
  const local = Math.min(1, Math.max(0, t / CONTACT_T));
  const eased = 1 - (1 - local) ** 3;
  return {
    posBlend: eased,
    scale: 1.06 + (1.02 - 1.06) * eased,
    tiltDeg: entryTiltDeg * (1 - eased),
    radialBlend: 1 - eased,
  };
}

/**
 * Settle curve for the ATTACHED mesh only -- a pure function of `t` in
 * [CONTACT_T, 1]. This is the ONLY animation that happens after contact,
 * and it's scale-only: no position, rotation, or independent movement of
 * any kind, per "after contact immediately lock to the current cylinder
 * transform." Plays the exact three-point arc requested -- 1.02 (matching
 * the incoming mesh's value at the contact instant, so the crossfade has
 * zero scale discontinuity) -> 0.985 (a quick, tiny compression, the
 * "impact" cue) -> 1.0 (final rest) -- as two back-to-back eased segments,
 * each strictly monotonic (no bounce/spring/wobble, no overshoot past
 * either end of the range).
 */
function settleScale(t: number) {
  const local = Math.min(1, Math.max(0, (t - CONTACT_T) / (1 - CONTACT_T)));
  const DIP_AT = 0.4;
  if (local <= DIP_AT) {
    const l2 = local / DIP_AT;
    const eased = 1 - (1 - l2) ** 2;
    return 1.02 + (0.985 - 1.02) * eased;
  }
  const l2 = (local - DIP_AT) / (1 - DIP_AT);
  const eased = 1 - (1 - l2) ** 2;
  return 0.985 + (1.0 - 0.985) * eased;
}

/**
 * One slap-animated sticker, rendered as TWO meshes sharing the SAME curved
 * cylinder-patch geometry (a partial CylinderGeometry at the sticker's
 * exact (u, v)/widthFrac — physically identical to a sticker baked into the
 * shared atlas, not a flat plane):
 *
 *  - INCOMING: carries the animated off-surface→surface transform. Visible
 *    from the window's start; fades OUT (opacity 1→0) starting exactly at
 *    contact, then hidden entirely (`visible = false`) — no lingering
 *    transform, nothing left animating.
 *  - ATTACHED: sits at the fixed rest transform ALWAYS (no offset, no
 *    extra rotation, ever) — exactly how an atlas-baked sticker would sit.
 *    Fully hidden until the EXACT contact instant (not a moment before),
 *    then fades IN (opacity 0→1) across a narrow band immediately after,
 *    and is what plays the tiny post-contact settle (scale
 *    1.02→0.985→1.0). Once the crossfade completes, this mesh is the ONLY
 *    thing left doing anything at all, and even that "anything" is a fixed
 *    scale curve, not user-visible position/rotation drift — it moves only
 *    because it's a literal JSX child of PoleGroup's rotating `<group>`.
 *
 * Both meshes reach IDENTICAL position/rotation/scale at t=CONTACT_T (the
 * incoming curve is built to land exactly on the attached mesh's own
 * contact-instant value — 1.02 scale, 0 tilt, 0 offset), which is what
 * makes the crossfade invisible: for the ~2–3 "frames" (a narrow
 * scroll-progress band starting at contact) where both are visible
 * together, they render the same pixels.
 */
export function SlapSticker({ placement, progress }: { placement: SlapPlacement; progress: MotionValue<number> }) {
  const incomingRef = useRef<THREE.Mesh>(null);
  const attachedRef = useRef<THREE.Mesh>(null);
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
    // the same depth-buffer pixels wherever their padded canvases overlap,
    // which read as a flickering vertical-stripe z-fighting artifact in an
    // earlier pass. The extra 0.004 is well under what's visually
    // perceptible as a "step" at this radius but resolves depth ordering
    // unambiguously.
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
    const incoming = incomingRef.current;
    const attached = attachedRef.current;
    if (!incoming || !attached || !geo) return;

    const p = progress.get();
    const [rawStart, rawEnd] = placement.applicationWindow;
    // DEBUG_SLOW_MOTION widens the window around its own midpoint, purely
    // for local verification — see the constant's doc comment. It does NOT
    // change sticker-archive.ts (PASS 2 owns real timing).
    const mid = (rawStart + rawEnd) / 2;
    const halfWidth = ((rawEnd - rawStart) / 2) * (DEBUG_SLOW_MOTION ? DEBUG_SLOW_MOTION_FACTOR : 1);
    const start = mid - halfWidth;
    const end = mid + halfWidth;

    if (p < start) {
      incoming.visible = false;
      attached.visible = false;
      return;
    }

    const t = Math.min(1, (p - start) / Math.max(0.0001, end - start));
    const bandStart = CONTACT_T;
    const bandEnd = CONTACT_T + CROSSFADE_WIDTH;

    // --- INCOMING: animated approach, frozen at its CONTACT_T values once t passes that point (it's fading out by then anyway). ---
    const { posBlend, scale: incomingScale, tiltDeg, radialBlend } = approachCurve(Math.min(t, CONTACT_T), placement.entryTiltDeg);
    const remaining = 1 - posBlend;

    // Angular offset (radians): arc length ÷ radius, same relationship
    // widthFracFor uses elsewhere. This is a LOCAL-space theta delta, and
    // because both the rest position and this offset are expressed as
    // rotations around the same Y axis, the delta is rotation-invariant —
    // it reads as the same screen-relative direction regardless of the
    // group's current rotation. A positive (rightward) entryOffsetVw.x
    // maps to a positive theta delta (verified against live world-space/
    // NDC coordinates in a previous pass).
    const deltaTheta =
      ((placement.entryOffsetVw.x * ENTRY_DISTANCE_MULTIPLIER * VIEWPORT_WORLD_WIDTH) / CYLINDER_RADIUS) * remaining;
    const incomingTheta = geo.centerTheta + deltaTheta;
    const incomingRadius = CYLINDER_RADIUS + RADIAL_PUSH_RADII * CYLINDER_RADIUS * radialBlend;
    // Offset = (position on the incoming arc) - (position on the rest arc,
    // via the same formula) — added to geo.restPosition (the geometry's
    // real bounding-box centre) rather than used as an absolute position,
    // so any small formula/bounding-box discrepancy at rest cancels out.
    // Expressing horizontal entry as an angle+radius change (not a raw XYZ
    // translation) keeps the patch always genuinely wrapped around the
    // same axis — a previous pass found that translating a wide curved
    // patch freely through space makes it self-intersect the metal
    // cylinder's own geometry once far from its "home" angle.
    const dx = incomingRadius * Math.sin(incomingTheta) - CYLINDER_RADIUS * Math.sin(geo.centerTheta);
    const dz = incomingRadius * Math.cos(incomingTheta) - CYLINDER_RADIUS * Math.cos(geo.centerTheta);
    // entryOffsetVw.y is stored in screen/CSS convention (negative = up);
    // world space is the opposite (positive = up), hence the negation.
    // Vertical entry is a plain world-Y translation — sliding along the
    // cylinder's length can't intersect anything, no rotation needed.
    const aspect = state.size.width / Math.max(1, state.size.height);
    const viewportWorldHeight = VIEWPORT_WORLD_WIDTH / aspect;
    const dy = -placement.entryOffsetVw.y * ENTRY_DISTANCE_MULTIPLIER * viewportWorldHeight * remaining;

    incoming.position.set(geo.restPosition.x + dx, geo.restPosition.y + dy, geo.restPosition.z + dz);
    incoming.rotation.y = deltaTheta + THREE.MathUtils.degToRad(tiltDeg);
    incoming.scale.setScalar(incomingScale);
    incoming.visible = t < bandEnd;
    (incoming.material as THREE.MeshBasicMaterial).opacity = t <= bandStart ? 1 : t >= bandEnd ? 0 : 1 - (t - bandStart) / (bandEnd - bandStart);

    // --- ATTACHED: fixed rest transform, forever. The ONLY thing that moves on it is the tiny post-contact settle scale — no position, no rotation, ever. ---
    attached.position.copy(geo.restPosition);
    attached.rotation.y = 0;
    attached.scale.setScalar(t <= CONTACT_T ? 1.02 : settleScale(t));
    attached.visible = t >= bandStart;
    (attached.material as THREE.MeshBasicMaterial).opacity = t <= bandStart ? 0 : t >= bandEnd ? 1 : (t - bandStart) / (bandEnd - bandStart);
  });

  if (!loaded || !geo) return null;

  return (
    <>
      <mesh ref={incomingRef} geometry={geo.geometry} visible={false}>
        <meshBasicMaterial
          map={loaded.texture}
          transparent
          alphaTest={0.05}
          depthWrite={true}
          onBeforeCompile={frontFacingFadeOnBeforeCompile}
        />
      </mesh>
      <mesh ref={attachedRef} geometry={geo.geometry} visible={false}>
        <meshBasicMaterial
          map={loaded.texture}
          transparent
          alphaTest={0.05}
          depthWrite={true}
          onBeforeCompile={frontFacingFadeOnBeforeCompile}
        />
      </mesh>
    </>
  );
}
