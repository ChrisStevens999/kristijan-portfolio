import { PanelSequence } from "@/components/case-studies/PanelSequence";
import { ProjectExitNav } from "@/components/ui/ProjectExitNav";
import { boyzClubPanels } from "@/content/projects/boyzclub";
import type { Category, Project } from "@/content/types";

export function BoyzClubCaseStudy({ category, nextProject }: { category?: Category; nextProject?: Project }) {
  return (
    <PanelSequence
      title="BoyzClub"
      panels={boyzClubPanels}
      framed
      exitNav={<ProjectExitNav category={category} nextProject={nextProject} />}
    />
  );
}
