import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Default only allows quality=75. Textures/photography use quality={95}
    // to keep fine grain intact — see src/components/sections/Intro.tsx.
    qualities: [75, 95],
  },
};

export default nextConfig;
