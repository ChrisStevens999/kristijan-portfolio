import { PanelSequence } from "@/components/case-studies/PanelSequence";
import { ProjectExitNav } from "@/components/ui/ProjectExitNav";
import { lxixPanels } from "@/content/projects/lxix";
import type { Category, Project } from "@/content/types";

export function LxixCaseStudy({ category, nextProject }: { category?: Category; nextProject?: Project }) {
  return (
    <PanelSequence
      panels={lxixPanels}
      framed
      exitNav={<ProjectExitNav category={category} nextProject={nextProject} />}
    />
  );
}
