"use client";

import { useRef } from "react";

import { getSelectedWorks } from "@/lib/content";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SelectedWorkCard } from "@/components/ui/SelectedWorkCard";

/** Held after the title finishes fading in (transition duration 1s) before auto-scrolling, so it's actually legible for a beat first. */
const AUTO_SCROLL_DELAY_MS = 1300;

/**
 * 04_CONTENT_ARCHITECTURE.md: a curated collection, not a complete archive.
 * This section presents work, it does not describe it — no titles,
 * categories or metadata. The imagery is the navigation: one continuous
 * gallery of full-screen images with only a hairline seam between them,
 * not separated "cards" — one piece should lead directly into the next.
 * Opens with a chapter card using the Intro's texture language.
 *
 * The chapter card auto-advances into the first project once its title has
 * been on screen for a beat, rather than requiring a second manual scroll
 * past what looks like a title screen — skipped for prefers-reduced-motion,
 * and skipped if the visitor has already scrolled past the target by the
 * time the delay elapses (so a fast scroller is never yanked backward).
 */
export function SelectedWorks() {
  const works = getSelectedWorks();
  const worksRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);

  function handleTitleVisible() {
    if (hasAutoScrolled.current) return;
    hasAutoScrolled.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setTimeout(() => {
      const target = worksRef.current;
      if (!target) return;
      // Already scrolled to (or past) the first project — don't yank back.
      if (target.getBoundingClientRect().top <= 0) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, AUTO_SCROLL_DELAY_MS);
  }

  if (works.length === 0) return null;

  return (
    <section id="selected-works" className="relative bg-black">
      <SectionTitle
        title="Selected Work"
        kicker="Curated"
        texture="/textures/black-page.png"
        onTitleVisible={handleTitleVisible}
      />
      <div ref={worksRef} className="flex flex-col gap-1">
        {works.map((project, index) => (
          <SelectedWorkCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
