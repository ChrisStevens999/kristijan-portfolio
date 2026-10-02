import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { IllustrationCategoryPage } from "@/components/categories/IllustrationCategoryPage";
import { ExpandingCoverLink } from "@/components/ui/ExpandingCoverLink";
import { getAllCategories, getCategoryBySlug, getProjectsByCategory } from "@/lib/content";

export function generateStaticParams() {
  return getAllCategories().map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const categoryProjects = getProjectsByCategory(slug);

  // Illustration has its own designed look (see the reference board) —
  // every other category keeps this original minimal listing until its
  // own look is designed too.
  if (slug === "illustration") {
    return <IllustrationCategoryPage category={category} projects={categoryProjects} />;
  }

  // Minimal generic listing: large cover + short introduction per project,
  // linking into its full case study. The curated visual language (mockup-
  // matched grid, hover treatment) is designed properly in its own later
  // phase — this exists so every category route resolves to something real.
  return (
    <main className="flex min-h-screen flex-col bg-black text-off-white">
      <div className="px-6 pt-32 pb-16 sm:px-10 lg:px-16">
        <h1 className="font-sans text-5xl font-bold sm:text-7xl">{category.title}</h1>
      </div>
      <div className="flex flex-col">
        {categoryProjects.map((project, index) => (
          <ProjectCoverLink
            key={project.slug}
            slug={project.slug}
            className="group relative flex h-[80vh] w-full items-end overflow-hidden sm:h-screen"
          >
            <Image
              src={project.cover.src}
              alt={project.cover.alt}
              fill
              sizes="100vw"
              quality={95}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative px-6 pb-16 sm:px-10 lg:px-16 lg:pb-20">
              <p className="font-accent text-xs tracking-[0.3em] text-off-white/70 uppercase">
                Project {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="font-sans mt-2 text-4xl font-bold sm:text-6xl">{project.title}</h2>
              <p className="mt-3 max-w-md text-off-white/80">{project.summary}</p>
            </div>
          </ProjectCoverLink>
        ))}
      </div>
    </main>
  );
}

/**
 * Projects whose cover opens with a full-screen transition — the cover grows
 * to fill the screen, dips to black, and the project's own intro takes over —
 * instead of a plain link. Value: the full-resolution still for that frame.
 */
const EXPANDING_COVERS: Record<string, string> = {
  "graphic-tees": "/apparel/hero/cover.jpg",
};

function ProjectCoverLink({ slug, className, children }: { slug: string; className: string; children: ReactNode }) {
  const href = `/projects/${slug}`;
  const expandTo = EXPANDING_COVERS[slug];
  return expandTo ? (
    <ExpandingCoverLink href={href} image={expandTo} className={className}>
      {children}
    </ExpandingCoverLink>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
