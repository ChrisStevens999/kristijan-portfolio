import { PanelSequence } from "@/components/case-studies/PanelSequence";
import { NextProjectNav } from "@/components/ui/NextProjectNav";
import { damagedGoodsPanels } from "@/content/projects/damaged-goods";
import type { Category } from "@/content/types";

export function DamagedGoodsCaseStudy({ category }: { category: Category }) {
  return (
    <PanelSequence
      panels={damagedGoodsPanels}
      exitNav={<NextProjectNav mode="back-to-category" category={category} />}
    />
  );
}
