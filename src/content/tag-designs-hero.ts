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
  /**
   * Stage background while this illustration holds the centre — the
   * reference clip tints the whole frame to a muted tone drawn from
   * whichever poster is the hero. Picked per image from its own palette
   * (its average colour, lifted a touch so the card still pops off it).
   */
  bg: string;
}

export const HERO_IMAGE_META: Record<string, HeroImageMeta> = {
  "Boomer.png": {
    alt: "Pop-art illustration of a woman",
    objectPosition: "center",
    bg: "#6f6293",
  },
  "DNC GOLD.png": {
    alt: "Illustration of a gold-winged angel statue",
    objectPosition: "center 30%",
    bg: "#5a4a2c",
  },
  "DNNC.png": {
    alt: "Illustration of an oni mask surrounded by flowers",
    objectPosition: "center",
    bg: "#5c554a",
  },
  "DViolet.png": {
    alt: "Illustration of a horned skull in a tactical helmet",
    objectPosition: "center",
    bg: "#3b2058",
  },
  "Mint.png": {
    alt: "Illustration of a hooded, skull-masked sniper",
    objectPosition: "center 35%",
    bg: "#3f6c6b",
  },
  "Rhodie.png": {
    alt: "Illustration of a skull in military uniform",
    objectPosition: "center 30%",
    bg: "#3a5364",
  },
  "Stroke.png": {
    alt: "Illustration of a hooded reaper with glowing eyes",
    objectPosition: "center 35%",
    bg: "#5f5e62",
  },
  "T.png": {
    alt: "Illustration of a roaring tiger",
    objectPosition: "center 40%",
    bg: "#4b4629",
  },
  "Venom.png": {
    alt: "Illustration titled The Symbiote, a fanged creature",
    objectPosition: "center 35%",
    bg: "#33305a",
  },
  "Xray.png": {
    alt: "Cyan line-art illustration of a skeletal soldier",
    objectPosition: "center 35%",
    bg: "#1f3c44",
  },
};

export const DEFAULT_HERO_IMAGE_META: HeroImageMeta = {
  alt: "",
  objectPosition: "center",
  bg: "#2a2a2a",
};

/**
 * The thin editorial rows above and below the stage, as in the reference
 * clip ("FRIDAY / CURATED INSPIRATION / FOR YOU" up top, a boxed strapline
 * below). Left / centre / right cells; edit freely.
 */
export const HERO_CHROME = {
  header: ["Tag Designs", "Original Illustrations", "For Apparel"],
  footer: ["Chris Stevens", "Illustrations created for clothing tags", "Tags\u2122"],
} as const;
