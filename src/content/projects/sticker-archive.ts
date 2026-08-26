import type { StaticImageData } from "next/image";

import { APPLY_WINDOW, CONTACT_T } from "@/components/case-studies/sticker-archive/useStickerApply";

import arcade from "../../../assets/projects/Sticker Illustrations/arcade_sticker.png";
import babyBoomers from "../../../assets/projects/Sticker Illustrations/BabyBoomers-Sticker-Front.png";
import blushingDuck from "../../../assets/projects/Sticker Illustrations/Blushing Duck-Sticker-Front.png";
import cookies from "../../../assets/projects/Sticker Illustrations/Cookies Sticker-Front.png";
import illunis from "../../../assets/projects/Sticker Illustrations/Illunis Sticker-Front.png";
import lvGlock from "../../../assets/projects/Sticker Illustrations/LV Sticker.png";
import miamiViceTiger from "../../../assets/projects/Sticker Illustrations/Miami Vice Tiger C-Drip Sticker-Front.png";
import rhodesianTiger from "../../../assets/projects/Sticker Illustrations/RhodesianTiger-Sticker-Front.png";
import medusa from "../../../assets/projects/Sticker Illustrations/Sticker-5-Medusa-Front.png";
import cyberSkull from "../../../assets/projects/Sticker Illustrations/StickerFront-CODRedTiger.png";
import subzero from "../../../assets/projects/Sticker Illustrations/Subzero Sticker.png";
import hornedSkull from "../../../assets/projects/Sticker Illustrations/violet_sticker.png";
import generic1 from "../../../assets/projects/Sticker Illustrations/Sticker Front.png";
import generic2 from "../../../assets/projects/Sticker Illustrations/Sticker- Front.png";
import generic3 from "../../../assets/projects/Sticker Illustrations/Sticker-6- Front.png";
import generic4 from "../../../assets/projects/Sticker Illustrations/Sticker-Front (1).png";
import generic5 from "../../../assets/projects/Sticker Illustrations/Sticker-Front (2).png";
import generic6 from "../../../assets/projects/Sticker Illustrations/Sticker-Front 1.png";
import generic7 from "../../../assets/projects/Sticker Illustrations/Sticker-Front Dob.png";
import generic8 from "../../../assets/projects/Sticker Illustrations/Sticker-Front Mag Cut.png";
import generic9 from "../../../assets/projects/Sticker Illustrations/Sticker-Front N.png";
import generic10 from "../../../assets/projects/Sticker Illustrations/Sticker-Front p.png";
import generic11 from "../../../assets/projects/Sticker Illustrations/Sticker-Front SW.png";
import generic12 from "../../../assets/projects/Sticker Illustrations/Sticker-Front.png";
import generic13 from "../../../assets/projects/Sticker Illustrations/Sticker-SB-Front.png";

/**
 * The full sticker archive — one entry per die-cut graphic. Every sticker is
 * rendered as a segmented cylindrical surface (see StickerSurfaceItem); size
 * tier controls how many slices it gets (SIZE_TIERS below).
 *
 * To add a sticker: drop the transparent PNG into
 * `assets/projects/Sticker Illustrations/`, import it, and add one
 * `{ src, alt }` line to `rawStickers`. Tier, vertical spot, reveal point and
 * entry direction are all filled in automatically by deterministic formulas.
 * `angle` is DERIVED from `appliedAt` (see appliedAtFor/baseAngleFor) so that
 * every sticker lands front-and-centre on the pole at the exact moment it
 * makes contact — that's what makes the flat→cylindrical handoff invisible.
 * Override any field to art-direct a specific sticker.
 */
export type SizeTier = "small" | "medium" | "large";

