import { graphicTees, type RealWorldPhoto, realWorldPhotos, TSHIRT_MODEL } from "./graphic-tees";

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
 *  - Hoodies       — built by scripts/build-hoodie-assets.mjs from
 *                    assets/projects/apperal/hoodies/. Back-print hoodies
 *                    are like the T-shirts: one shared hoodie model, each
 *                    hoodie is its print (the original 4096² PNG from its
 *                    GLB) on it. A pattern hoodie (its own UVs) or an
 *                    off-white one (its own trim colours) is its own model,
 *                    as authored.
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
  /** which side to show first, when it differs from the collection's */
  faceBack?: boolean;
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
  /** "in the real world" photos for the gallery under the display, if any */
  gallery?: RealWorldPhoto[];
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
  aop("mag-cut", "Mag Cut"),
];

/** "Shirts in the real world" — two mockup photos per pattern, in
 *  public/apparel/aop/gallery (built by the same script). Ordered so no two
 *  of the same shirt are neighbours. */
const patternPhoto = (slug: string, n: 1 | 2, shirt: string): RealWorldPhoto => ({
  src: `/apparel/aop/gallery/${slug}-${n}.webp`,
  alt: `Wearing the ${shirt} shirt`,
  shirt,
});

export const patternPhotos: RealWorldPhoto[] = ([1, 2] as const).flatMap((n) =>
  patternShirts.map((s) => patternPhoto(s.slug, n, s.name)),
);

export const HOODIE_MODEL = "/apparel/hoodies/hoodie.glb";

/** Names are the preview PNGs' file names (see the build script for the pairs). */
const hoodie = (slug: string, name: string, opts: Pick<Garment, "faceBack"> = {}): Garment => ({
  slug,
  name,
  flat: `/apparel/hoodies/flat/${slug}.webp`,
  print: `/apparel/hoodies/prints/${slug}.png`,
  ...opts,
});
/** shown as its own model, as authored: an all-over pattern (its own UVs,
 *  i.e. pattern scale) or a hoodie whose trim isn't the shared model's black */
const ownHoodie = (slug: string, name: string, opts: Pick<Garment, "faceBack"> = {}): Garment => ({
  slug,
  name,
  flat: `/apparel/hoodies/flat/${slug}.webp`,
  model: `/apparel/hoodies/models/${slug}.glb`,
  ...opts,
});

export const hoodies: Garment[] = [
  hoodie("bushido", "Bushido"),
  hoodie("deviant", "Deviant"),
  hoodie("error-404", "Error 404"),
  ownHoodie("la-leakers", "LA Leakers"),
  // the print is on the front
  hoodie("swimmin", "Swimmin", { faceBack: false }),
  ownHoodie("concrete-memories", "Concrete Memories"),
  // off-white, print on the front
  ownHoodie("purgatory", "Purgatory", { faceBack: false }),
  ownHoodie("brush-like-camo", "Brush Like Camo"),
  hoodie("operator", "Operator"),
  hoodie("vision", "Vision"),
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
    gallery: realWorldPhotos,
    items: graphicTees,
  },
  {
    id: "pattern-aops",
    label: "Pattern AOPs",
    title: "Pattern AOPs",
    nameLabel: "Pattern name",
    noun: "shirt",
    faceBack: false,
    gallery: patternPhotos,
    items: patternShirts,
  },
  {
    id: "hoodies",
    label: "Hoodies",
    title: "Hoodies",
    nameLabel: "Hoodie name",
    noun: "hoodie",
    model: HOODIE_MODEL,
    // the prints are on the back (a garment can say otherwise)
    faceBack: true,
    items: hoodies,
  },
];
