import type { NextConfig } from "next";

/** public/ folders holding films, 3D models, prints and plates */
const MEDIA = ["about", "apparel", "boyzclub", "featured", "lab", "lxix", "mono", "rc", "skateboarding", "tag-designs-hero", "textures", "warrior", "cursor"];

const nextConfig: NextConfig = {
  images: {
    // Default only allows quality=75. Textures/photography use quality={95}
    // to keep fine grain intact — see src/components/sections/Intro.tsx.
    qualities: [75, 95],
  },
  // A day fresh, then a week served from cache while it revalidates: a
  // returning visitor doesn't re-check every film and model on each visit.
  // Not "immutable" — files keep their names when they're rebuilt.
  async headers() {
    return MEDIA.map((dir) => ({
      source: `/${dir}/:path*`,
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
    }));
  },
  async redirects() {
    return [
      // the Cyclops Sculpture left the lab for Creative Exploration
      { source: "/lab/statue", destination: "/projects/cyclops-sculpture", permanent: true },
    ];
  },
};

export default nextConfig;
