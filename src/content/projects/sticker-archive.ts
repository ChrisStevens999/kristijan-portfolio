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
 * Placement is HAND-AUTHORED (MANUAL_LAYOUT). Sizing is a per-sticker
 * `screenFraction` (not a 3-tier lookup) — after direct reference
 * comparison, almost every sticker needed to sit in one fairly narrow "big"
 * band (0.35–0.55 of pole width) with only small, organic per-item
 * variation, rather than a wide small/medium/large spread where "small"
 * read as a tiny icon. `widthFrac` (the actual atlas fraction used for
 * drawing) is computed FROM the visible artwork's alpha bounding box, not
 * the full PNG canvas — see useStickerAtlasTexture's bbox detection — so
 * `screenFraction` really is "how big the recognizable artwork looks",
 * independent of how much transparent padding a given PNG happens to have.
 */
export interface StickerPlacement {
  src: StaticImageData;
  alt: string;
  /** 0–1 around the cylinder's circumference. Fixed forever — this is a point on the physical surface, not a moment in time. */
  u: number;
  /** 0–1 down the tall texture atlas (0 = top of the pole's printed surface). */
  v: number;
  /** Sticker's on-atlas width as a fraction of the full atlas width (== full circumference), sized against the artwork's ALPHA BOUNDING BOX, not the padded PNG canvas. Derived from screenFraction. */
  widthFrac: number;
  /** Small deterministic rotation jitter, degrees — reads as hand-applied rather than machine-perfect. */
  rotationDeg: number;
}

type StickerInput = { src: StaticImageData; alt: string; group?: string };

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
 * Converts a target on-screen width (as a fraction of the VISIBLE pole
 * width, for artwork centred at dead-front) to widthFrac (fraction of full
 * circumference / atlas width): a front-facing sticker of angular width θ
 * spans ≈ R·θ on screen; visible pole width = 2R; so R·θ = target·2R =>
 * θ = 2·target, and widthFrac = θ / 2π = target / π.
 */
function widthFracFor(screenFraction: number): number {
  return screenFraction / Math.PI;
}

function normalizeDeg(a: number) {
  return ((a % 360) + 360) % 360;
}

/**
 * Hand-authored placement, one row per rawStickers entry (same order/index),
 * organized into FOUR GROUPS of 6–7 — a deliberate change from the previous
 * pass's fully-decorrelated individual scatter. That scatter, combined with
 * every sticker now being "big" (see `screenFraction` below), meant too
 * many large designs were simultaneously within the readable arc at once.
 * Groups fix this: within a group, members share roughly the same reveal
 * moment (so together they read as "the current 3–4"), and groups are
 * spaced FAR ENOUGH APART that one group's members are rotating away/behind
 * while the next group's are rotating into view — "sticker A rotates out,
 * B/C/D take over" — rather than an even wash of everything at once.
 *
 * Getting the spacing right took two corrections: a first attempt (six
 * groups, ~54° apart) let adjacent groups overlap into 9–10 simultaneous
 * designs; tightening each group's OWN internal angular spread (a second
 * attempt) barely helped, because the overlap wasn't coming from a group's
 * own spread — it's that a hero-sized sticker alone is ~60° wide, so even
 * two *centres* 68° apart still have their edges overlapping once each
 * sticker's own half-width is added on. The only real fix was fewer, more
 * widely-spaced groups: four groups at 85° apart, which (checked against
 * every sticker's actual angular half-width, not just its centre) leaves a
 * genuine — if narrow, ~2° — gap between each group's full visible extent
 * and the next's. `v` differentiates roles WITHIN a group; because vertical
 * travel is intentionally small this pass (untouched, per the brief), the
 * vertical window barely moves across the whole scroll, so `v` does NOT
 * provide additional separation BETWEEN groups the way rotation does — only
 * angular spacing does that.
 *
 * Five roles per group, all sharing one base angle with a small per-role
 * offset and a clearly different `v`:
 *   hero  (v≈0.50, offset  0°) — the biggest design in the group, 50–55%.
 *   upper (v≈0.33, offset -9°) — supporting, 42–50% "family".
 *   lower (v≈0.67, offset +7°) — supporting, 42–50% "family".
 *   edge2 (v≈0.58, offset+16°) — also 42–50%, offset enough to feel like
 *         it's arriving/leaving rather than dead-centre.
 *   edge1 (v≈0.44, offset-20°) — the one deliberately SMALLER (35–40%)
 *         role per group — reads as the partial/entering-edge piece.
 * Two groups get a sixth/seventh "extra" member (v≈0.40 or 0.60, offset
 * within ±5° of centre — inside the envelope hero/edge1/edge2 already
 * claim, so it adds density without widening the group's angular footprint)
 * to cover all 25 stickers.
 *
 * `angleDeg` is still chosen BACKWARDS from each group's intended reveal
 * moment — rotation only ever runs forward (0° → +ROTATION_TURNS·360°), so
 * a sticker placed at a positive angle only gets FURTHER from front as
 * scroll proceeds. Four group centres sit at reveal progress 0.04/0.29/
 * 0.54/0.79 (`angleDeg = -progress · 340°`, matching ROTATION_TURNS exactly
 * so every sticker still reaches a genuine dead-front moment, never just
 * edge/partial-only), with each role's offset added on top.
 *
 * Sizes: 4 hero (50–55%), 17 supporting (42–50%), 4 edge1 (35–40%) = 21/25
 * (84%) in the 42–55% "one consistent scale family", per the requested
 * 80–90% target.
 */
