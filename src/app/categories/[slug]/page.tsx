import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { IllustrationCategoryPage } from "@/components/categories/IllustrationCategoryPage";
import { getAllCategories, getCategoryBySlug, getProjectsByCategory } from "@/lib/content";

export function generateStaticParams() {
  return getAllCategories().map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};
  // the projects it holds, in order, as its description
  const titles = getProjectsByCategory(slug).map((p) => p.categoryTitle ?? p.title);
  const description = titles.length
    ? `${category.title}: ${titles.length > 1 ? `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}` : titles[0]}.`
    : undefined;
  const image = typeof category.cover.src === "string" ? category.cover.src : category.cover.src.src;
  return {
    title: category.title,
    description,
    openGraph: { title: category.title, description, images: [{ url: image, alt: category.title }] },
  };
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

  // A chapter with one flagship project has no listing to stop at: its
  // tile opens the project directly, and so does this route.
  if (category.href) {
    redirect(category.href);
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
        {/* sized to the viewport on phones: a long word ("Exploration")
            must never be wider than the screen */}
        <h1 className="font-sans text-[clamp(1.8rem,9vw,3rem)] leading-none font-bold sm:text-7xl">{category.title}</h1>
      </div>
      <div className="flex flex-col">
        {categoryProjects.map((project, index) => (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            className="group relative flex h-[80vh] w-full items-end overflow-hidden sm:h-screen"
          >
            <Image
              src={project.cover.src}
              alt={project.cover.alt}
              fill
              sizes="100vw"
              quality={95}
              placeholder={typeof project.cover.src === "string" ? "empty" : "blur"}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative px-6 pb-16 sm:px-10 lg:px-16 lg:pb-20">
              <p className="font-accent text-xs tracking-[0.3em] text-off-white/70 uppercase">
                Project {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="font-sans mt-2 text-4xl font-bold sm:text-6xl">{project.title}</h2>
              {/* max-w-[28rem], not max-w-md: the theme's spacing token "md"
                  (2.5rem, globals.css) shadows Tailwind's container size of
                  that name, which wrapped this one word per line */}
              <p className="mt-3 max-w-[28rem] text-off-white/80">{project.summary}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
