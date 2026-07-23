import { getSelectedWorks } from "@/lib/content";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SelectedWorkCard } from "@/components/ui/SelectedWorkCard";

/**
 * 04_CONTENT_ARCHITECTURE.md: a curated collection, not a complete archive.
 * This section presents work, it does not describe it — no titles,
 * categories or metadata. The imagery is the navigation: one continuous
 * gallery of full-screen images with only a hairline seam between them,
 * not separated "cards" — one piece should lead directly into the next.
 * Opens with a chapter card using the Intro's texture language.
 */
export function SelectedWorks() {
  const works = getSelectedWorks();

  if (works.length === 0) return null;

  return (
    <section id="selected-works" className="relative bg-black">
      <SectionTitle
        title="Selected Work"
        kicker="Curated"
        texture="/textures/black-page.png"
      />
      <div className="flex flex-col gap-1">
        {works.map((project, index) => (
          <SelectedWorkCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
