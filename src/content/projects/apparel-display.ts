import { graphicTees, TSHIRT_MODEL } from "./graphic-tees";

/**
 * The Apparel display's tabs. Each collection is one tab: its own heading
 * and its own strip of garments.
 *
 *  - Graphic T's   — src/content/projects/graphic-tees.ts, built by
 *                    scripts/build-tshirt-assets.mjs. One shared tee model;
 *                    each shirt is a print (texture) on it.
 *  - Pattern AOPs  — all-over-print button-downs, built by
 *                    scripts/build-aop-assets.mjs from
 *                    assets/projects/apperal/pattern AOPs/. Each shirt is
 *                    its own model: the GLBs map their pattern at their own
 *                    scale, so they are shown exactly as authored.
 *  - Hoodies       — no garments yet: the tab shows a "coming soon" state
 *                    until models are supplied
 */
export type Garment = {
  slug: string;
  name: string;
  /** 2D cutout for the strip (and for the stage when there is nothing 3D) */
  flat: string;
  /** this garment's own 3D model, shown as authored */
  model?: string;
  /** or: a base-colour texture for the collection's shared 3D model */
  print?: string;
};

export type GarmentCollection = {
  id: string;
  /** the tab's label */
  label: string;
  /** the big red heading while this tab is open */
  title: string;
  /** small caption on the name tag */
  nameLabel: string;
  /** what one item is called, for screen readers ("T-shirt", "shirt"…) */
  noun: string;
  /** shared 3D model that the items' `print`s go on */
  model?: string;
  /** show the back first (T-shirt prints are on the back) */
  faceBack: boolean;
  /** has "in the real world" photos under the display */
  hasGallery: boolean;
  items: Garment[];
};

/** Names are the preview PNGs' file names (see the build script for the pairs). */
const aop = (slug: string, name: string): Garment => ({
  slug,
  name,
  flat: `/apparel/aop/flat/${slug}.webp`,
  model: `/apparel/aop/models/${slug}.glb`,
});

export const patternShirts: Garment[] = [
  aop("ronin", "Ronin"),
  aop("neo-tokyo", "Neo Tokyo"),
  aop("midnight-blossom", "Midnight Blossom"),
  aop("miami-brushstroke", "Miami Brushstroke"),
  aop("nods-aop", "NODS AOP"),
  aop("conspiracy-theory", "Conspiracy Theory"),
  aop("arcade-night", "Arcade Night"),
  aop("x-ray", "X-Ray"),
  aop("synth-tiger", "Synth Tiger"),
  aop("marbloro", "Marbloro"),
  aop("forest-stripes", "Forest Stripes"),
  aop("fourth-of-july", "4th Of July"),
  aop("purple-haze", "Purple Haze"),
  aop("sex-ism", "Sex.Ism"),
  aop("black-naja", "Black Naja"),
];

export const apparelCollections: GarmentCollection[] = [
  {
    id: "graphic-tees",
    label: "Graphic T’s",
    title: "Graphic T’s",
    nameLabel: "Shirt name",
    noun: "T-shirt",
    model: TSHIRT_MODEL,
    faceBack: true,
    hasGallery: true,
    items: graphicTees,
  },
  {
    id: "pattern-aops",
    label: "Pattern AOPs",
    title: "Pattern AOPs",
    nameLabel: "Pattern name",
    noun: "shirt",
    faceBack: false,
    hasGallery: false,
    items: patternShirts,
  },
  {
    id: "hoodies",
    label: "Hoodies",
    title: "Hoodies",
    nameLabel: "Hoodie name",
    noun: "hoodie",
    faceBack: true,
    hasGallery: false,
    items: [],
  },
];
