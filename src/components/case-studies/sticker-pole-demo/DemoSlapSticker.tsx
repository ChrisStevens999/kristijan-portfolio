"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  CYLINDER_RADIUS,
  RADIAL_SEGMENTS,
  STICKER_SURFACE_RADIUS_OFFSET,
  type StickerPlacement,
} from "@/content/projects/sticker-archive";
import { SLAP_TEXTURE_PAD, useSingleStickerTexture } from "../sticker-archive/useSingleStickerTexture";
import {
  APPROACH_DURATION,
  CROSSFADE_DURATION,
  HOVER_DRIFT,
  HOVER_FRACTION,
  INCOMING_FACE_CAMERA,
  INCOMING_START_SCALE,
  RADIAL_PUSH_RADII,
  ROTATION_RAD_PER_S,
  SETTLE_DURATION,
  VERTICAL_SPEED,
  demoWidthFrac,
  eventFor,
} from "./demoConfig";

const CIRCUMFERENCE = 2 * Math.PI * CYLINDER_RADIUS;

/**
 * Fraction of the entry offset still to cover at approach progress u:
 * a slow linear drift while hovering (1 -> 1-HOVER_DRIFT over the first
 * HOVER_FRACTION), then the slam — the archive's sharp cubic ease-out
 * (decisive stop, no bounce) over the rest. The velocity jump where the
 * slam starts is deliberate: that's the "hand" hitting it.
 */
function approachRemaining(u: number) {
  if (u <= HOVER_FRACTION) return 1 - HOVER_DRIFT * (u / HOVER_FRACTION);
  const v = (u - HOVER_FRACTION) / (1 - HOVER_FRACTION);
  return (1 - HOVER_DRIFT) * (1 - v) ** 3;
}

/** 1.02 to 0.985 to 1.0 over the settle window, two monotonic segments, no overshoot (identical shape to the archive's settle). */
function settleScale(v: number) {
  const DIP_AT = 0.4;
  if (v <= DIP_AT) {
    const l2 = v / DIP_AT;
    return 1.02 + (0.985 - 1.02) * (1 - (1 - l2) ** 2);
  }
  const l2 = (v - DIP_AT) / (1 - DIP_AT);
  return 0.985 + (1.0 - 0.985) * (1 - (1 - l2) ** 2);
}

/** Shared demo clock — one object mutated by DemoScene each frame, read by every sticker. */
export interface DemoClock {
  t: number;
  /** Playback rate; 1 = real time. Only ever not 1 via the dev URL overrides (see readClockOverrides). */
  speed: number;
}

/**
 * Time-driven port of the archive's two-mesh slap sticker (see
 * ../sticker-archive/SlapSticker.tsx for the full rationale of the
 * incoming/attached crossfade — this keeps that architecture exactly):
 *
 *  - INCOMING mesh: flies in from the upper-right (or -left), bigger than
 *    life, partly facing the camera, and lands on the pole at contact;
 *    fades out over CROSSFADE_DURATION starting exactly at contact.
 *  - ATTACHED mesh: sits at the fixed rest pose on the pole surface, hidden
 *    until the exact contact instant, fades in over the same band, plays
 *    the tiny settle, then just rides the pole (it's a child of the
 *    rotating/descending sticker group) until it's below the frame.
 *
 * Everything is a pure function of the demo clock — no accumulated state.
 * The mesh is built once, centred at theta=0 (facing +Z); each frame its
 * WORLD rest pose is derived directly from the event: at t_land it sits at
 * the front (theta_offset) at height y_land, and from there it turns with
 * the pole (w per second) and drops with it (s per second). Doing this in
 * world space (rather than parenting to a rotating group) keeps the entry
 * offsets literal screen-space displacements under the fixed orthographic
 * camera.
 */
