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
 * `assets/projects/Sticker Illustrations/`, import it, add it to
 * `rawStickers`, and give it a row in MANUAL_LAYOUT below.
 *
 * Placement is HAND-AUTHORED (MANUAL_LAYOUT), one INDIVIDUAL entry per
 * sticker — not grouped into clusters. An earlier pass grouped stickers into
 * a few dense clumps with big gaps between them; that read as obvious
 * "cluster A / cluster B" collage blocks, not a real sticker-covered pole.
 * Each row here gets its own angle and vertical position, spread across the
 * full circumference and a compressed vertical band, so the composition
 * reads as one continuous surface with individually placed designs.
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

/**
 * Target on-screen width as a fraction of the VISIBLE pole width, for a
 * sticker centred at dead-front. Converted to widthFrac (fraction of full
 * circumference / atlas width) below via: a front-facing sticker of angular
 * width θ spans ≈ R·θ on screen; visible pole width = 2R; so R·θ = target·2R
 * => θ = 2·target, and widthFrac = θ / 2π = target / π.
 */
const TARGET_SCREEN_FRACTION: Record<SizeTier, number> = {
  small: 0.225, // 20–25%
  medium: 0.35, // 30–40%
  large: 0.5, // 45–55%
};

const WIDTH_FRAC_BY_TIER: Record<SizeTier, number> = {
  small: TARGET_SCREEN_FRACTION.small / Math.PI,
  medium: TARGET_SCREEN_FRACTION.medium / Math.PI,
  large: TARGET_SCREEN_FRACTION.large / Math.PI,
};

function normalizeDeg(a: number) {
  return ((a % 360) + 360) % 360;
}

/**
 * Hand-authored placement, one row per rawStickers entry (same order/index).
 *
 * `angleDeg` is chosen BACKWARDS from each sticker's intended reveal moment
 * — necessary because rotation only ever runs forward (0° → +160°): a
 * sticker placed at a positive angle only gets FURTHER from front as scroll
 * proceeds, it can never sweep into view.
 *
 * With 25 stickers and a ~65–90° "readably front-facing" arc, spacing every
 * sticker's peak moment across exactly ROTATION_TURNS·360° (160°) packs
 * roughly 10–14 of them inside that arc at once — much denser than the
 * reference. So these angles are spread across a WIDER virtual range (250°,
 * bigger than the 160° actually rotated) via
 * `angleDeg ≈ -progress · 250° + jitter`, progress a deterministic
 * golden-ratio spread (not sequential, so temporally-close stickers aren't
 * adjacent in this list). The stickers whose progress lands past what 160°
 * of rotation can bring to dead-front (roughly the second half) never fully
 * reach front-on — they stay part-foreshortened for their whole visible
 * window. That's deliberate, not a compromise: it's what supplies the
 * "always something partially wrapping the curved edge" texture, while the
 * ones that DO reach near-front stay to a readable 4–7 at any moment
 * (checked via pixel readback below).
 *
 * `v` is spread across a compressed band (roughly 0.31–0.72, was 0.24–0.76
 * before this pass) rather than the near-full height used two passes ago —
 * vertical travel is now the secondary motion, so the printed content it
 * travels through stays compact. This band is wider than a strict 50–60%
 * compression would give (see INITIAL_Y_OFFSET/VERTICAL_TRAVEL_WORLD's
 * comment for why — the frustum's own vertical span sets a floor on this).
 * `v` is deliberately NOT correlated with reveal progress (checked by hand
 * against the angle spread above) — two temporally-close stickers almost
 * always sit at clearly different heights, which is what keeps this reading
 * as individually placed designs instead of a handful of touching clusters. A
 * few pairs are deliberately close in both (a little overlap, per the
 * reference) but most have visible metal around them.
 */
