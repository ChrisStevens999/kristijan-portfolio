import type { SequencePanel } from "@/content/types";

import coverPhoto from "../../../assets/projects/lxix/Cover Page.png";
import introStatement from "../../../assets/projects/lxix/p2.png";
import moodboard from "../../../assets/projects/lxix/MB 2.png";
import visualIdentityStatement from "../../../assets/projects/lxix/p3.png";
import brandVisualsChapter from "../../../assets/projects/lxix/Brand Visualss.png";
import wordmarkBlackWhite from "../../../assets/projects/lxix/Logo.png";
import symbolBlackWhite from "../../../assets/projects/lxix/Icon Design.png";
import brandbookMockup from "../../../assets/projects/lxix/32.png";
import iconStatement from "../../../assets/projects/lxix/ICon tex.png";
import cufflinkWatchDetail from "../../../assets/projects/lxix/2.png";
import sunglassesPortrait from "../../../assets/projects/lxix/7.png";
import ringedHandsDetail from "../../../assets/projects/lxix/5.png";
import lipsSymbolDetail from "../../../assets/projects/lxix/6.png";
import billboardAtNight from "../../../assets/projects/lxix/Car page.png";
import bottleChapter from "../../../assets/projects/lxix/BB.png";
import bottlePairPackaging from "../../../assets/projects/lxix/Package 2.png";
import bottleTriptychStatement from "../../../assets/projects/lxix/44.png";
import invitationCardUnboxing from "../../../assets/projects/lxix/8.png";
import wetGlassWordmark from "../../../assets/projects/lxix/11.png";
import closingCredit from "../../../assets/projects/lxix/End Page.png";

/**
 * One panel per beat in the supplied LXIX reference board, in the exact
 * order of that reference — almost every panel is a flat, already-art-
 * directed image (text/captions baked into the pixels, not live overlays),
 * reusing the same PanelSequence renderer as BoyzClub/Damaged Goods. Two
 * exceptions:
 *
 *  - `intro-video`: the reference board shows a black spacer panel at this
 *    exact point, replaced here with the project's real intro animation
 *    footage per explicit request.
 *  - `detail-row`: the reference shows the sunglasses/hands/lips detail
 *    shots as a tight side-by-side row, but those three exist as separate
 *    source files (not one flattened image like the moodboard or the
 *    bottle triptych below) — rendered via PanelSequence's `row` panel kind
 *    instead of stacking them as three full-width panels, which doesn't
 *    match the reference.
 *
 * The moodboard (`moodboard`) and 3-across bottle shot
 * (`bottleTriptychStatement`) ARE already pre-composited single images
 * (specific crops/captions baked in), so those stay as plain image panels,
 * not rebuilt as rows.
 */
export const lxixPanels: SequencePanel[] = [
  {
    id: "cover",
    enabled: true,
    src: coverPhoto,
    alt: "LXIX — a champagne bottle held to a model's lips, wordmark below",
    fullViewport: true,
    priority: true,
  },
  {
    id: "intro-statement",
    enabled: true,
    src: introStatement,
    alt: "LXIX is a luxury champagne brand where aristocracy collides with the attitude of rebellion. Rooted in art, rebellion, and provocative storytelling, the brand transforms traditional luxury into something bolder, more cultural, and unapologetically disruptive.",
  },
  {
    id: "moodboard",
    enabled: true,
    src: moodboard,
    alt: "A glimpse of the moodboard for this project — ten reference photographs",
  },
  {
    id: "visual-identity-statement",
    enabled: true,
    src: visualIdentityStatement,
    alt: "The soul of LXIX begins with restraint: an elegant logo, refined iconography, and a visual identity rooted in timeless luxury. The rebellion enters through the physical world of the brand — sculptural bottle shapes, bold provocative packaging, and marketing that breaks away from the conventions of traditional champagne.",
  },
  {
    id: "brand-visuals-chapter",
    enabled: true,
    src: brandVisualsChapter,
    alt: "Brand Visuals — campaign portrait in a patent trench coat with a Doberman",
  },
  {
    id: "wordmark-black-white",
    enabled: true,
    src: wordmarkBlackWhite,
    alt: "LXIX wordmark on black and on white",
  },
  {
    id: "symbol-black-white",
    enabled: true,
    src: symbolBlackWhite,
    alt: "LXIX symbol mark on white and on black",
  },
  {
    id: "brandbook-mockup",
    enabled: true,
    src: brandbookMockup,
    alt: "Two stacked copies of the LXIX brandbook, standards and style guidelines",
  },
  {
    id: "intro-video",
    enabled: true,
    kind: "video",
    src: "/lxix/intro-animation.mp4",
    alt: "LXIX intro animation",
    fullViewport: false,
  },
  {
    id: "icon-statement",
    enabled: true,
    src: iconStatement,
    alt: "The LXIX icon acts as the driving visual element across the brand's merchandise, extending the identity beyond the bottle and into a recognizable cultural symbol.",
  },
  {
    id: "cufflink-watch-detail",
    enabled: true,
    src: cufflinkWatchDetail,
    alt: "LXIX cufflink detail beside a wristwatch",
  },
  {
    id: "detail-row",
    enabled: true,
    kind: "row",
    items: [
      { src: sunglassesPortrait, alt: "Close-up portrait wearing LXIX sunglasses, water droplets on skin" },
      { src: ringedHandsDetail, alt: "Hands in rings and chains gripping an LXIX bag, the symbol engraved in metal" },
      { src: lipsSymbolDetail, alt: "Close-up of lips holding the LXIX symbol in polished metal" },
    ],
  },
  {
    id: "billboard-at-night",
    enabled: true,
    src: billboardAtNight,
    alt: "LXIX wordmark lit on a night bus-stop billboard as a car passes",
  },
  {
    id: "bottle-chapter",
    enabled: true,
    src: bottleChapter,
    alt: "The Bottle",
  },
  {
    id: "bottle-pair-packaging",
    enabled: true,
    src: bottlePairPackaging,
    alt: "Two LXIX bottle packaging concepts side by side",
  },
  {
    id: "bottle-triptych-statement",
    enabled: true,
    src: bottleTriptychStatement,
    alt: "Three studio shots of the LXIX bottle — framed, boxed, and among rocks. The vessel becomes the statement. Through exaggerated form, symbolism, and material experimentation, LXIX turns traditional champagne packaging into contemporary art objects.",
  },
  {
    id: "invitation-card-unboxing",
    enabled: true,
    src: invitationCardUnboxing,
    alt: "An LXIX invitation card reading 'You've been noticed', staged on marble",
  },
  {
    id: "wet-glass-wordmark",
    enabled: true,
    src: wetGlassWordmark,
    alt: "The LXIX wordmark etched in condensation on glass",
  },
  {
    id: "closing-credit",
    enabled: true,
    src: closingCredit,
    alt: "From concept to execution — this project is a creation of Kristijan Stevkovski. LXIX symbol and wordmark.",
  },
];
