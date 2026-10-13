import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BoyzClubCaseStudy } from "@/components/case-studies/BoyzClubCaseStudy";
import { DamagedGoodsCaseStudy } from "@/components/case-studies/DamagedGoodsCaseStudy";
import { ApparelIntro } from "@/components/categories/ApparelIntro";
import { GraphicTees } from "@/components/case-studies/graphic-tees/GraphicTees";
import { SkateboardDesigns } from "@/components/case-studies/skateboard-designs/SkateboardDesigns";
import { LogofolioCaseStudy } from "@/components/case-studies/LogofolioCaseStudy";
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = getProjectBySlug((await params).slug);
  if (!project) return {};
  const description = project.introduction ?? project.summary;
  const image = typeof project.cover.src === "string" ? project.cover.src : project.cover.src.src;
  return {
    title: project.title,
    description,
    openGraph: { title: project.title, description, images: [{ url: image, alt: project.cover.alt }] },
  };
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

  // no case study of its own: it opens where it lives (e.g. the Apparel
  // display, with it selected) instead of an empty page
  if (project.href) {
    redirect(project.href);
  }

  // Every project ends with the same two exit doors (ProjectExitNav): back
  // to its category on the left, the next project in global order on the right.
  const category = getCategoryBySlug(project.category);
  const nextProject = getNextProject(slug);

  if (slug === "boyzclub") {
    return <BoyzClubCaseStudy category={category} nextProject={nextProject} />;
  }

  if (slug === "lxix") {
    return <LxixCaseStudy category={category} nextProject={nextProject} />;
  }

  if (slug === "logofolio") {
    return <LogofolioCaseStudy category={category} nextProject={nextProject} />;
  }

  if (slug === "dropin-skateboards") {
    return <SkateboardDesigns category={category} nextProject={nextProject} />;
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
        <GraphicTees category={category} nextProject={nextProject} />
      </ApparelIntro>
    );
  }

  if (slug === "cyclops-sculpture") {
    return <StatueShowcase category={category} nextProject={nextProject} />;
  }

  if (slug === "sticker-archive") {
    return <StickerPoleDemo category={category} nextProject={nextProject} />;
  }

  if (slug === "damaged-goods" && category) {
    return <DamagedGoodsCaseStudy category={category} nextProject={nextProject} />;
  }

  if (slug === "tag-designs" && category) {
    return <TagDesignsCaseStudy category={category} nextProject={nextProject} heroImages={getHeroImages()} />;
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