const MANUAL_LAYOUT: { angleDeg: number; v: number; screenFraction: number; rotationDeg: number }[] = [
  // Group 1 (reveal ≈ p0.04 — visible at rest). 7 members.
  { angleDeg: -13.6, v: 0.5, screenFraction: 0.53, rotationDeg: -6 }, // 0 miamiViceTiger — hero
  { angleDeg: -22.6, v: 0.33, screenFraction: 0.44, rotationDeg: 8 }, // 1 rhodesianTiger — upper
  { angleDeg: -6.6, v: 0.67, screenFraction: 0.47, rotationDeg: -4 }, // 2 medusa — lower
  { angleDeg: 2.4, v: 0.58, screenFraction: 0.46, rotationDeg: 3 }, // 3 cyberSkull — edge2
  { angleDeg: -33.6, v: 0.44, screenFraction: 0.37, rotationDeg: 10 }, // 4 hornedSkull — edge1 (partial)
  { angleDeg: -18.6, v: 0.4, screenFraction: 0.45, rotationDeg: -8 }, // 5 cookies — extra
  { angleDeg: -8.6, v: 0.6, screenFraction: 0.44, rotationDeg: 5 }, // 6 subzero — extra

  // Group 2 (reveal ≈ p0.29). 6 members.
  { angleDeg: -98.6, v: 0.5, screenFraction: 0.51, rotationDeg: -9 }, // 7 lvGlock — hero
  { angleDeg: -107.6, v: 0.33, screenFraction: 0.49, rotationDeg: 5 }, // 8 arcade — upper
  { angleDeg: -91.6, v: 0.67, screenFraction: 0.43, rotationDeg: -3 }, // 9 babyBoomers — lower
  { angleDeg: -82.6, v: 0.58, screenFraction: 0.44, rotationDeg: 6 }, // 10 blushingDuck — edge2
  { angleDeg: -118.6, v: 0.44, screenFraction: 0.39, rotationDeg: 7 }, // 11 illunis — edge1 (partial)
  { angleDeg: -93.6, v: 0.6, screenFraction: 0.46, rotationDeg: -5 }, // 12 generic1 — extra

  // Group 3 (reveal ≈ p0.54). 6 members.
  { angleDeg: -183.6, v: 0.5, screenFraction: 0.55, rotationDeg: -8 }, // 13 generic2 — hero
  { angleDeg: -192.6, v: 0.33, screenFraction: 0.46, rotationDeg: 4 }, // 14 generic3 — upper
  { angleDeg: -176.6, v: 0.67, screenFraction: 0.49, rotationDeg: -11 }, // 15 generic4 — lower
  { angleDeg: -167.6, v: 0.58, screenFraction: 0.48, rotationDeg: 9 }, // 16 generic5 — edge2
  { angleDeg: -203.6, v: 0.44, screenFraction: 0.36, rotationDeg: 6 }, // 17 generic6 — edge1 (partial)
  { angleDeg: -188.6, v: 0.4, screenFraction: 0.47, rotationDeg: -3 }, // 18 generic7 — extra

  // Group 4 (reveal ≈ p0.79 — nearest the end). 6 members.
  { angleDeg: -268.6, v: 0.5, screenFraction: 0.52, rotationDeg: -5 }, // 19 generic8 — hero
  { angleDeg: -277.6, v: 0.33, screenFraction: 0.43, rotationDeg: -7 }, // 20 generic9 — upper
  { angleDeg: -261.6, v: 0.67, screenFraction: 0.45, rotationDeg: 9 }, // 21 generic10 — lower
  { angleDeg: -252.6, v: 0.58, screenFraction: 0.42, rotationDeg: -4 }, // 22 generic11 — edge2
  { angleDeg: -288.6, v: 0.44, screenFraction: 0.38, rotationDeg: 3 }, // 23 generic12 — edge1 (partial)
  { angleDeg: -263.6, v: 0.6, screenFraction: 0.45, rotationDeg: 6 }, // 24 generic13 — extra
];

