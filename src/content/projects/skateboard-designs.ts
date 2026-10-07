import type { StaticImageData } from "next/image";

import dobermannCampaign from "../../../assets/projects/skateboarding/1 Fav.png";
import samuraiCampaign from "../../../assets/projects/skateboarding/hf_20260713_144648_eab4affd-b95c-405f-97cd-3f50bb56a7cd.png";
import damagedGoodsCampaign from "../../../assets/projects/skateboarding/4 5.png";

/**
 * Where a deck goes when picked. Only REAL destinations: an existing
 * project page, or one of the campaign photographs further down this same
 * page. A deck with neither is `none` — it still lifts on hover, it just
 * isn't a link (no invented pages or names).
 */
export type DeckDestination =
  | { kind: "project"; href: string }
  | { kind: "campaign"; campaignId: string }
  | { kind: "none" };

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

export interface SkateCampaign {
  id: string;
  src: StaticImageData;
  alt: string;
}

export const DECK_MODEL = "/skateboarding/deck.glb";

const deck = (id: string, title: string, alt: string, edge: string, accent: string, destination: DeckDestination): SkateDeck => ({
  id,
  title,
  alt,
  print: `/skateboarding/prints/${id}.png`,
  edge,
  accent,
  destination,
});

/** Left to right on the wall. */
export const skateDecks: SkateDeck[] = [
  deck("ronin", "Ronin", "Drop In deck: pink and blue samurai graphic", "#db1464", "#ff3d8f", {
    kind: "campaign",
    campaignId: "campaign-samurai",
  }),
  deck("cobra", "Cobra", "Drop In deck: red cobra and skull graphic", "#cf2314", "#e8442e", { kind: "none" }),
  deck("corruption", "Corruption", "Drop In deck: pink figure before a teal Statue of Liberty", "#0e9ca5", "#19b8c2", {
    kind: "none",
  }),
  deck("damaged-goods", "Damaged Goods", "Damaged Goods deck: lime lettering around a purple portrait", "#a9d114", "#b6e61f", {
    kind: "project",
    href: "/projects/damaged-goods",
  }),
  deck("dobermann", "Dobermann", "Black deck: snarling dobermann wearing a gold chain", "#111111", "#d7ae57", {
    kind: "campaign",
    campaignId: "campaign-dobermann",
  }),
  deck("error-404", "Error 404", "Drop In deck: a masked face with an error pop-up, blue top", "#165298", "#ff5a3c", {
    kind: "none",
  }),
];

/** Top to bottom, in the approved order. */
export const skateCampaigns: SkateCampaign[] = [
  {
    id: "campaign-dobermann",
    src: dobermannCampaign,
    alt: "Hooded figure holding the dobermann deck on the bonnet of a black Mercedes, surrounded by sheep",
  },
  {
    id: "campaign-samurai",
    src: samuraiCampaign,
    alt: "Figure holding the pink and blue samurai deck in front of their face while two hands point pistols at it from either side",
  },
  {
    id: "campaign-damaged-goods",
    src: damagedGoodsCampaign,
    alt: "Figure holding the lime Damaged Goods deck horizontally across their face",
  },
];
