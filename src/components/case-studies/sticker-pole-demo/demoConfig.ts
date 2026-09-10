import { stickerPlacements } from "@/content/projects/sticker-archive";

/**
 * Tuning for the autoplaying "sticker pole" DEMO — a separate copy of the
 * Sticker Archive idea rebuilt to match the supplied reference video
 * (StickerAPP_StickerCollection_Anim_Post_V04, a 620x774 @ 60fps post):
 *
 *   - a chrome pole in a PORTRAIT frame, pole ≈ 52% of the frame width
 *   - continuous slow rotation (one full turn ≈ 9.3s ⇒ ~38.6°/s) while the
 *     pole steadily descends (camera panning UP it, ≈ 0.18 frame-heights/s)
 *   - stickers slap on one after another, ~0.7s apart, each entering big
 *     from the upper-right (partly off-frame), landing in the upper-middle
 *     of the frame, then riding the pole down and out of the bottom
 *   - a weathered yellow clamp on the pole's side and horizontal weld
 *     seams, both repeating up the pole
 *
 * Every number here was read off frames of that video, not guessed. The
 * approved, scroll-driven Sticker Archive (../sticker-archive) is NOT
 * touched by any of this; this folder only imports its untouched shared
 * helpers (metal texture, single-sticker texture builder, content
 * constants).
 */

/** The reference post is 620x774 — the stage keeps exactly that shape regardless of viewport. */
export const STAGE_ASPECT = 620 / 774;
/** Pole diameter as a fraction of the stage width — measured ≈ 320px of 620 in the reference. */
export const POLE_FRAME_FRACTION_DEMO = 0.52;

/**
 * Rotation is BARELY there in the reference: tracking one sticker
 * ("MOTION SICKNESS") across a full second of frames, its angle round the
 * pole drifts by only ~1–2°, and the clamp sits at the same place on the
 * left edge at 0s, 5.5s and 7.5s. A slow ~1.5°/s keeps the surface alive
 * without stickers ever sliding round the side. Positive = surface moves
 * left-to-right across the front. (The clamp is deliberately NOT in the
 * rotating group — see DemoScene — so it stays pinned to the left edge
 * exactly like the reference's.)
 */
export const ROTATION_RAD_PER_S = (1.5 * Math.PI) / 180;
/**
 * Pole descends (camera pans up) FAST: a landed sticker drops ≈260px of the
 * 774px frame per second (measured f_012→f_013→f_015), i.e. ≈0.336
 * frame-heights/s; the frame is ≈7.68 world units tall. Each sticker is on
 * screen for ~3s, so ~4 are visible at once, as in the reference.
 */
export const VERTICAL_SPEED = 2.58;
/**
 * Vertical repeat of the pole SHELL (seams + clamp): the shell group's Y is
 * taken modulo this so the pole is effectively infinite. Must be a whole
 * (even, since the metal texture uses mirrored repeat) number of
 * METAL_TILE_WORLD_SIZE (0.6) tiles so the wrap is pixel-identical: 14.4 =
 * 24 tiles ≈ two frame heights, so the clamp comes round every ~5.6s —
 * about how often it re-enters in the reference.
 */
export const VERTICAL_PERIOD = 14.4;
/** Shell cylinder height — three periods, so the modulo-shifted shell always covers the frame with margin. */
export const SHELL_HEIGHT = VERTICAL_PERIOD * 3;

/** Time between consecutive slaps (~13 slaps over the 9.3s reference). */
export const SLAP_CADENCE = 0.72;
/**
 * First-visible to contact. In the reference an incoming sticker is
 * visibly hovering — big, tilted, half off-frame — for a good half
 * second (often two are in the air at once), THEN gets slapped down fast.
 * Split into a slow-drift hover (HOVER_FRACTION of the duration, closing
 * only HOVER_DRIFT of the distance) and a decisive slam for the rest.
 */
export const APPROACH_DURATION = 0.8;
export const HOVER_FRACTION = 0.5;
export const HOVER_DRIFT = 0.18;
/** Post-contact settle (1.02 to 0.985 to 1.0), scale-only, same shape as the approved archive. */
export const SETTLE_DURATION = 0.16;
/** incoming-to-attached opacity handoff, starting exactly at contact (real seconds, ~2 frames). */
export const CROSSFADE_DURATION = 0.03;
/** The reference starts with several stickers already on the pole — start the timeline this far in. */
export const CLOCK_START = 8;

/**
 * Dev-only URL overrides for checking the picture at an exact instant:
 * `?t=12.4` starts the clock there, `?speed=0` freezes it (any factor
 * works, e.g. 0.25 for slow motion). Both are ignored when absent, so the
 * page itself is unaffected.
 */
export function readClockOverrides(search: string): { t: number; speed: number } {
  const params = new URLSearchParams(search);
  const t = Number(params.get("t"));
  const speed = Number(params.get("speed"));
  return {
    t: params.has("t") && Number.isFinite(t) ? t : CLOCK_START,
    speed: params.has("speed") && Number.isFinite(speed) ? speed : 1,
  };
}
/** Incoming stickers read noticeably bigger than their landed size in the reference (~1.3x). */
export const INCOMING_START_SCALE = 1.3;
/** How far toward the camera (in radii) the incoming sticker starts — invisible to the orthographic camera, but it keeps a big curved patch clear of the metal for the whole flight. */
export const RADIAL_PUSH_RADII = 1.2;
/** How much the incoming sticker faces the CAMERA rather than wrapping the pole, at the start of its flight (0 = fully wrapped like the archive, 1 = flat to camera). Blends to fully wrapped at contact. */
export const INCOMING_FACE_CAMERA = 0.7;

