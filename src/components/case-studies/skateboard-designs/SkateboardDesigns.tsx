import { ProjectExitNav } from "@/components/ui/ProjectExitNav";
import type { Category, Project } from "@/content/types";

import { DeckWall } from "./DeckWall";
import { TvSection } from "./TvSection";

/**
 * Skateboard Designs: the interactive deck wall, then the retro TV, whose
 * screen plays the campaign photographs (they used to follow the wall as
 * six full-bleed images). The TV section carries the id the wall's decks
 * and its "Watch the campaign" control scroll to.
 */
export function SkateboardDesigns({ category, nextProject }: { category?: Category; nextProject?: Project }) {
  return (
    <main className="flex flex-col bg-black text-off-white">
      <DeckWall />
      <TvSection />
      <ProjectExitNav category={category} nextProject={nextProject} />
    </main>
  );
}
