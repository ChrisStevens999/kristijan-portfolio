import Image from "next/image";

import { NextProjectNav } from "@/components/ui/NextProjectNav";
import { skateCampaigns } from "@/content/projects/skateboard-designs";
import type { Category } from "@/content/types";

import { DeckWall } from "./DeckWall";

/**
 * Skateboard Designs: the interactive deck wall, then the three campaign
 * photographs — full-bleed, edge to edge, natural proportions, no gaps,
 * cards, headings or copy — in the approved order. Each carries the id the
 * wall's decks and "Scroll for campaigns" control scroll to.
 */
export function SkateboardDesigns({ category }: { category?: Category }) {
  return (
    <main className="flex flex-col bg-black text-off-white">
      <DeckWall />

      {skateCampaigns.map((campaign) => (
        <Image
          key={campaign.id}
          id={campaign.id}
          src={campaign.src}
          alt={campaign.alt}
          sizes="100vw"
          quality={95}
          placeholder="blur"
          className="block h-auto w-full"
        />
      ))}

      {category ? <NextProjectNav mode="back-to-category" category={category} /> : null}
    </main>
  );
}
