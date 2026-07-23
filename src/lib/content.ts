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
  return getAllProjects().filter((project) => project.featured);
}

export function getAllCategories(): Category[] {
  return categories;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getProjectsByCategory(slug: string): Project[] {
  return getAllProjects().filter((project) => project.category === slug);
}

/** Next project in the full ordered list, wrapping around at the end. */
export function getNextProject(slug: string): Project | undefined {
  const all = getAllProjects();
  const index = all.findIndex((project) => project.slug === slug);
  if (index === -1) return undefined;
  return all[(index + 1) % all.length];
}
