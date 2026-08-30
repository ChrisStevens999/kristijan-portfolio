/**
 * Content shapes for the portfolio. Plain TypeScript types — no Zod yet,
 * per project decision. Add runtime validation only if a concrete need
 * shows up (e.g. content authored outside this repo).
 */

import type { StaticImageData } from "next/image";

export interface ImageAsset {
  /**
   * StaticImageData (next/image import) by default. A plain string is a
   * deliberate escape hatch: a public/ path rendered as a raw <img>,
   * bypassing the Next.js image optimizer entirely — use only when
   * optimization is provably introducing artifacts the source doesn't have.
   */
  src: StaticImageData | string;
  alt: string;
}

export type CategorySlug = string;

export interface Category {
  slug: CategorySlug;
  title: string;
  description: string;
  cover: ImageAsset;
  /**
   * Override the category tile's link target. Used when a category
   * currently has a single flagship project, so the tile goes straight to
   * it instead of stopping at the (still-unbuilt) category listing page.
   * Omit once a category has more than one project worth listing.
   */
  href?: string;
}

export interface Project {
  slug: string;
  title: string;
  category: CategorySlug;
  /** Short line used on cards (Selected Work / Category listings). */
  summary: string;
  cover: ImageAsset;
  gallery: ImageAsset[];
  /** 05_COMPONENT_LIBRARY.md project page structure. */
  challenge: string;
  process: string;
  outcome: string;
  /** Selected Works is curated, not chronological — true = eligible for the homepage. */
  featured: boolean;
  /** Manual sort order within Selected Works and within its category. */
  order: number;
  /** Disciplines this project spans. Optional — most existing entries don't set it. */
  services?: string[];
  /** One or two-line project statement, distinct from the card-facing `summary`. */
  introduction?: string;
}

/**
 * Shared shape for image-sequence case studies (BoyzClub, Damaged Goods): a
 * flat, ordered reconstruction of a supplied tall reference board, one panel
 * per beat. `enabled: false` reserves a panel's position for an asset that
 * hasn't been supplied yet, so a later drop-in never requires reordering.
 */
export interface SequenceImagePanel {
  id: string;
  enabled: true;
  src: ImageAsset["src"];
  alt: string;
  /** Only needed if `src` is a raw public/ path without intrinsic dimensions. */
  aspectRatio?: number;
  /** True only for full-bleed photographic moments (hero, closing) — every other panel keeps its natural aspect ratio, uncropped. */
  fullViewport?: boolean;
  desktopObjectPosition?: string;
  mobileObjectPosition?: string;
  priority?: boolean;
}

/**
 * A full-bleed autoplaying video break in the sequence. Muted + looping +
 * playsInline so it behaves like a moving photographic panel, not a player
 * with controls. `src` is always a public/ path (raw <video>), never a
 * bundler import — mp4s aren't run through the image optimizer.
 */
export interface SequenceVideoPanel {
  id: string;
  enabled: true;
  kind: "video";
  src: string;
  /** Accessible description of the footage (spoken by nothing, so keep it literal). */
  alt: string;
  /** Poster frame shown before the video paints — a public/ path. */
  poster?: string;
  /** Defaults to a full 100svh break; set false for a natural 16:9 inline block. */
  fullViewport?: boolean;
  desktopObjectPosition?: string;
  mobileObjectPosition?: string;
}

/**
 * A tight horizontal row of N separate images (not one flattened asset) —
 * e.g. a triptych of individual detail photos meant to sit side by side,
 * each cropped to the same aspect ratio, no gap between them. Distinct from
 * a single already-composited multi-image panel (SequenceImagePanel with
 * one flat asset that already contains a grid) — use this when the source
 * files are genuinely separate images that need to be arranged into a row.
 */
export interface SequenceRowPanel {
  id: string;
  enabled: true;
  kind: "row";
  items: { src: ImageAsset["src"]; alt: string }[];
  /** Aspect ratio each column is cropped to (object-cover) — defaults to square. */
  aspectRatio?: number;
}

export interface SequenceDisabledPanel {
  id: string;
  enabled: false;
  /** What belongs in this slot, so it can be filled in later without touching the sequence. */
  note: string;
}

export type SequencePanel =
  | SequenceImagePanel
  | SequenceVideoPanel
  | SequenceRowPanel
  | SequenceDisabledPanel;

export interface SiteConfig {
  about: {
    heading: string;
    body: string[];
  };
  contact: {
    heading: string;
    email: string;
    socials: { label: string; href: string }[];
  };
}
