/**
 * Where a deck goes from its close-up. Only REAL destinations: an existing
 * project page, or the TV further down this same page, whose screen plays
 * the campaign photographs. A deck with neither is `none` (no invented
 * pages or names).
 */
export type DeckDestination = { kind: "project"; href: string } | { kind: "tv" } | { kind: "none" };

/**
 * A deck on the wall, in 3D: the shared deck model
 * (public/skateboarding/deck.glb) wearing this deck's print and edge colour,
 * both taken from its GLB by scripts/build-skate-deck-assets.mjs. The print
 * is the original 2048x4096 PNG, untouched.
 */
export interface SkateDeck {
  id: string;
  /** Deck name, from the GLB's own file name. Shown in place of the number on hover/focus (always, on phones). */
  title: string;
  alt: string;
  /** the print both faces wear (the graphic underneath, the logo on the smooth top) */
  print: string;
  /** the deck's edge, as authored in its GLB */
  edge: string;
  /** Label accent: the edge colour where it reads on the dark wall, otherwise a colour from the print. */
  accent: string;
  destination: DeckDestination;
}

export const DECK_MODEL = "/skateboarding/deck.glb";

/**
 * The retro TV under the wall (public/skateboarding/tv, built by
 * scripts/build-tv-assets.mjs): its screen loops a clip of the six campaign
 * photographs, which used to follow the wall as full-bleed images.
 */
export const TV_MODEL = "/skateboarding/tv/tv.glb";
export const TV_SCREEN_CLIP = "/skateboarding/tv/screen.mp4";
/** the TV section's id: what the decks and the wall's footer scroll to */
export const SKATE_TV_ID = "skate-tv";

const deck = (id: string, title: string, alt: string, edge: string, accent: string, destination: DeckDestination): SkateDeck => ({
  id,
  title,
  alt,
  print: `/skateboarding/prints/${id}.webp`,
  edge,
  accent,
  destination,
});

/** Left to right on the wall. */
export const skateDecks: SkateDeck[] = [
  deck("ronin", "Ronin", "Drop In deck: pink and blue samurai graphic", "#db1464", "#ff3d8f", { kind: "tv" }),
  deck("cobra", "Cobra", "Drop In deck: red cobra and skull graphic", "#cf2314", "#e8442e", { kind: "tv" }),
  deck("corruption", "Corruption", "Drop In deck: pink figure before a teal Statue of Liberty", "#0e9ca5", "#19b8c2", { kind: "tv" }),
  deck("damaged-goods", "Damaged Goods", "Damaged Goods deck: lime lettering around a purple portrait", "#a9d114", "#b6e61f", {
    kind: "project",
    href: "/projects/damaged-goods",
  }),
  deck("dobermann", "Dobermann", "Black deck: snarling dobermann wearing a gold chain", "#111111", "#d7ae57", { kind: "tv" }),
  deck("error-404", "Error 404", "Drop In deck: a masked face with an error pop-up, blue top", "#165298", "#ff5a3c", { kind: "tv" }),
];

