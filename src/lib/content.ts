import { categories } from "@/content/categories";
import { projects } from "@/content/projects";
import type { Category, Project } from "@/content/types";

export function getAllProjects(): Project[] {
  return [...projects].sort((a, b) => a.order - b.order);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

/** Curated homepage selection (04_CONTENT_ARCHITECTURE.md: quality over chronology). */
export function getSelectedWorks(): Project[] {
  return getAllProjects()
    .filter((project) => project.featured)
    .sort((a, b) => (a.featuredOrder ?? a.order) - (b.featuredOrder ?? b.order));
}

export function getAllCategories(): Category[] {
  return categories;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getProjectsByCategory(slug: string): Project[] {
  return getAllProjects().filter(
    (project) => project.category === slug && project.listedInCategory !== false,
  );
}

/**
 * The next project in the same category's listing, wrapping around at the
 * end — never a project from another chapter. Undefined when the project
 * has no listed sibling (it is its category's only project, or isn't
 * listed in its category at all).
 */
export function getNextProject(slug: string): Project | undefined {
  const project = getProjectBySlug(slug);
  if (!project) return undefined;
  const siblings = getProjectsByCategory(project.category);
  const index = siblings.findIndex((p) => p.slug === slug);
  if (index === -1 || siblings.length < 2) return undefined;
  return siblings[(index + 1) % siblings.length];
}
