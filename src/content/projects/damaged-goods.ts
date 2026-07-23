import type { SequencePanel } from "@/content/types";

import heroSkateboardPhoto from "../../../assets/projects/damaged goods/4 5.png";
import projectBrief from "../../../assets/projects/damaged goods/Brief.png";
import coreStatement from "../../../assets/projects/damaged goods/Brief 3.png";
import visualDirection from "../../../assets/projects/damaged goods/Brief 2.png";
import visualPalette from "../../../assets/projects/damaged goods/Palette.png";
import brandExpressions from "../../../assets/projects/damaged goods/Expression.png";
import campaignApplications from "../../../assets/projects/damaged goods/Merch Page.png";
import apparelAndObject from "../../../assets/projects/damaged goods/Merch Page 5.png";
import capCampaign from "../../../assets/projects/damaged goods/Merch Page 3.png";
import finalJacket from "../../../assets/projects/damaged goods/Merch Page 4.png";

/**
 * One panel per beat in damaged-goods-layout-reference.webp, in the exact
 * order of that reference board. Same flat-sequence approach as BoyzClub
 * (see @/content/projects/boyzclub and @/components/case-studies/PanelSequence).
 *
 * Steps 8 ("Apparel application") and 9 ("Phone or object application") in
 * the reference share a single supplied file (Merch Page 5.png — a shirt-back
 * and a phone case side by side in one composite), so they're one panel here
 * rather than an artificial crop into two.
 */
export const damagedGoodsPanels: SequencePanel[] = [
  {
    id: "hero",
    enabled: true,
    src: heroSkateboardPhoto,
    alt: "Damaged Goods branded skateboard deck",
    fullViewport: true,
    desktopObjectPosition: "50% 42%",
    mobileObjectPosition: "50% 35%",
    priority: true,
  },
  {
    id: "brief",
    enabled: true,
    src: projectBrief,
    alt: "Damaged Goods project brief: core, purpose and audience",
  },
  {
    id: "core-statement",
    enabled: true,
    src: coreStatement,
    alt: "Damaged Goods circular logo — what we carry does not define what we are worth",
  },
  {
    id: "visual-direction",
    enabled: true,
    src: visualDirection,
    alt: "Visual direction — bold, expressive, imperfect, optimistic, human",
  },
  {
    id: "visual-palette",
    enabled: true,
    src: visualPalette,
    alt: "Damaged Goods visual palette",
  },
  {
    id: "brand-expressions",
    enabled: true,
    src: brandExpressions,
    alt: "Damaged Goods brand expressions and identity elements",
  },
  {
    id: "campaign-applications",
    enabled: true,
    src: campaignApplications,
    alt: "Damaged Goods campaign and graphic applications",
  },
  {
    id: "apparel-and-object",
    enabled: true,
    src: apparelAndObject,
    alt: "Damaged Goods apparel and phone case application",
  },
  {
    id: "cap-campaign",
    enabled: true,
    src: capCampaign,
    alt: "Damaged Goods cap campaign image",
  },
  {
    id: "final-jacket",
    enabled: true,
    src: finalJacket,
    alt: "Damaged Goods final jacket",
    fullViewport: true,
    desktopObjectPosition: "50% 30%",
    mobileObjectPosition: "50% 20%",
  },
];
