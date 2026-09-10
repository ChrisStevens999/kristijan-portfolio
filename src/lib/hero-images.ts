import fs from "node:fs";
import path from "node:path";

import { DEFAULT_HERO_IMAGE_META, HERO_IMAGE_META } from "@/content/tag-designs-hero";
import { optimizedImageUrl } from "@/lib/optimizedImageUrl";

/**
 * Long edge requested from the optimizer. The originals are 0.7–7.5MB
 * PNGs (45MB for the set) — far too heavy to have ten of them in flight on
 * a hero; the centre card renders at ~360–450 CSS px, so 828 covers 2x
 * displays with room to spare at a few percent of the payload.
 */
const HERO_SOURCE_WIDTH = 828;

const HERO_DIR_NAME = "tag-designs-hero";
const HERO_DIR = path.join(process.cwd(), "public", HERO_DIR_NAME);

export interface HeroImage {
  src: string;
  alt: string;
  objectPosition: string;
  /** Stage background colour while this illustration is the centre card. */
  bg: string;
}

/**
 * Reads public/tag-designs-hero/ at request time and returns one entry per
 * image, merged with its metadata (@/content/tag-designs-hero) — server-only
 * (uses Node's fs), so this must be called from a Server Component and
 * passed down as plain props. Adding or removing a file in that folder
 * changes what renders with no code change; a file without a metadata entry
 * still renders, just with a centered crop and empty alt text.
 */
export function getHeroImages(): HeroImage[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(HERO_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort()
    .map((name) => {
      const meta = HERO_IMAGE_META[name] ?? DEFAULT_HERO_IMAGE_META;
      return {
        src: optimizedImageUrl(`/${HERO_DIR_NAME}/${encodeURIComponent(name)}`, HERO_SOURCE_WIDTH),
        alt: meta.alt,
        objectPosition: meta.objectPosition,
        bg: meta.bg,
      };
    });
}
