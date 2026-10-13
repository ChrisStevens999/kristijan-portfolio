/**
 * Site-wide identity for metadata, the sitemap and robots. The page titles
 * read "<page> | Kristijan Stevkovski"; on-screen the designer signs as
 * Chris Stevens (see 10_DECISION_LOG.md).
 */
export const SITE_NAME = "Kristijan Stevkovski";

export const SITE_DESCRIPTION =
  "A curated exhibition of brand direction, apparel design, illustration and creative concepts.";

/**
 * The site's own address, for absolute URLs (sitemap, robots, social
 * previews): NEXT_PUBLIC_SITE_URL when set (e.g. a custom domain), else the
 * Vercel production domain, else local development.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
