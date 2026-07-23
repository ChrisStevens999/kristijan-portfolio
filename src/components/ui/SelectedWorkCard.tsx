"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import type { Project } from "@/content/types";

/**
 * 05_COMPONENT_LIBRARY.md "SELECTED WORK CARD": large imagery, entire card
 * clickable, hover subtle, image remains the hero.
 *
 * This section presents work rather than describing it — no title,
 * category or metadata is rendered here by design. The image itself is
 * the only content; clicking it opens the project page.
 */
export function SelectedWorkCard({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative block h-screen w-full overflow-hidden"
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {typeof project.cover.src === "string" ? (
          // eslint-disable-next-line @next/next/no-img-element -- deliberate next/image bypass, see content/projects
          <img
            src={project.cover.src}
            alt={project.cover.alt}
            loading={index === 0 ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <Image
            src={project.cover.src}
            alt={project.cover.alt}
            fill
            sizes="100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            priority={index === 0}
          />
        )}
      </motion.div>
    </Link>
  );
}
