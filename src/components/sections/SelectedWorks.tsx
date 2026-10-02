import { getCategoryBySlug, getSelectedWorks } from "@/lib/content";
import { SectionTitle } from "@/components/ui/SectionTitle";

import { SelectedWorksCarousel } from "./SelectedWorksCarousel";

/**
 * 04_CONTENT_ARCHITECTURE.md: a curated collection, not a complete archive.
 * Opens with a chapter card using the Intro's texture language.
 *
 * The homepage snaps one section per gesture (see globals.css): the chapter
 * card is a full-screen stop of its own, then the work itself plays as one
 * full-screen stop on pure black — an endlessly cycling carousel (see
 * SelectedWorksCarousel) rather than one scroll per image.
 */
export function SelectedWorks() {
  const works = getSelectedWorks();
  if (works.length === 0) return null;

  return (
    <section id="selected-works" className="relative bg-black">
      <SectionTitle title="Selected Work" kicker="Curated" texture="/textures/black-page.png" />
      <SelectedWorksCarousel
        works={works.map((project) => ({
          slug: project.slug,
          title: project.title,
          category: getCategoryBySlug(project.category)?.title ?? "",
          cover: project.featuredCover ?? project.cover,
        }))}
      />
    </section>
  );
}