const MANUAL_LAYOUT: { angleDeg: number; v: number; sizeTier: SizeTier; rotationDeg: number }[] = [
  { angleDeg: -12.5, v: 0.5688, sizeTier: "large", rotationDeg: -6 }, // 0 miamiViceTiger — hero, visible at rest
  { angleDeg: -154.7, v: 0.4587, sizeTier: "medium", rotationDeg: 8 }, // 1 rhodesianTiger — never fully centred, wraps in late
  { angleDeg: -62, v: 0.665, sizeTier: "medium", rotationDeg: -4 }, // 2 medusa
  { angleDeg: -204.2, v: 0.335, sizeTier: "medium", rotationDeg: 10 }, // 3 cyberSkull — edge texture only
  { angleDeg: -122.5, v: 0.4175, sizeTier: "small", rotationDeg: -9 }, // 4 hornedSkull
  { angleDeg: -29.7, v: 0.61, sizeTier: "medium", rotationDeg: 5 }, // 5 cookies
  { angleDeg: -171.9, v: 0.5, sizeTier: "large", rotationDeg: -3 }, // 6 subzero — edge texture only
  { angleDeg: -79.2, v: 0.6375, sizeTier: "small", rotationDeg: 7 }, // 7 lvGlock
  { angleDeg: -232.4, v: 0.3075, sizeTier: "large", rotationDeg: -8 }, // 8 arcade — edge texture only
  { angleDeg: -139.6, v: 0.6925, sizeTier: "medium", rotationDeg: 4 }, // 9 babyBoomers — never fully centred
  { angleDeg: -46.9, v: 0.3625, sizeTier: "small", rotationDeg: -11 }, // 10 blushingDuck
  { angleDeg: -200.1, v: 0.5, sizeTier: "medium", rotationDeg: 6 }, // 11 illunis — edge texture only
  { angleDeg: -107.4, v: 0.5688, sizeTier: "medium", rotationDeg: -5 }, // 12 generic1
  { angleDeg: -14.6, v: 0.3075, sizeTier: "medium", rotationDeg: -7 }, // 13 generic2 — also near-front at rest
  { angleDeg: -156.8, v: 0.61, sizeTier: "large", rotationDeg: 9 }, // 14 generic3 — never fully centred
  { angleDeg: -75.1, v: 0.3625, sizeTier: "small", rotationDeg: -4 }, // 15 generic4
  { angleDeg: -217.3, v: 0.72, sizeTier: "medium", rotationDeg: 6 }, // 16 generic5 — edge texture only
  { angleDeg: -124.5, v: 0.4725, sizeTier: "medium", rotationDeg: -10 }, // 17 generic6
  { angleDeg: -31.8, v: 0.72, sizeTier: "medium", rotationDeg: 3 }, // 18 generic7
  { angleDeg: -185, v: 0.39, sizeTier: "small", rotationDeg: -6 }, // 19 generic8 — edge texture only
  { angleDeg: -92.3, v: 0.4175, sizeTier: "large", rotationDeg: 8 }, // 20 generic9
  { angleDeg: -234.5, v: 0.3075, sizeTier: "medium", rotationDeg: -3 }, // 21 generic10 — edge texture only
  { angleDeg: -152.7, v: 0.5275, sizeTier: "small", rotationDeg: 10 }, // 22 generic11 — never fully centred
  { angleDeg: -60, v: 0.6925, sizeTier: "medium", rotationDeg: -8 }, // 23 generic12
  { angleDeg: -202.2, v: 0.6375, sizeTier: "medium", rotationDeg: 5 }, // 24 generic13 — edge texture only
];

function buildPlacements(inputs: StickerInput[]): StickerPlacement[] {
  return inputs.map((s, i) => {
    const layout = MANUAL_LAYOUT[i];
    const tier = s.sizeTier ?? layout.sizeTier;
    return {
      src: s.src,
      alt: s.alt,
      u: normalizeDeg(layout.angleDeg) / 360,
      v: layout.v,
      widthFrac: WIDTH_FRAC_BY_TIER[tier],
      rotationDeg: layout.rotationDeg,
      sizeTier: tier,
    };
  });
}

export const stickerPlacements: StickerPlacement[] = buildPlacements(rawStickers);
export const STICKER_COUNT = stickerPlacements.length;

/**
 * Sticker texture atlas resolution — wraps the FULL circumference
 * horizontally. Height (and the resulting CYLINDER_WORLD_HEIGHT below) is
 * sized for two things at once, not just cluster spacing: the pole must
 * ALSO stay taller than the camera frustum at every scroll position — with
 * MANUAL_LAYOUT's clusters packed for good density, the printed surface
 * genuinely needs this much plain-metal margin above/below the clusters so
 * the open cylinder's top/bottom edge never scrolls into frame.
 */
