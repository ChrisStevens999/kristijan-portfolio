import type { ImageAsset } from "@/content/types";

import illunisBrushstroke from "../../../assets/projects/tag designs/gallery/illunis-brushstroke.jpg";
import paintedCubist from "../../../assets/projects/tag designs/gallery/painted-cubist.jpg";
import blackNaja from "../../../assets/projects/tag designs/gallery/black-naja.jpg";
import theSymbioteApplication from "../../../assets/projects/tag designs/gallery/the-symbiote.jpg";
import articBlueRhodieApplication from "../../../assets/projects/tag designs/gallery/artic-blue-rhodie.jpg";
import babyBoomerDncApplication from "../../../assets/projects/tag designs/gallery/baby-boomer-dnc.jpg";
import conspiracyTheoryV2 from "../../../assets/projects/tag designs/gallery/conspiracy-theory-v2.jpg";
import tigerStripeApplication from "../../../assets/projects/tag designs/gallery/tiger-stripe.jpg";
import dncApplication from "../../../assets/projects/tag designs/gallery/dnc.jpg";

import statementBaked from "../../../assets/projects/tag designs/hero/Page 1.png";
import archiveBaked from "../../../assets/projects/tag designs/hero/Final Page.png";

/**
 * Three-column application gallery: each photo is a real garment collar with
 * one tag design sewn in, matched to the mockup by the tag's own printed
 * name (legible in the source photos) rather than guessed — order below is
 * row-by-row, left to right, exactly as laid out in the reference mockup.
 *
 * Known gap: the reference mockup's row 3, column 3 is "Call of Duty Red
 * Tiger" (confirmed from Page 5.png), not "DNC" — no source photo for that
 * design was found, so this slot uses the DNC application photo instead.
 */
export const tagDesignsGallery: ImageAsset[] = [
  { src: illunisBrushstroke, alt: "Illunis Brushstroke tag sewn into a teal garment collar" },
  { src: paintedCubist, alt: "Painted Cubist tag sewn into a camouflage garment collar" },
  { src: blackNaja, alt: "Black Naja tag sewn into a dark snake-print garment collar" },
  { src: theSymbioteApplication, alt: "The Symbiote tag sewn into a black and white garment collar" },
  {
    src: articBlueRhodieApplication,
    alt: "Artic Blue Rhodie tag sewn into a blue camouflage garment collar",
  },
  {
    src: babyBoomerDncApplication,
    alt: "Baby Boomer DNC tag sewn into a pink and blue garment collar",
  },
  {
    src: conspiracyTheoryV2,
    alt: "Conspiracy Theory V2 tag sewn into a newsprint-pattern garment collar",
  },
  { src: tigerStripeApplication, alt: "Tiger Stripe tag sewn into a green tiger-camo garment collar" },
  { src: dncApplication, alt: "DNC tag sewn into an olive camouflage garment collar" },
];

/**
 * Statement section and final archive grid are both pre-baked, approved
 * exports (typography, layout and card branding already final) — rendered
 * as-is via next/image, never reconstructed in code.
 */
export const tagDesignsStatement: ImageAsset = {
  src: statementBaked,
  alt: "Original illustrations, created for clothing tags",
};

export const tagDesignsArchive: ImageAsset = {
  src: archiveBaked,
  alt: "Archive of ten original tag illustrations: Artic Blue Rhodie, Mint Flare DPM, The Symbiote, Baby Boomer DNC, DNC Ultraviolet, Dark Marble Camo, 24-Karat DNC, DNC, Sinister Stroke, White Bandana",
};
