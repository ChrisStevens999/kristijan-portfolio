/**
 * Per-illustration metadata for the Tag Designs hero collage, keyed by
 * filename in public/tag-designs-hero/. Kept outside the animation
 * component so positioning can be tuned per image without touching motion
 * logic. A new file dropped into that folder without an entry here still
 * renders (falls back to a centered crop) — this config refines specific
 * images, it doesn't gate which ones appear.
 */
export interface HeroImageMeta {
  alt: string;
  /** CSS object-position — where the important part of the artwork sits, so a cropped slot doesn't cut off a face or focal detail. */
  objectPosition: string;
}

export const HERO_IMAGE_META: Record<string, HeroImageMeta> = {
  "Boomer.png": {
    alt: "Pop-art illustration of a woman",
    objectPosition: "center",
  },
  "DNC GOLD.png": {
    alt: "Illustration of a gold-winged angel statue",
    objectPosition: "center 30%",
  },
  "DNNC.png": {
    alt: "Illustration of an oni mask surrounded by flowers",
    objectPosition: "center",
  },
  "DViolet.png": {
    alt: "Illustration of a horned skull in a tactical helmet",
    objectPosition: "center",
  },
  "Mint.png": {
    alt: "Illustration of a hooded, skull-masked sniper",
    objectPosition: "center 35%",
  },
  "Rhodie.png": {
    alt: "Illustration of a skull in military uniform",
    objectPosition: "center 30%",
  },
  "Stroke.png": {
    alt: "Illustration of a hooded reaper with glowing eyes",
    objectPosition: "center 35%",
  },
  "T.png": {
    alt: "Illustration of a roaring tiger",
    objectPosition: "center 40%",
  },
  "Venom.png": {
    alt: "Illustration titled The Symbiote, a fanged creature",
    objectPosition: "center 35%",
  },
  "Xray.png": {
    alt: "Cyan line-art illustration of a skeletal soldier",
    objectPosition: "center 35%",
  },
};

export const DEFAULT_HERO_IMAGE_META: HeroImageMeta = {
  alt: "",
  objectPosition: "center",
};
