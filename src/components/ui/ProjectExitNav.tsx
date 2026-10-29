import Image from "next/image";
import Link from "next/link";

import type { Category, ImageAsset, Project } from "@/content/types";

/**
 * 05_COMPONENT_LIBRARY.md's Project Page structure ends with the exit
 * navigation: two doors side by side at the very bottom of every project.
 * Left, back to the project's own category listing; right, forward to the
 * next project in that same category (wrapping at the end). One visual component
 * shared by every case study rather than each inventing its own. On a
 * phone the two stack, back first.
 *
 * A project that IS its category (the category's tile bypasses its listing
 * — category.href — because this is its only project) gets one door
 * instead, full width: back to the homepage's chapters. There is no
 * listing to return to and no sibling to go on to. A project with a
 * listing but no sibling likewise gets just the back door, full width.
 */
export function ProjectExitNav({
  category,
  nextProject,
}: {
  category?: Category;
  nextProject?: Project;
}) {
  if (!category && !nextProject) return null;

  if (category?.href) {
    return (
      <nav aria-label="Project exit">
        <ExitDoor
          href="/#explore-by-category"
          image={category.cover}
          kicker={category.title}
          title="← Back to Categories"
          uppercase
        />
      </nav>
    );
  }

  return (
    <nav
      aria-label="Project exit"
      className={category && nextProject ? "grid grid-cols-1 sm:grid-cols-2" : undefined}
    >
      {category ? (
        <ExitDoor
          href={`/categories/${category.slug}`}
          image={category.cover}
          kicker="Back to Category"
          title={`← ${category.title}`}
          uppercase
        />
      ) : null}
      {nextProject ? (
        <ExitDoor
          href={`/projects/${nextProject.slug}`}
          image={nextProject.cover}
          kicker="Next Project"
          title={`${nextProject.title} →`}
        />
      ) : null}
    </nav>
  );
}

function ExitDoor({
  href,
  image,
  kicker,
  title,
  uppercase = false,
}: {
  href: string;
  image: ImageAsset;
  kicker: string;
  title: string;
  uppercase?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative flex h-[45vh] w-full items-center justify-center overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-white focus-visible:outline-solid sm:h-[60vh]"
    >
      <Image
        src={image.src}
        alt=""
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        // a thumbnail: default quality, blurred preview while it loads
        placeholder={typeof image.src === "string" ? "empty" : "blur"}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative px-6 text-center">
        <p className="font-accent text-sm tracking-[0.3em] text-off-white uppercase">{kicker}</p>
        <h2 className={`font-sans mt-3 text-3xl text-off-white sm:text-5xl${uppercase ? " uppercase" : ""}`}>
          {title}
        </h2>
      </div>
    </Link>
  );
}
