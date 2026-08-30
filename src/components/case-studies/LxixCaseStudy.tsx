import { PanelSequence } from "@/components/case-studies/PanelSequence";
import { NextProjectNav } from "@/components/ui/NextProjectNav";
import { lxixPanels } from "@/content/projects/lxix";
import type { Project } from "@/content/types";

export function LxixCaseStudy({ nextProject }: { nextProject?: Project }) {
  return (
    <PanelSequence
      panels={lxixPanels}
      framed
      exitNav={nextProject ? <NextProjectNav project={nextProject} /> : null}
    />
  );
}
