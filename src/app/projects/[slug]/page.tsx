import { notFound } from "next/navigation";

import { BoyzClubCaseStudy } from "@/components/case-studies/BoyzClubCaseStudy";
import { DamagedGoodsCaseStudy } from "@/components/case-studies/DamagedGoodsCaseStudy";
import { ApparelIntro } from "@/components/categories/ApparelIntro";
import { GraphicTees } from "@/components/case-studies/graphic-tees/GraphicTees";
import { SkateboardDesigns } from "@/components/case-studies/skateboard-designs/SkateboardDesigns";
import { LxixCaseStudy } from "@/components/case-studies/LxixCaseStudy";
import { StickerPoleDemo } from "@/components/case-studies/sticker-pole-demo/StickerPoleDemo";
import { StatueShowcase } from "@/components/lab/StatueShowcase";
import { TagDesignsCaseStudy } from "@/components/case-studies/TagDesignsCaseStudy";
import {
  getAllProjects,
  getCategoryBySlug,
  getNextProject,
  getProjectBySlug,
} from "@/lib/content";
import { graphicTees, TSHIRT_MODEL } from "@/content/projects/graphic-tees";
import { getHeroImages } from "@/lib/hero-images";

export function generateStaticParams() {
  return getAllProjects().map((project) => ({ slug: project.slug }));
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  if (slug === "boyzclub") {
    return <BoyzClubCaseStudy nextProject={getNextProject(slug)} />;
  }

  if (slug === "lxix") {
    return <LxixCaseStudy nextProject={getNextProject(slug)} />;
  }

  if (slug === "dropin-skateboards") {
    return <SkateboardDesigns category={getCategoryBySlug(project.category)} />;
  }

  if (slug === "graphic-tees") {
    // opens with the animated APPAREL cover, which fades to black into the page
    return (
      <ApparelIntro
        // cached during the intro, so the 3D display is ready when it ends
        preload={[TSHIRT_MODEL, graphicTees[0].print, "/apparel/t-shirts/display-bg.jpg"].filter(
          (url): url is string => Boolean(url),
        )}
      >
        <GraphicTees category={getCategoryBySlug(project.category)} />
      </ApparelIntro>
    );
  }

  if (slug === "cyclops-sculpture") {
    return <StatueShowcase />;
  }

  if (slug === "sticker-archive") {
    const category = getCategoryBySlug(project.category);
    if (category) {
      return <StickerPoleDemo category={category} />;
    }
  }

  if (slug === "damaged-goods") {
    const category = getCategoryBySlug(project.category);
    if (category) {
      return <DamagedGoodsCaseStudy category={category} />;
    }
  }

  if (slug === "tag-designs") {
    const category = getCategoryBySlug(project.category);
    if (category) {
      return <TagDesignsCaseStudy category={category} heroImages={getHeroImages()} />;
    }
  }

  // Placeholder only — the generic project page structure (Hero, Challenge,
  // Process, Outcome, Gallery, Next Project) for the other projects is
  // built in Phase 3.
  return (
    <main className="flex min-h-screen flex-col bg-black text-off-white">
      <h1>{project.title}</h1>
    </main>
  );
}