export interface StickerDatum {
  src: StaticImageData;
  alt: string;
  /** Degrees around the cylinder AT PROGRESS 0. Derived so the sticker is front-and-centre at the exact moment it contacts the surface — not freely chosen. */
  angle: number;
  /** 0–1 position down the surface (0 = top, 1 = bottom). Fixed forever once applied. */
  vertical: number;
  sizeTier: SizeTier;
  /** Front-facing display width in px at the baseline radius; scales with the cylinder. */
  size: number;
  /** Slice count for the segmented renderer — from SIZE_TIERS, by sizeTier. */
  segments: number;
  /** Scroll progress (0–1, can be slightly negative) at which this sticker begins its approach. Deterministic — see REVEAL_CHECKPOINTS. */
  appliedAt: number;
  /** Deterministic screen-space entrance direction — see ENTRY_DIRECTIONS. Never randomized. */
  entryDx: number;
  entryDy: number;
  /** Optional cluster label — related stickers sit near each other. */
  group?: string;
}

type StickerInput = Partial<StickerDatum> & Pick<StickerDatum, "src" | "alt">;

/** size (px) + slice count per tier — mostly medium, a few hero-scale larges, some small, per the art direction: readable density, not a sticker bomb. */
const SIZE_TIERS: Record<SizeTier, { size: number; segments: number }> = {
  large: { size: 460, segments: 14 },
  medium: { size: 300, segments: 10 },
  small: { size: 190, segments: 6 },
};

// 4 large / 14 medium / 7 small across 25 stickers — checked large first so
// it wins ties with small's %3 rule.
function tierFor(index: number): SizeTier {
  if (index % 8 === 0) return "large";
  if (index % 3 === 0) return "small";
  return "medium";
}

const rawStickers: StickerInput[] = [
  { src: miamiViceTiger, alt: "Miami Vice tiger sticker", group: "tigers" },
  { src: rhodesianTiger, alt: "Rhodesian tiger sticker", group: "tigers" },
  { src: medusa, alt: "Fake Love Medusa sticker" },
  { src: cyberSkull, alt: "Warrior cyber-skull sticker", group: "skulls" },
  { src: hornedSkull, alt: "Horned skull sticker", group: "skulls" },
  { src: cookies, alt: "Camo skull sticker", group: "skulls" },
  { src: subzero, alt: "Warrior shield sticker" },
  { src: lvGlock, alt: "LV Warrior pistol sticker" },
  { src: arcade, alt: "Arcade cabinet sticker" },
  { src: babyBoomers, alt: "Pop-art warrior sticker" },
  { src: blushingDuck, alt: "Blushing duck sticker" },
  { src: illunis, alt: "Illunis sticker" },
  { src: generic1, alt: "Graphic sticker" },
  { src: generic2, alt: "Graphic sticker" },
  { src: generic3, alt: "Graphic sticker" },
  { src: generic4, alt: "Graphic sticker" },
  { src: generic5, alt: "Graphic sticker" },
  { src: generic6, alt: "Graphic sticker" },
  { src: generic7, alt: "Graphic sticker" },
  { src: generic8, alt: "Graphic sticker" },
  { src: generic9, alt: "Graphic sticker" },
  { src: generic10, alt: "Graphic sticker" },
  { src: generic11, alt: "Graphic sticker" },
  { src: generic12, alt: "Graphic sticker" },
  { src: generic13, alt: "Graphic sticker" },
];

/**
 * Net rotation across the whole scroll range. Bumped up from the previous
 * pass (1.15 turns) so an attached sticker actually completes enough of an
 * orbit to rotate out of the readable front arc and spend real time behind
 * the pole before the journey ends — otherwise every sticker ever applied
 * stays semi-visible forever and the far end of the scroll turns into a
 * pile-up instead of the ~4–7-readable-at-once density this page wants.
 */
export const CYLINDER_TURNS = 1.6;

/**
 * How many stickers are attached by each scroll-progress checkpoint — a
 * few already on the pole at rest, then a steady trickle across the WHOLE
 * scroll range (not front-loaded) so there's always room for older stickers
 * to rotate away before the next ones land. Last checkpoint stops at 0.95,
 * not 1.0 — progress can't exceed 1, so the final sticker's APPLY_WINDOW
 * needs headroom before the scroll range runs out or it would never finish
 * settling.
 * [checkpointProgress, cumulativeStickerCount]
 */