export function DemoSlapSticker({
  index,
  placement,
  clockRef,
}: {
  index: number;
  placement: StickerPlacement;
  clockRef: React.RefObject<DemoClock>;
}) {
  const incomingRef = useRef<THREE.Mesh>(null);
  const attachedRef = useRef<THREE.Mesh>(null);
  const loaded = useSingleStickerTexture(placement.src, placement.rotationDeg);
  const widthFrac = demoWidthFrac(index);

  const geo = useMemo(() => {
    if (!loaded) return null;
    const patchWidthWorld = widthFrac * CIRCUMFERENCE * SLAP_TEXTURE_PAD;
    const patchHeightWorld = patchWidthWorld * loaded.aspect;
    const thetaLength = patchWidthWorld / CYLINDER_RADIUS;
    // Slightly proud of the metal, plus a per-sticker micro-step so no two
    // patches are ever coplanar — same reasoning as the archive.
    const radius = CYLINDER_RADIUS + STICKER_SURFACE_RADIUS_OFFSET + 0.004 + index * 0.0005;
    const segments = Math.max(6, Math.round(RADIAL_SEGMENTS * (thetaLength / (Math.PI * 2))));
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      patchHeightWorld,
      segments,
      1,
      true,
      -thetaLength / 2,
      thetaLength,
    );
    // Pivot around the patch's own centre (so scale/tilt don't slide it
    // radially). The centre's distance from the axis (restRadius, less than
    // the built radius because the patch is curved) is where the mesh
    // origin must be placed for the geometry to land back exactly on the
    // surface.
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox!.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    return { geometry, restRadius: center.z, halfHeight: patchHeightWorld / 2 };
  }, [loaded, widthFrac, index]);

  useFrame((state) => {
    const incoming = incomingRef.current;
    const attached = attachedRef.current;
    if (!incoming || !attached || !geo) return;

    const t = clockRef.current.t;
    const ev = eventFor(index, t);
    const hide = () => {
      incoming.visible = false;
      attached.visible = false;
    };
    if (!ev) return hide();

    const tStart = ev.tLand - APPROACH_DURATION;
    if (t < tStart) return hide();

    // Stacking follows LANDING ORDER, not asset order: a sticker slapped on
    // later always sits on top of whatever is already on the pole, like
    // real stickers. All sticker meshes have depthWrite off, so among
    // themselves renderOrder alone decides who's on top — later contact
    // time = higher order. The incoming mesh is lifted above every landed
    // sticker (any of them) while it's still flying in.
    attached.renderOrder = 10 + ev.tLand;
    incoming.renderOrder = 1e6 + ev.tLand;

    const cam = state.camera as THREE.OrthographicCamera;
    const halfW = cam.right;
    const halfH = cam.top;

    // Rest pose in WORLD space at time t: the pole has turned by w*(t -
    // t_land) and dropped by s*(t - t_land) since contact (or will have, if
    // t < t_land — the same formula gives where the landing spot is right
    // now, which is exactly what the incoming flight must home in on).
    const thetaWorld = ev.thetaOffset + ROTATION_RAD_PER_S * (t - ev.tLand);
    const yWorld = ev.yLand - VERTICAL_SPEED * (t - ev.tLand);
    if (yWorld < -halfH - geo.halfHeight - 0.4) return hide();
    const restX = geo.restRadius * Math.sin(thetaWorld);
    const restZ = geo.restRadius * Math.cos(thetaWorld);

    // --- INCOMING: hover, then slam. ---
    const u = Math.min(1, (t - tStart) / APPROACH_DURATION);
    const remaining = approachRemaining(u);
    const inScale = 1.02 + (INCOMING_START_SCALE - 1.02) * remaining;
    // Entry offset is a plain screen-space displacement (the camera is
    // orthographic and fixed, so world x/y ARE screen axes) plus a push
    // toward the camera that keeps the big curved patch clear of the metal
    // for the whole flight. All three go to exactly 0 at contact. The
    // vertical start is capped so the hovering sticker's centre never goes
    // more than a fifth of its (enlarged) height above the top edge — it
    // must be SEEN hovering, partly off-frame like the reference, not
    // hidden above the stage until the slam.
    const entryDy = Math.min(
      ev.entryY * 2 * halfH,
      halfH - 0.2 * geo.halfHeight * INCOMING_START_SCALE - ev.yLand,
    );
    incoming.position.set(
      restX + ev.entryX * 2 * halfW * remaining,
      yWorld + entryDy * remaining,
      restZ + RADIAL_PUSH_RADII * CYLINDER_RADIUS * remaining,
    );
    // Mostly flat to the camera while hovering (yaw blended toward 0),
    // fully wrapped onto the pole at contact; the in-plane tilt (roll)
    // straightens out over the same flight.
    incoming.rotation.set(0, thetaWorld * (1 - INCOMING_FACE_CAMERA * remaining), THREE.MathUtils.degToRad(ev.tiltDeg * remaining));
    incoming.scale.setScalar(inScale);
    const sinceContact = t - ev.tLand;
    incoming.visible = sinceContact < CROSSFADE_DURATION;
    (incoming.material as THREE.MeshBasicMaterial).opacity =
      sinceContact <= 0 ? 1 : Math.max(0, 1 - sinceContact / CROSSFADE_DURATION);

    // --- ATTACHED: the rest pose, scale-only settle, rides the pole. ---
    attached.position.set(restX, yWorld, restZ);
    attached.rotation.set(0, thetaWorld, 0);
    attached.scale.setScalar(sinceContact <= 0 ? 1.02 : settleScale(Math.min(1, sinceContact / SETTLE_DURATION)));
    attached.visible = sinceContact >= 0;
    (attached.material as THREE.MeshBasicMaterial).opacity =
      sinceContact <= 0 ? 0 : Math.min(1, sinceContact / CROSSFADE_DURATION);
  });

  if (!loaded || !geo) return null;

  // depthWrite off + explicit renderOrder: same transparency rules as the
  // archive's rendering-fix pass (see SlapSticker.tsx); the actual order is
  // set per event in useFrame (landing order), these are just the initial
  // values before the first event.
  return (
    <>
      <mesh ref={incomingRef} geometry={geo.geometry} visible={false} renderOrder={1e6}>
        <meshBasicMaterial map={loaded.texture} transparent alphaTest={0.05} depthWrite={false} />
      </mesh>
      <mesh ref={attachedRef} geometry={geo.geometry} visible={false} renderOrder={10}>
        <meshBasicMaterial map={loaded.texture} transparent alphaTest={0.05} depthWrite={false} />
      </mesh>
    </>
  );
}
