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
 * organized into FIVE GROUPS of 5. The group STRUCTURE (spacing, roles) is
 * carried over from the previous pass.
 *
 * HISTORICAL NOTE: an earlier pass added a per-fragment front-facing
 * brightness/alpha falloff on the sticker material itself (previously
 * `frontFacingFade.ts`, applied in StickerScene.tsx and SlapSticker.tsx) to
 * enforce "~3 substantial stickers visible at once" beyond what placement
 * math alone could guarantee. A later rendering-fixes pass REMOVED that
 * fade entirely, per explicit instruction that any artificial edge
 * darkening/fading on stickers (as opposed to real lighting/geometry) is
 * unwanted — see StickerScene.tsx and SlapSticker.tsx. This placement table
 * itself is unchanged (moving/resizing stickers is out of scope for that
 * pass), so the "substantial within ±35°" property is now whatever raw
 * geometry + spacing produces on their own, without the fade's help.
 *

 * Five roles per group, differentiated by `v` (real gaps, checked against
 * each size's actual vertical extent) so upper/hero/lower read as three
 * separate physical stickers, not a touching vertical collage. THREE of the
 * five share one angle (offset 0°) — since `v` already separates them,
 * sharing an angle costs the group NOTHING in angular footprint:
 *   hero  (v≈0.515, offset  0°) — the biggest design, dead centre.
 *   upper (v≈0.36,  offset  0°) — a clear gap above the hero.
 *   lower (v≈0.67,  offset  0°) — a clear gap below the hero.
 * The other two carry a real ±50° offset — enough that at the group's own
 * front-facing moment they're already meaningfully faded (still readable,
 * clearly secondary), which is what "a partial sticker wrapping the curved
 * edge" (task B) actually means once the fade exists to make "secondary" a
 * real visual state rather than just a smaller size:
 *   edge1 (v≈0.44, offset -50°)
 *   edge2 (v≈0.58, offset +50°)
 * edge1/edge2 overlapping the NEXT/PREVIOUS group's territory is
 * intentional — each still gets its OWN dead-front moment (see SLAP_CONFIG
 * and the reveal-progress note below), just with a neighbour's group
 * sometimes still partly bright nearby, which the brief's own "not mostly
 * covered, ±35°, large enough" test (task D) tolerates.
 *
 * `angleDeg` is still chosen BACKWARDS from each group's intended reveal
 * moment — rotation only ever runs forward (0° → +ROTATION_TURNS·360°), so
 * a sticker placed at a positive angle only gets FURTHER from front as
 * scroll proceeds. Five group centres sit evenly across reveal progress
 * (`angleDeg = -progress · 340°`, matching ROTATION_TURNS exactly so every
 * sticker still reaches a genuine dead-front moment).
 *
 * SIZES (`screenFraction`, task A's own distribution): 20 of 25 (80%) sit at
 * 42–48%; 2 heroes (miamiViceTiger, blushingDuck) are pushed to 50–55%; 3
 * edge members are pulled to 35–40% — nothing smaller (no "tiny icons") and
 * nothing bigger (no single sticker dominating the pole).
 */
const MANUAL_LAYOUT: { angleDeg: number; v: number; screenFraction: number; rotationDeg: number }[] = [
  // Group 1 (base ≈ -34°, reveal ≈ p0.10 — near-front at rest). 5 members.
  { angleDeg: -34, v: 0.515, screenFraction: 0.52, rotationDeg: -6 }, // 0 miamiViceTiger — hero (large)
  { angleDeg: -34, v: 0.36, screenFraction: 0.45, rotationDeg: 8 }, // 1 rhodesianTiger — upper [SLAP]
  { angleDeg: -34, v: 0.67, screenFraction: 0.44, rotationDeg: -4 }, // 2 medusa — lower
  { angleDeg: -84, v: 0.44, screenFraction: 0.43, rotationDeg: 10 }, // 3 cyberSkull — edge1 (partial)
  { angleDeg: 16, v: 0.58, screenFraction: 0.42, rotationDeg: 3 }, // 4 hornedSkull — edge2 (partial)

  // Group 2 (base ≈ -102°, reveal ≈ p0.30). 5 members.
  { angleDeg: -102, v: 0.515, screenFraction: 0.46, rotationDeg: -9 }, // 5 cookies — hero [SLAP]
  { angleDeg: -102, v: 0.36, screenFraction: 0.45, rotationDeg: 5 }, // 6 subzero — upper
  { angleDeg: -102, v: 0.67, screenFraction: 0.47, rotationDeg: -3 }, // 7 lvGlock — lower
  { angleDeg: -152, v: 0.44, screenFraction: 0.38, rotationDeg: 7 }, // 8 arcade — edge1 (small partial)
  { angleDeg: -52, v: 0.58, screenFraction: 0.44, rotationDeg: -5 }, // 9 babyBoomers — edge2 (partial)

  // Group 3 (base ≈ -170°, reveal ≈ p0.50). 5 members.
  { angleDeg: -170, v: 0.515, screenFraction: 0.54, rotationDeg: -8 }, // 10 blushingDuck — hero (large) [SLAP]
  { angleDeg: -170, v: 0.36, screenFraction: 0.43, rotationDeg: 4 }, // 11 illunis — upper
  { angleDeg: -170, v: 0.67, screenFraction: 0.46, rotationDeg: -11 }, // 12 generic1 — lower
  { angleDeg: -220, v: 0.44, screenFraction: 0.42, rotationDeg: 6 }, // 13 generic2 — edge1 (partial) [SLAP]
  { angleDeg: -120, v: 0.58, screenFraction: 0.37, rotationDeg: -3 }, // 14 generic3 — edge2 (small partial) [SLAP]

  // Group 4 (base ≈ -238°, reveal ≈ p0.70). 5 members.
  { angleDeg: -238, v: 0.515, screenFraction: 0.48, rotationDeg: -5 }, // 15 generic4 — hero
  { angleDeg: -238, v: 0.36, screenFraction: 0.44, rotationDeg: -7 }, // 16 generic5 — upper
  { angleDeg: -238, v: 0.67, screenFraction: 0.45, rotationDeg: 9 }, // 17 generic6 — lower
  { angleDeg: -288, v: 0.44, screenFraction: 0.43, rotationDeg: -4 }, // 18 generic7 — edge1 (partial) [SLAP]
  { angleDeg: -188, v: 0.58, screenFraction: 0.39, rotationDeg: 3 }, // 19 generic8 — edge2 (small partial)

  // Group 5 (base ≈ -306°, reveal ≈ p0.90 — nearest the end). 5 members.
  { angleDeg: -306, v: 0.515, screenFraction: 0.47, rotationDeg: 6 }, // 20 generic9 — hero
  { angleDeg: -306, v: 0.36, screenFraction: 0.45, rotationDeg: -10 }, // 21 generic10 — upper
  { angleDeg: -306, v: 0.67, screenFraction: 0.46, rotationDeg: 3 }, // 22 generic11 — lower
  { angleDeg: -265, v: 0.44, screenFraction: 0.42, rotationDeg: -6 }, // 23 generic12 — edge1 (partial; NOT group5Angle-50=-356, which wraps to ≈+4° and sits near-front at p=0, cluttering the opening frame — moved to land its own moment around p≈0.78 instead)
  { angleDeg: -256, v: 0.58, screenFraction: 0.44, rotationDeg: 8 }, // 24 generic13 — edge2 (partial)
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

/** Cylinder radius, world units (arbitrary scene scale). */
export const CYLINDER_RADIUS = 1.6;

/** Radial smoothness — within the requested 64–128 range. */
export const RADIAL_SEGMENTS = 96;

/** How far outside the metal cylinder's radius sticker geometry sits, so the stickers lie flush on the pole without z-fighting against the metal underneath. */
export const STICKER_SURFACE_RADIUS_OFFSET = 0.012;
