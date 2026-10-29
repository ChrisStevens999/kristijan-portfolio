import type { ImageAsset } from "@/content/types";

import row1 from "../../../assets/projects/tag designs/gallery/row-1.webp";
import row2 from "../../../assets/projects/tag designs/gallery/row-2.webp";
import row3 from "../../../assets/projects/tag designs/gallery/row-3.webp";

import statementBaked from "../../../assets/projects/tag designs/hero/Page 1.png";
import archiveBaked from "../../../assets/projects/tag designs/hero/Final Page.png";

/**
 * The application gallery: three supplied boards, one per row of the
 * reference mockup, each showing three tags sewn into garment collars on
 * black (2000x1125). Shown whole, one above the other, in the mockup's row
 * order — row 3 now has its "Call of Duty Red Tiger" tag.
 */
export const tagDesignsGallery: ImageAsset[] = [
  {
    src: row1,
    alt: "Three tags sewn into garment collars: Illunis Brushstroke, Painted Cubist and Black Naja",
  },
  {
    src: row2,
    alt: "Three tags sewn into garment collars: The Symbiote, Artic Blue Rhodie and Baby Boomer DNC",
  },
  {
    src: row3,
    alt: "Three tags sewn into garment collars: Boyz Club Conspiracy Theory V2, Painted Cubist and Call of Duty Red Tiger",
  },
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
