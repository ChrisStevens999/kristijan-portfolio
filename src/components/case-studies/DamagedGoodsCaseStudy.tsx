import { PanelSequence } from "@/components/case-studies/PanelSequence";
import { ProjectExitNav } from "@/components/ui/ProjectExitNav";
import { damagedGoodsPanels } from "@/content/projects/damaged-goods";
import type { Category, Project } from "@/content/types";

export function DamagedGoodsCaseStudy({ category, nextProject }: { category: Category; nextProject?: Project }) {
  return (
    <PanelSequence
      panels={damagedGoodsPanels}
      exitNav={<ProjectExitNav category={category} nextProject={nextProject} />}
    />
  );
}
