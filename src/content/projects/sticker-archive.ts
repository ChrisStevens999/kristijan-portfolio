import type { StaticImageData } from "next/image";

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
 * The sticker archive, rebuilt around a REAL three.js cylinder (see
 * StickerScene.tsx) instead of a DOM/CSS warp illusion. Every sticker here
 * is a fixed placement on ONE continuous cylindrical surface — a (u, v)
 * coordinate around the circumference and down a tall vertical texture atlas
 * — not an independently timed/animated element. The whole surface rotates
 * and travels vertically as one rigid object; stickers enter/leave frame
 * purely because the physical surface is moving past a fixed camera.
 *
 * To add a sticker: drop the transparent PNG into
 * `assets/projects/Sticker Illustrations/`, import it, and add one entry to
 * `rawStickers`. Placement (tier/u/v/rotation) is filled in deterministically
 * by `layoutStickers` below; override any field to art-direct a specific one.
 */
export type SizeTier = "small" | "medium" | "large";

export interface StickerPlacement {
  src: StaticImageData;
  alt: string;
  /** 0–1 around the cylinder's circumference. Fixed forever — this is a point on the physical surface, not a moment in time. */
  u: number;
  /** 0–1 down the tall texture atlas (0 = top of the pole's printed surface). */
  v: number;
  /** Sticker's on-atlas width as a fraction of the full atlas width (== full circumference). Derived from sizeTier via WIDTH_FRAC_BY_TIER. */
  widthFrac: number;
  /** Small deterministic rotation jitter, degrees — reads as hand-applied rather than machine-perfect. */
  rotationDeg: number;
  sizeTier: SizeTier;
}

type StickerInput = { src: StaticImageData; alt: string; sizeTier?: SizeTier; group?: string };

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

// 4 large / 14 medium / 7 small across 25 stickers — checked large first so
// it wins ties with small's %3 rule.
function tierFor(index: number): SizeTier {
  if (index % 8 === 0) return "large";
  if (index % 3 === 0) return "small";
  return "medium";
}

/**
 * Target on-screen width as a fraction of the VISIBLE pole width (the ~42%
 * of the frame the cylinder occupies), for a sticker centred at dead-front.
 * Converted to widthFrac (fraction of full circumference / atlas width)
 * below via: a front-facing sticker of angular width θ spans ≈ R·θ on
 * screen; visible pole width = 2R; so R·θ = target·2R  =>  θ = 2·target,
 * and widthFrac = θ / 2π = target / π.
 */
const TARGET_SCREEN_FRACTION: Record<SizeTier, number> = {
  small: 0.2, // 15–25%
  medium: 0.32, // 25–40%
  large: 0.475, // 40–55%
};

const WIDTH_FRAC_BY_TIER: Record<SizeTier, number> = {
  small: TARGET_SCREEN_FRACTION.small / Math.PI,
  medium: TARGET_SCREEN_FRACTION.medium / Math.PI,
  large: TARGET_SCREEN_FRACTION.large / Math.PI,
};

function frac(n: number) {
  return ((n % 1) + 1) % 1;
}

/**
 * Deterministic layout across the whole surface: 6 vertical bands (rows),
 * ~4 stickers per row spread evenly around the full circumference (with a
 * per-row phase offset so rows don't align into a grid — a brick-like
 * stagger), a small golden-ratio jitter within each row's vertical span so
 * nothing sits on a perfectly even line. Same formula every load — never
 * randomized.
 */
const ROWS = 6;

function layoutStickers(inputs: StickerInput[]): StickerPlacement[] {
  const rowSize = (row: number) => inputs.reduce((n, _s, i) => (i % ROWS === row ? n + 1 : n), 0);

  return inputs.map((s, i) => {
    const tier = s.sizeTier ?? tierFor(i);
    const row = i % ROWS;
    const k = Math.floor(i / ROWS); // this sticker's position among its row's members
    const size = rowSize(row);
    const bandStart = row / ROWS;
    const bandSpan = 1 / ROWS;
    const margin = bandSpan * 0.18;
    const vJitter = frac(i * 0.618034);
    const v = bandStart + margin + vJitter * (bandSpan - 2 * margin);
    const rowPhase = frac(row * 0.37);
    const u = frac((k + 0.5) / size + rowPhase);
    const rotationDeg = ((i * 47) % 13) - 6;

    return {
      src: s.src,
      alt: s.alt,
      u,
      v,
      widthFrac: WIDTH_FRAC_BY_TIER[tier],
      rotationDeg,
      sizeTier: tier,
    };
  });
}

export const stickerPlacements: StickerPlacement[] = layoutStickers(rawStickers);
export const STICKER_COUNT = stickerPlacements.length;

/** Sticker texture atlas resolution — wraps the FULL circumference horizontally, a tall multi-row surface vertically. */
export const ATLAS_WIDTH = 2048;
export const ATLAS_HEIGHT = 4096;

/** Cylinder radius, world units (arbitrary scene scale). */
export const CYLINDER_RADIUS = 1.6;
const CIRCUMFERENCE = 2 * Math.PI * CYLINDER_RADIUS;

/**
 * Derived (not hand-picked) so the atlas maps onto the cylinder at a
 * uniform, undistorted scale in both directions — same px-per-world-unit
 * horizontally and vertically — otherwise sticker artwork would stretch.
 */
export const CYLINDER_WORLD_HEIGHT = (ATLAS_HEIGHT / ATLAS_WIDTH) * CIRCUMFERENCE;

/** The pole should occupy ~40–45% of the visual frame width at rest. */
export const POLE_FRAME_FRACTION = 0.42;

/** 0.5–1.0 full rotations across the whole scroll section — subtle, revealing artwork rather than showing off spin. */
export const ROTATION_TURNS = 0.75;

/** Vertical travel across the whole scroll section, as a fraction of the tall surface's full height — "one full exploration sequence". */
export const VERTICAL_TRAVEL_WORLD = CYLINDER_WORLD_HEIGHT * 0.55;

/** Radial smoothness — within the requested 64–128 range. */
export const RADIAL_SEGMENTS = 96;
