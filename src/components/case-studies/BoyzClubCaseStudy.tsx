import { PanelSequence } from "@/components/case-studies/PanelSequence";
import { NextProjectNav } from "@/components/ui/NextProjectNav";
import { boyzClubPanels } from "@/content/projects/boyzclub";
import type { Project } from "@/content/types";

export function BoyzClubCaseStudy({ nextProject }: { nextProject?: Project }) {
  return (
    <PanelSequence
      panels={boyzClubPanels}
      exitNav={nextProject ? <NextProjectNav project={nextProject} /> : null}
    />
  );
}