const REVEAL_CHECKPOINTS: [progress: number, count: number][] = [
  [-0.02, 5],
  [0.15, 9],
  [0.32, 13],
  [0.5, 17],
  [0.68, 20],
  [0.82, 23],
  [0.95, 25],
];

const ENTRY_DIRECTIONS: { x: number; y: number }[] = [
  { x: -1, y: -0.35 }, // upper-left, mostly horizontal
  { x: 1, y: -0.35 }, // upper-right
  { x: -1, y: 0.05 }, // left, level
  { x: 1, y: 0.05 }, // right, level
  { x: 0, y: -1 }, // straight above
  { x: -0.45, y: -0.95 }, // steep upper-left
  { x: 0.45, y: -0.95 }, // steep upper-right
];
/** Entry travel distance as a multiple of the sticker's own baseline size. */
const ENTRY_DISTANCE_FACTOR = 1.05;

function appliedAtFor(index: number): number {
  let prevProgress = -0.09;
  let prevCount = 0;
  for (const [checkpointProgress, count] of REVEAL_CHECKPOINTS) {
    if (index < count) {
      const batchSize = count - prevCount;
      const posInBatch = index - prevCount;
      const span = checkpointProgress - prevProgress;
      return prevProgress + (span * (posInBatch + 1)) / batchSize;
    }
    prevProgress = checkpointProgress;
    prevCount = count;
  }
  return prevProgress; // unreachable for 25 stickers, kept as a safe fallback
}

function normalizeDeg(a: number) {
  return ((a % 360) + 360) % 360;
}

/**
 * The sticker's angle AT PROGRESS 0, chosen backwards from its own contact
 * moment so that `baseAngle + contactProgress·sweep` lands it dead front
 * (plus a small deliberate jitter so 25 stickers don't all land in exactly
 * the same spot). This is what makes "flies in flat" and "locks into the
 * cylindrical transform" line up geometrically instead of popping.
 */
function baseAngleFor(index: number, appliedAt: number): number {
  const sweepDeg = CYLINDER_TURNS * 360;
  const contactProgress = appliedAt + CONTACT_T * APPLY_WINDOW;
  const jitterDeg = ((index * 29) % 37) - 18; // roughly -18..+18, deterministic
  return normalizeDeg(-contactProgress * sweepDeg + jitterDeg);
}

function frac(n: number) {
  return ((n % 1) + 1) % 1;
}

export const stickers: StickerDatum[] = rawStickers.map((s, i) => {
  const tier = s.sizeTier ?? tierFor(i);
  const { size, segments } = SIZE_TIERS[tier];
  const appliedAt = s.appliedAt ?? appliedAtFor(i);
  const angle = s.angle ?? baseAngleFor(i, appliedAt);
  // Golden-ratio spread, decoupled from angle now that angle is derived from
  // application timing rather than chosen for even coverage.
  const vertical = s.vertical ?? frac(i * 0.618034);
  const dir = ENTRY_DIRECTIONS[(i * 3 + 2) % ENTRY_DIRECTIONS.length];
  const entryDistance = (s.size ?? size) * ENTRY_DISTANCE_FACTOR;

  return {
    src: s.src,
    alt: s.alt,
    angle,
    vertical,
    sizeTier: tier,
    size: s.size ?? size,
    segments: s.segments ?? segments,
    appliedAt,
    entryDx: s.entryDx ?? dir.x * entryDistance,
    entryDy: s.entryDy ?? dir.y * entryDistance,
    group: s.group,
  };
});

export const STICKER_COUNT = stickers.length;

/** Baseline cylinder radius (px) the `size` values are authored against. */
export const STICKER_BASE_RADIUS = 300;
