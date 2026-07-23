import Image from "next/image";
import Link from "next/link";

import type { Category, Project } from "@/content/types";

type NextProjectNavProps =
  | { mode?: "next"; project: Project }
  | { mode: "back-to-category"; category: Category };

/**
 * 05_COMPONENT_LIBRARY.md's Project Page structure ends with a project-exit
 * navigation. Two modes share one visual component rather than each case
 * study inventing its own: "next" (forward, to the next project in global
 * order — BoyzClub) and "back-to-category" (backward, to the project's own
 * category listing — Damaged Goods, used when there's no sibling project in
 * the same category yet to link forward to).
 */
export function NextProjectNav(props: NextProjectNavProps) {
  if (props.mode === "back-to-category") {
    const { category } = props;
    return (
      <Link
        // Always the real category route, never category.href — that field
        // exists to let the homepage tile skip the listing page, which would
        // make this exit link point right back at the project it's on.
        href={`/categories/${category.slug}`}
        className="group relative flex h-[60vh] w-full items-center justify-center overflow-hidden"
      >
        <Image
          src={category.cover.src}
          alt=""
          fill
          sizes="100vw"
          quality={95}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative text-center">
          <p className="font-accent text-sm tracking-[0.3em] text-off-white uppercase">
            Back to Category
          </p>
          <h3 className="font-sans mt-3 text-4xl text-off-white uppercase sm:text-6xl">
            ← {category.title}
          </h3>
        </div>
      </Link>
    );
  }

  const { project } = props;
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative flex h-[60vh] w-full items-center justify-center overflow-hidden"
    >
      <Image
        src={project.cover.src}
        alt=""
        fill
        sizes="100vw"
        quality={95}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative text-center">
        <p className="font-accent text-sm tracking-[0.3em] text-off-white uppercase">
          Next Project
        </p>
        <h3 className="font-sans mt-3 text-4xl text-off-white sm:text-6xl">
          {project.title}
        </h3>
      </div>
    </Link>
  );
}
