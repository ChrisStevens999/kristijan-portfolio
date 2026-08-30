import Image from "next/image";
import Link from "next/link";

import type { Category, Project } from "@/content/types";

/**
 * "PROJECTS" grid look for the Illustration category listing, matching the
 * supplied reference exactly: off-white ground, black type, red accents
 * (the site's existing 3-color system) — a big black category heading
 * top-left, a small red personal mark top-right, then one portrait tile per
 * project (red "Project N" kicker, bold black title, bold black two-line
 * summary underneath).
 *
 * Illustration-only for now — the other categories keep the original
 * minimal listing (see [slug]/page.tsx) until their own look is designed.
 * If/when more categories get this same treatment, promote this back to a
 * generic component (it already takes `category`/`projects` as props, not
 * anything Illustration-specific) rather than duplicating it.
 */
export function IllustrationCategoryPage({
  category,
  projects,
}: {
  category: Category;
  projects: Project[];
}) {
  return (
    <main className="flex min-h-screen flex-col bg-off-white text-black">
      <div className="flex items-start justify-between gap-6 px-6 pt-32 pb-16 sm:px-10 lg:px-16">
        <h1 className="font-sans text-4xl leading-none font-bold uppercase sm:text-6xl lg:text-7xl">
          {category.title} Projects
        </h1>
        <Link
          href="/"
          className="font-sans text-red shrink-0 text-right text-xs leading-tight font-bold uppercase sm:text-sm"
        >
          Chris
          <br />
          Stevens
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-16 px-6 pb-24 sm:grid-cols-2 sm:px-10 lg:grid-cols-3 lg:px-16">
        {projects.map((project, index) => {
          const thumbnail = project.categoryThumbnail ?? project.cover;
          const desktopPosition = project.categoryThumbnail?.desktopObjectPosition ?? "50% 50%";
          const mobilePosition = project.categoryThumbnail?.mobileObjectPosition ?? desktopPosition;

          return (
            <Link key={project.slug} href={`/projects/${project.slug}`} className="group flex flex-col">
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                {/* Two stacked images (shown/hidden by breakpoint), same
                    reasoning as PanelSequence — object-position comes from
                    content data, which Tailwind can't turn into a static
                    utility class. */}
                <Image
                  src={thumbnail.src}
                  alt={thumbnail.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  quality={95}
                  style={{ objectPosition: mobilePosition }}
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] sm:hidden"
                />
                <Image
                  src={thumbnail.src}
                  alt={thumbnail.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  quality={95}
                  style={{ objectPosition: desktopPosition }}
                  className="hidden object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] sm:block"
                />
              </div>
              <p className="font-accent text-red mt-6 text-sm font-bold uppercase">
                Project {index + 1}
              </p>
              <h2 className="font-sans mt-1 text-xl font-bold uppercase sm:text-2xl">
                {project.categoryTitle ?? project.title}
              </h2>
              <p className="font-sans mt-2 max-w-[22ch] text-sm font-bold uppercase sm:text-base">
                {project.summary}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
