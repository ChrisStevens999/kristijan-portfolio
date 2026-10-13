import { LogofolioFilm } from "@/components/case-studies/logofolio/LogofolioFilm";
import { ProjectExitNav } from "@/components/ui/ProjectExitNav";
import { logofolioBrands } from "@/content/projects/logofolio";
import type { Category, Project } from "@/content/types";
import { TEXTURES, textureStyle } from "@/lib/textures";

/**
 * Logofolio: one brand per screen. Each screen is a snap stop (the same
 * data-scroll-snap mechanism as the homepage and About boards) holding one
 * 16:9 frame centred on the black page texture: the brand's logo, still,
 * which cuts into the brand's 3-second film once the screen arrives (see
 * LogofolioFilm). The frame is sized from the viewport height so it always
 * fits on one screen, never wider than the padded viewport.
 */
export function LogofolioCaseStudy({ category, nextProject }: { category?: Category; nextProject?: Project }) {
  return (
    <main data-scroll-snap className="bg-black text-off-white">
      <h1 className="sr-only">Logofolio</h1>
      {logofolioBrands.map((brand) => (
        <section
          key={brand.id}
          aria-label={brand.title}
          className="relative flex h-[100svh] w-full snap-start snap-always items-center justify-center px-6 py-md sm:px-10 lg:px-16"
          style={textureStyle(TEXTURES.black)}
        >
          {/* A 16:9 frame is 9/16 as tall as it is wide, so its width follows
              the height left inside the section's vertical padding. */}
          <div style={{ width: "min(100%, calc((100svh - 2 * var(--space-md)) * 16 / 9))" }}>
            <LogofolioFilm src={brand.film.src} poster={brand.film.poster} alt={brand.film.alt} />
          </div>
        </section>
      ))}

      {/* snap-end: the exit doors are shorter than a screen, so their end
          is the page's last reachable snap position. */}
      <div className="snap-end">
        <ProjectExitNav category={category} nextProject={nextProject} />
      </div>
    </main>
  );
}
