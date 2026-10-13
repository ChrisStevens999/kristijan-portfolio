import type { MetadataRoute } from "next";

import { getAllCategories, getAllProjects } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/** Every page with content of its own — not the routes that only redirect. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/about"];
  for (const category of getAllCategories()) if (!category.href) pages.push(`/categories/${category.slug}`);
  for (const project of getAllProjects()) if (!project.href) pages.push(`/projects/${project.slug}`);
  return pages.map((path) => ({ url: `${SITE_URL}${path}` }));
}