function buildPlacements(inputs: StickerInput[]): StickerPlacement[] {
  return inputs.map((s, i) => {
    const layout = MANUAL_LAYOUT[i];
    return {
      src: s.src,
      alt: s.alt,
      u: normalizeDeg(layout.angleDeg) / 360,
      v: layout.v,
      widthFrac: widthFracFor(layout.screenFraction),
      rotationDeg: layout.rotationDeg,
    };
  });
}

export const stickerPlacements: StickerPlacement[] = buildPlacements(rawStickers);
export const STICKER_COUNT = stickerPlacements.length;

/**
 * Sticker texture atlas resolution — wraps the FULL circumference
 * horizontally. Height (and the resulting CYLINDER_WORLD_HEIGHT below) is
 * sized for two things at once, not just group spacing: the pole must ALSO
 * stay taller than the camera frustum at every scroll position — with
 * MANUAL_LAYOUT's groups packed for good density, the printed surface
 * genuinely needs this much plain-metal margin above/below the groups so
 * the open cylinder's top/bottom edge never scrolls into frame.
 */
export const ATLAS_WIDTH = 2048;
/**
 * NOTE: this is the PHYSICAL cylinder's height, not the height the sticker
 * content actually occupies — it's kept tall purely so the open-ended
 * cylinder's own top/bottom edge always stays outside the camera frustum
 * (verified via pixel readback; shrinking this reopens that bug — this
 * value, along with INITIAL_Y_OFFSET/VERTICAL_TRAVEL_WORLD below, is
 * explicitly NOT touched this pass, per "do not change vertical travel").
 * MANUAL_LAYOUT's v values span ~0.31–0.72 within it.
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

/** The pole occupies ~48% of the frame width at rest — a small bump from 0.46, closer to the reference's roughly-half-frame pole with strong black margins either side. */
export const POLE_FRAME_FRACTION = 0.48;

/**
 * 340° total rotation across the whole scroll section — nearly a full
 * revolution, per direct reference comparison (up from 120° two passes
 * ago, which "barely changed which side of the pole we're seeing"). This
 * is now the PRIMARY source of changing composition (~75%, vs ~25% from
 * vertical travel — see VERTICAL_TRAVEL_WORLD below). MANUAL_LAYOUT's
 * angles are chosen against this exact figure (see its doc comment). Kept
 * slow/heavy despite the large angular distance by lengthening the scroll
 * section itself (see StickerArchive.tsx) rather than spinning faster.
 */
export const ROTATION_TURNS = 340 / 360;

/**
 * Vertical travel + starting offset, in WORLD UNITS — cut roughly in half
 * from the previous pass (was 1.5/-3.0) now that rotation carries most of
 * the compositional change; vertical motion is a slow, supporting
 * secondary read, not a co-equal one. The visible v-window still travels
 * within MANUAL_LAYOUT's v≈0.31–0.72 band (v≈0.53 at p=0 to v≈0.41 at
 * p=1) — a smaller excursion than before, which also means MORE frustum-
 * fill margin than the previous pass had (re-verified: 0% empty margin at
 * both scroll extremes on realistic 1.4–1.78 aspect ratios, vs the
 * previous pass's ~0–16%), not less.
 *
 * SIGN NOTE: with the sticker texture's default flipY (kept true so artwork
 * stays upright — see useStickerAtlasTexture), CylinderGeometry's mesh v=0
 * samples the BOTTOM of what we draw, not the top, so world Y from a given
 * `v` is `groupY + (0.5 - v) * H`, not `groupY + (v - 0.5) * H` — these two
 * constants are the negation of what the naive (v - 0.5) formula would give.
 */
export const INITIAL_Y_OFFSET = 0.9;
export const VERTICAL_TRAVEL_WORLD = -1.8;

/** Radial smoothness — within the requested 64–128 range. */
export const RADIAL_SEGMENTS = 96;