export const ATLAS_WIDTH = 2048;
/**
 * NOTE: this is the PHYSICAL cylinder's height, not the height the sticker
 * content actually occupies — it's kept tall (unchanged from the previous
 * pass) purely so the open-ended cylinder's own top/bottom edge always
 * stays outside the camera frustum (verified via pixel readback last pass;
 * shrinking this reopens that bug). The sticker content itself is what got
 * compressed this pass — MANUAL_LAYOUT's v values now span only ~0.34–0.66
 * (was ~0.24–0.76), about 57% of the previous span, via
 * INITIAL_Y_OFFSET/VERTICAL_TRAVEL_WORLD below, not by shrinking this atlas.
 */
export const ATLAS_HEIGHT = 3260;

/** Cylinder radius, world units (arbitrary scene scale). */
export const CYLINDER_RADIUS = 1.6;
const CIRCUMFERENCE = 2 * Math.PI * CYLINDER_RADIUS;

/**
 * Derived (not hand-picked) so the atlas maps onto the cylinder at a
 * uniform, undistorted scale in both directions — same px-per-world-unit
 * horizontally and vertically — otherwise sticker artwork would stretch.
 */
export const CYLINDER_WORLD_HEIGHT = (ATLAS_HEIGHT / ATLAS_WIDTH) * CIRCUMFERENCE;

/** The pole occupies ~46% of the frame width at rest — a touch larger than before so the artwork reads with more impact. */
export const POLE_FRAME_FRACTION = 0.46;

/**
 * 160° total rotation across the whole scroll section — within the 140–180°
 * target, and roughly matching MANUAL_LAYOUT's ~173° angular spread, so the
 * sweep visibly carries stickers from the left curvature, across the front,
 * to the right curvature over the course of the scroll. Rotation is now the
 * PRIMARY read (vertical travel is the secondary/supporting motion — see
 * VERTICAL_TRAVEL_WORLD below).
 */
export const ROTATION_TURNS = 160 / 360;

/**
 * Vertical travel + starting offset, in WORLD UNITS, chosen so the visible
 * v-window travels across MANUAL_LAYOUT's v≈0.31–0.72 band as scroll
 * progresses (v≈0.59 at p=0 down to v≈0.41 at p=1).
 *
 * This pair (and the v-band's width above) was tuned against a real
 * constraint, not just "smaller = better": the camera's own vertical
 * frustum span is a FIXED size in v-units, and if the printed content band
 * is narrower than (frustum span + travel excursion), the frustum's own
 * top/bottom edge pokes out past the printed content into bare margin at
 * the very start/end of the scroll — an empty-viewport bug, not a style
 * choice. A first attempt compressed the band to ~57% of the pass-before's
 * span (matching the requested 50–60%) with the pass-before's travel
 * (~4.8) and left ~40–50% of the frame bare at p=0/p=1. This band (~0.41,
 * about 78% of the pass-before's span — less compression than asked, but
 * required by the constraint above) combined with a SMALLER travel (3.0,
 * ~59% less than the pass-before's 7.32, well past the requested 30–40%
 * reduction) instead keeps that bare margin under ~10% of frame on
 * realistic desktop aspect ratios (checked at 1.4–1.78; only an unusually
 * square/tall viewport still shows a modest ~20%).
 *
 * SIGN NOTE: with the sticker texture's default flipY (kept true so artwork
 * stays upright — see useStickerAtlasTexture), CylinderGeometry's mesh v=0
 * samples the BOTTOM of what we draw, not the top, so world Y from a given
 * `v` is `groupY + (0.5 - v) * H`, not `groupY + (v - 0.5) * H` — these two
 * constants are the negation of what the naive (v - 0.5) formula would give.
 */
export const INITIAL_Y_OFFSET = 1.5;
export const VERTICAL_TRAVEL_WORLD = -3.0;

/** Radial smoothness — within the requested 64–128 range. */
export const RADIAL_SEGMENTS = 96;
