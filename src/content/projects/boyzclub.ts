import type { SequencePanel } from "@/content/types";

import heroCarPhoto from "../../../assets/projects/boyzclub/BZC 1.png";
import statementPhoto from "../../../assets/projects/boyzclub/Seccond image.png";
import identityChapterPhoto from "../../../assets/projects/boyzclub/The Identity 2.png";
import identityCampaignPhoto from "../../../assets/projects/boyzclub/BoyzClub Image.png";
import logoBlackWhite from "../../../assets/projects/boyzclub/Logo 1.png";
import logoExplanation from "../../../assets/projects/boyzclub/Logo Explanation.png";
import packageChapterPhoto from "../../../assets/projects/boyzclub/The Package.png";
import mysteryBoxFlat from "../../../assets/projects/boyzclub/Mystery BOx.png";
import polybagAtmosphere from "../../../assets/projects/boyzclub/Poly 2.png";
import polybagFrontBack from "../../../assets/projects/boyzclub/Polybag Design.png";
import uniformChapterPhoto from "../../../assets/projects/boyzclub/The Uniform.png";
import shirtHawaiian from "../../../assets/projects/boyzclub/Shirt.png";
import shirtSynthTiger from "../../../assets/projects/boyzclub/sYNTH.png";
import flannelStreet1 from "../../../assets/projects/boyzclub/Flannel 1.png";
import flannelStreet2 from "../../../assets/projects/boyzclub/Flannel 2.png";
import flannelStudio from "../../../assets/projects/boyzclub/Flannel 3.png";
import capProduct from "../../../assets/projects/boyzclub/Hat.png";
import jeansProduct from "../../../assets/projects/boyzclub/Jeans.png";
import siteChapterPhoto from "../../../assets/projects/boyzclub/The Website.png";
import siteMockup from "../../../assets/projects/boyzclub/WebSite 2.png";
import closingPortrait from "../../../assets/projects/boyzclub/Last Image.png";

/**
 * One panel per beat in boyzclub-layout-reference.webp, in the exact order
 * of that reference board — a flat, image-led reconstruction rather than an
 * authored hero/chapters/ecosystem structure. Two full-bleed video breaks
 * (break-film, drop-film) fill the black spacer "pages" from the reference
 * mockup. Panel shape is shared (@/content/types SequencePanel) with
 * Damaged Goods; the video variant is BoyzClub-only so far.
 */
export const boyzClubPanels: SequencePanel[] = [
  {
    id: "hero",
    enabled: true,
    src: heroCarPhoto,
    alt: "Camouflaged sports car with the BoyzClub wordmark",
    fullViewport: true,
    desktopObjectPosition: "50% 35%",
    mobileObjectPosition: "50% 25%",
    priority: true,
  },
  {
    id: "statement",
    enabled: true,
    src: statementPhoto,
    alt: "A complete streetwear identity developed across apparel, packaging, digital and campaign culture. Built to stand out, not blend in.",
  },
  {
    id: "identity-chapter",
    enabled: true,
    src: identityChapterPhoto,
    alt: "01 The Identity",
  },
  {
    id: "identity-campaign",
    enabled: true,
    src: identityCampaignPhoto,
    alt: "BoyzClub campaign portrait wearing the identity",
  },
  {
    id: "logo-bw",
    enabled: true,
    src: logoBlackWhite,
    alt: "BoyzClub wordmark in black and white",
  },
  {
    id: "logo-elements",
    enabled: true,
    src: logoExplanation,
    alt: "BoyzClub primary logo, brand icon and supporting graphic",
  },
  {
    id: "typography",
    enabled: false,
    note:
      "Typography presentation — awaiting either the licensed display-font file or a real cropped specimen asset. The only supplied file (font image.png) is a font marketplace's own promotional graphic, not original BoyzClub work, so it isn't used here.",
  },
  {
    id: "package-chapter",
    enabled: true,
    src: packageChapterPhoto,
    alt: "02 The Package",
  },
  {
    id: "mystery-box",
    enabled: true,
    src: mysteryBoxFlat,
    alt: "BoyzClub mystery box flat artwork",
  },
  {
    id: "packaging-lifestyle",
    enabled: false,
    note:
      "Packaging lifestyle image — person in a green striped top handling the stacked BoyzClub boxes. Not yet supplied.",
  },
  {
    id: "polybag-campaign",
    enabled: true,
    src: polybagAtmosphere,
    alt: "BoyzClub polybags",
  },
  {
    id: "polybag-front-back",
    enabled: true,
    src: polybagFrontBack,
    alt: "BoyzClub polybag, front and back",
  },
  {
    id: "uniform-chapter",
    enabled: true,
    src: uniformChapterPhoto,
    alt: "03 The Uniform",
  },
  {
    id: "uniform-film",
    enabled: true,
    kind: "video",
    src: "/boyzclub/drop-film.mp4",
    alt: "BoyzClub drop film — the collection in motion",
    fullViewport: true,
  },
  {
    id: "shirt-hawaiian",
    enabled: true,
    src: shirtHawaiian,
    alt: "BoyzClub Miami Brushstroke short-sleeve shirt, flat lay",
  },
  {
    id: "shirt-synth-tiger",
    enabled: true,
    src: shirtSynthTiger,
    alt: "BoyzClub Synth Tiger button-down shirt, flat lay",
  },
  {
    id: "flannel-street-1",
    enabled: true,
    src: flannelStreet1,
    alt: "BoyzClub plaid overshirt worn on the street",
  },
  {
    id: "flannel-street-2",
    enabled: true,
    src: flannelStreet2,
    alt: "BoyzClub blue plaid shirt and pinstripe trousers worn on the street",
  },
  {
    id: "flannel-studio",
    enabled: true,
    src: flannelStudio,
    alt: "BoyzClub purple plaid shirt, studio look",
  },
  {
    id: "night-campaign",
    enabled: false,
    note:
      "Night campaign image — model photographed from behind in a street/night setting. Not yet supplied.",
  },
  {
    id: "cap-product",
    enabled: true,
    src: capProduct,
    alt: "BoyzClub cap held against denim",
  },
  {
    id: "jeans-product",
    enabled: true,
    src: jeansProduct,
    alt: "BoyzClub washed denim jeans, back detail",
  },
  {
    id: "pre-site-film",
    enabled: true,
    kind: "video",
    src: "/boyzclub/break-film.mp4",
    alt: "BoyzClub motion break — brand campaign footage",
    fullViewport: true,
  },
  {
    id: "site-chapter",
    enabled: true,
    src: siteChapterPhoto,
    alt: "04 The Site",
  },
  {
    id: "website-mockup",
    enabled: true,
    src: siteMockup,
    alt: "BoyzClub website — a limited drop shopping experience, Midnight Blossom campaign",
  },
  {
    id: "final-portrait",
    enabled: true,
    src: closingPortrait,
    alt: "BoyzClub closing campaign portrait",
    fullViewport: true,
    desktopObjectPosition: "50% 30%",
    mobileObjectPosition: "50% 20%",
  },
];
