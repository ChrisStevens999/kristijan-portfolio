import type { SequencePanel } from "@/content/types";

import heroCarPhoto from "../../../assets/projects/boyzclub/BZC 1.png";
import statementPhoto from "../../../assets/projects/boyzclub/Seccond image.png";
import identityChapterPhoto from "../../../assets/projects/boyzclub/The Identity.png";
import identityCampaignPhoto from "../../../assets/projects/boyzclub/BoyzClub Image.png";
import logoBlackWhite from "../../../assets/projects/boyzclub/Logo 1.png";
import logoExplanation from "../../../assets/projects/boyzclub/Logo Explanation.png";
import packageChapterPhoto from "../../../assets/projects/boyzclub/The Package.png";
import mysteryBoxFlat from "../../../assets/projects/boyzclub/Mystery BOx.png";
import polybagAtmosphere from "../../../assets/projects/boyzclub/Poly 2.png";
import polybagFrontBack from "../../../assets/projects/boyzclub/Polybag Design.png";
import uniformChapterPhoto from "../../../assets/projects/boyzclub/The Uniform.png";
import shirtCollection from "../../../assets/projects/boyzclub/Multiple Products.jpg";
import siteChapterPhoto from "../../../assets/projects/boyzclub/The Website.png";
import siteMockup from "../../../assets/projects/boyzclub/WebSite Mockup.png";
import closingPortrait from "../../../assets/projects/boyzclub/Last Image.png";

/**
 * One panel per beat in boyzclub-layout-reference.webp, in the exact order
 * of that reference board. A flat sequence rather than a nested
 * hero/chapters/ecosystem shape — this case study is a literal image-led
 * reconstruction of the reference, not an authored content structure.
 * Panel shape is shared (@/content/types SequencePanel) with Damaged Goods.
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
    id: "shirt-collection",
    enabled: true,
    src: shirtCollection,
    alt: "Complete BoyzClub shirt collection",
  },
  {
    id: "night-campaign",
    enabled: false,
    note:
      "Night campaign image — model photographed from behind in a street/night setting. Not yet supplied.",
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
    alt: "BoyzClub website design, Texas Drop campaign",
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
