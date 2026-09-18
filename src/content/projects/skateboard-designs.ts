import type { StaticImageData } from "next/image";

import cobraDeck from "../../../assets/projects/skateboarding/Cobra.png";
import damagedGoodsDeck from "../../../assets/projects/skateboarding/Damaged Goods.png";
import samuraiDeck from "../../../assets/projects/skateboarding/Samurai Design.png";
import dobermannDeck from "../../../assets/projects/skateboarding/Dobermann Design.png";
import goldenDeck from "../../../assets/projects/skateboarding/Saf-Golden Design.png";
import boardDeck from "../../../assets/projects/skateboarding/Saf-Board Design.png";
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

export interface SkateDeck {
  id: string;
  /** Transparent cutout, 834x1871 — the deck itself sits in roughly the middle 58% of the canvas, with its own soft shadow baked around it. */
  src: StaticImageData;
  alt: string;
  /** Project name, only where one was supplied (the reference labels just "Damaged Goods"); otherwise the deck shows its number. */
  title?: string;
  /** Label accent, sampled from the deck's own artwork. */
  accent: string;
  destination: DeckDestination;
}

export interface SkateCampaign {
  id: string;
  src: StaticImageData;
  alt: string;
}

/** Left to right, exactly as mounted in the approved reference. */
export const skateDecks: SkateDeck[] = [
  {
    id: "cobra",
    src: cobraDeck,
    alt: "Dropin deck: red cobra and skull graphic",
    accent: "#e8442e",
    destination: { kind: "none" },
  },
  {
    id: "damaged-goods",
    src: damagedGoodsDeck,
    alt: "Damaged Goods deck: lime lettering around a purple portrait",
    title: "Damaged Goods",
    accent: "#b6e61f",
    destination: { kind: "project", href: "/projects/damaged-goods" },
  },
  {
    id: "samurai",
    src: samuraiDeck,
    alt: "Dropin deck: pink and blue samurai graphic",
    accent: "#ff3d8f",
    destination: { kind: "campaign", campaignId: "campaign-samurai" },
  },
  {
    id: "dobermann",
    src: dobermannDeck,
    alt: "Black deck: snarling dobermann wearing a gold chain",
    accent: "#d7ae57",
    destination: { kind: "campaign", campaignId: "campaign-dobermann" },
  },
  {
    id: "golden",
    src: goldenDeck,
    alt: "Gold deck with a black monogram",
    accent: "#e2c079",
    destination: { kind: "none" },
  },
  {
    id: "board",
    src: boardDeck,
    alt: "Black deck with gold mace, monogram and boot",
    accent: "#d7ae57",
    destination: { kind: "none" },
  },
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