/** Where (camera-space Y, world units) stickers land — upper-middle of the frame, as in the reference. */
export const LAND_Y_MIN = 1.6;
export const LAND_Y_MAX = 2.6;
/** Landings spread left/right of dead-front by up to this much... */
export const LAND_THETA_JITTER_DEG = 32;
/**
 * ...but never so far that the artwork's far edge wraps past this angle
 * from dead-front — the reference's stickers all read as flat-on, fully
 * visible; a wide sticker landed off-centre would otherwise disappear
 * round the side. (Artwork half-angle in radians = its screen fraction.)
 */
export const LAND_EDGE_LIMIT_DEG = 62;
/** Entry start offset, as fractions of the stage's own width/height: mostly from ABOVE (partly off the top edge), with a modest sideways component. */
export const ENTRY_X_VW = 0.22;
export const ENTRY_Y_VH = 0.42;
/** The reference's stickers arrive from the upper-left about as often as the upper-right. */
export const ENTRY_FROM_LEFT_CHANCE = 0.45;
/** In-plane tilt (roll) while hovering — the reference's incoming stickers sit visibly askew, then straighten as they land. */
export const ENTRY_TILT_DEG = 18;

/** Sticker sizes as a fraction of the visible pole width — the reference's stickers are big (roughly 40–65%). */
export const SCREEN_FRACTION_MIN = 0.4;
export const SCREEN_FRACTION_MAX = 0.65;

export const STICKER_COUNT_DEMO = stickerPlacements.length;
/** All N stickers cycle through once per SUPER_CYCLE, then repeat (each lands, rides off the bottom, and is free again long before its next turn). */
export const SUPER_CYCLE = STICKER_COUNT_DEMO * SLAP_CADENCE;

/** Deterministic [0,1) hash — same input, same output, every load (no Math.random anywhere, so the demo is reproducible frame-for-frame). */
export function hash01(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Per-(sticker, event, salt) random in [0,1). */
function rnd(i: number, k: number, salt: number): number {
  return hash01(i * 7919 + k * 104729 + salt * 1301);
}

/** Deterministic shuffle of sticker indices so slaps don't run in asset order. */
const ORDER: number[] = (() => {
  const idx = Array.from({ length: STICKER_COUNT_DEMO }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(hash01(i * 31 + 7) * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
})();
/** Slot number (0..N-1) each sticker occupies within a super-cycle. */
const SLOT_OF: number[] = (() => {
  const s = new Array<number>(STICKER_COUNT_DEMO);
  ORDER.forEach((stickerIndex, slot) => {
    s[stickerIndex] = slot;
  });
  return s;
})();

/** Fixed per-sticker size — a fraction of the full circumference, same relationship the archive's widthFracFor uses (target / pi). */
export function demoWidthFrac(i: number): number {
  const sf = SCREEN_FRACTION_MIN + (SCREEN_FRACTION_MAX - SCREEN_FRACTION_MIN) * hash01(i * 17 + 3);
  return sf / Math.PI;
}

export interface SlapEvent {
  /** Which repetition of this sticker (0 = first). */
  k: number;
  /** Contact instant, demo seconds. */
  tLand: number;
  /** Camera-space Y at contact. */
  yLand: number;
  /** Angle left/right of dead-front at contact (radians). */
  thetaOffset: number;
  /** Entry start offsets as fractions of the stage width/height (+x right, +y up). */
  entryX: number;
  entryY: number;
  tiltDeg: number;
}

/**
 * The one event (if any) that could be on screen for sticker i at time t.
 * Consecutive events for the same sticker are SUPER_CYCLE apart, and a
 * sticker is fully off the bottom of the frame well within that, so at
 * most one is ever live — this is a pure function of t, no state, no
 * spawner, no pooling: scrub t anywhere and you get the same picture.
 */
export function eventFor(i: number, t: number): SlapEvent | null {
  const base = SLOT_OF[i] * SLAP_CADENCE;
  const k = Math.floor((t - base + APPROACH_DURATION) / SUPER_CYCLE);
  if (k < 0) return null;
  const tLand = base + k * SUPER_CYCLE + (rnd(i, k, 1) - 0.5) * 0.16;
  const yLand = LAND_Y_MIN + (LAND_Y_MAX - LAND_Y_MIN) * rnd(i, k, 2);
  const maxOffset = Math.max(
    0,
    Math.min((LAND_THETA_JITTER_DEG * Math.PI) / 180, (LAND_EDGE_LIMIT_DEG * Math.PI) / 180 - demoWidthFrac(i) * Math.PI),
  );
  const thetaOffset = (rnd(i, k, 3) - 0.5) * 2 * maxOffset;
  const fromLeft = rnd(i, k, 4) < ENTRY_FROM_LEFT_CHANCE;
  const entryX = (fromLeft ? -1 : 1) * ENTRY_X_VW * (0.85 + 0.3 * rnd(i, k, 5));
  const entryY = ENTRY_Y_VH * (0.8 + 0.4 * rnd(i, k, 6));
  const tiltDeg = (fromLeft ? -1 : 1) * ENTRY_TILT_DEG * (0.6 + 0.8 * rnd(i, k, 7));
  return { k, tLand, yLand, thetaOffset, entryX, entryY, tiltDeg };
}
