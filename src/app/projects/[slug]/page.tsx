import { notFound } from "next/navigation";

import { BoyzClubCaseStudy } from "@/components/case-studies/BoyzClubCaseStudy";
import { DamagedGoodsCaseStudy } from "@/components/case-studies/DamagedGoodsCaseStudy";
import { TagDesignsCaseStudy } from "@/components/case-studies/TagDesignsCaseStudy";
import {
  getAllProjects,
  getCategoryBySlug,
  getNextProject,
  getProjectBySlug,
} from "@/lib/content";
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
