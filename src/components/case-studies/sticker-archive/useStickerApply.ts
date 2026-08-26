"use client";

import { useTransform, type MotionValue } from "framer-motion";

/**
 * Width of the whole application transient as a fraction of total scroll
 * progress — short and decisive ("someone quickly slapping a sticker onto a
 * pole"), and substantially faster than the cylinder's own rotation (which
 * plays out across the full scroll range).
 */
export const APPLY_WINDOW = 0.035;

/** Fraction of APPLY_WINDOW spent approaching (rapid screen-space travel) before contact — the requested 20–30%. */
export const CONTACT_T = 0.25;

function easeOutExpo(x: number) {
  return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
function easeInOutQuad(x: number) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
function easeInQuad(x: number) {
  return x * x;
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Impact transient window — starts rising just before contact, peaks exactly at CONTACT_T, gone shortly after. */
const IMPACT_RISE = CONTACT_T * 0.55;
const IMPACT_FALL_END = CONTACT_T + 0.12;

export interface StickerApply {
  /**
   * 0 before `appliedAt`, ramping to 1 IN SYNC with the whole approach
   * phase (not an instant pop) — matching the reference footage, where a
   * new sticker is progressively revealed sliding in from off-frame over a
   * genuinely visible beat, not flashing to full opacity immediately.
   */
  reveal: MotionValue<number>;
  /**
   * 0 while approaching (flat, screen-space, always fully lit, always in
   * front of everything), snaps to 1 exactly at CONTACT_T, then holds 1
   * forever. Drives both the entry-offset decay AND the flat→cylindrical
   * transform handoff in StickerSurfaceItem's update loop — one curve, so "arrives at
   * its target" and "becomes part of the cylinder system" happen at the
   * exact same instant, geometrically aligned (see baseAngleFor in the
   * content file, which points the sticker's cylindrical angle at dead
   * front for this exact moment).
   */
  blend: MotionValue<number>;
  /**
   * Multiplies resting scale — the reference shows a sticker at essentially
   * CONSTANT size the whole time it's flying in (it becomes more visible as
   * it slides into frame, it doesn't grow), so this stays at 1 through the
   * entire approach and only does the requested tiny 1.03 → 0.99 → 1.00
   * settle right at and after contact. Small, deterministic, no spring
   * physics.
   */
  scaleMul: MotionValue<number>;
  /** 1 once fully settled (progress past appliedAt + APPLY_WINDOW) — gates interactivity so nothing is clickable mid-animation. */
  settled: MotionValue<number>;
  /**
   * 0 except for a short transient (rise → 1 at CONTACT_T → gone by
   * CONTACT_T+0.12) — a physical "thud" at the exact instant of contact.
   * Drives a small shared rotateZ kick, a contact-shadow flash, and a
   * brightness pop in StickerSurfaceItem, so the sticker reads as SLAPPED
   * onto the surface rather than smoothly interpolated into place.
   */
  impact: MotionValue<number>;
}

/**
 * Drives a sticker's one-time APPROACH → CONTACT → SETTLE → LOCK
 * application — entirely a pure function of scroll progress (no timers), so
 * it's exactly reversible and scrubbable without ever glitching. Once
 * `progress` clears `appliedAt + APPLY_WINDOW`, every value here is at its
 * neutral/resting state — the sticker becomes indistinguishable from one
 * that was always on the surface. No further animation plays after that.
 */
export function useStickerApply(progress: MotionValue<number>, appliedAt: number): StickerApply {
  const t = useTransform(progress, (p) => clamp01((p - appliedAt) / APPLY_WINDOW));

  // Ramps across the whole approach phase, matching the reference's
  // gradual slide-into-frame reveal rather than an instant pop.
  const reveal = useTransform(t, (v) => (v <= 0 ? 0 : Math.min(1, v / CONTACT_T)));

  const blend = useTransform(t, (v) => {
    if (v <= 0) return 0;
    if (v < CONTACT_T) return easeOutExpo(v / CONTACT_T);
    return 1;
  });

  // Constant size (1) through the whole approach — the reference sticker
  // doesn't grow, it's revealed at full size. Only right at/after contact
  // does the requested tiny 1.03 -> 0.99 -> 1.00 settle bump play.
  const DIP_END = CONTACT_T + 0.25;
  const scaleMul = useTransform(t, (v) => {
    if (v <= 0) return 1;
    if (v < CONTACT_T) return 1;
    if (v < DIP_END) return lerp(1.03, 0.99, easeInOutQuad((v - CONTACT_T) / (DIP_END - CONTACT_T)));
    return lerp(0.99, 1, easeInOutQuad(clamp01((v - DIP_END) / (1 - DIP_END))));
  });

  const settled = useTransform(t, (v) => (v >= 1 ? 1 : 0));

  // Sharp rise into contact, sharp fall out of it — a transient, not a
  // smooth bump, so it reads as an impact rather than another easing curve.
  const impact = useTransform(t, (v) => {
    if (v <= IMPACT_RISE || v >= IMPACT_FALL_END) return 0;
    if (v < CONTACT_T) return easeInQuad((v - IMPACT_RISE) / (CONTACT_T - IMPACT_RISE));
    return 1 - easeInOutQuad((v - CONTACT_T) / (IMPACT_FALL_END - CONTACT_T));
  });

  return { reveal, blend, scaleMul, settled, impact };
}
