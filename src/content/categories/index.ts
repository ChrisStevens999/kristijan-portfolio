import { APPAREL_HERO_LAYERS } from "@/components/categories/apparelHeroLayers";
import type { Category } from "@/content/types";

import brandDirectionCover from "../../../assets/category covers/5 3.jpg";
import apparelDesignCover from "../../../assets/category covers/8 5.jpg";
import illustrationCover from "../../../assets/category covers/11.jpg";
import creativeExplorationCover from "../../../assets/category covers/7.jpg";

/**
 * One entry per creative discipline (03_DESIGN_SYSTEM.md: "chapter covers,
 * not thumbnails"). Covers are the real supplied artwork matched to the
 * approved Explore by Category mockup.
 */
export const categories: Category[] = [
  {
    slug: "brand-direction",
    title: "Brand Direction",
    description: "",
    cover: { src: brandDirectionCover, alt: "Brand Direction" },
    // Bypass removed — LXIX is now a second Brand Direction project, so the
    // category listing page is a real listing worth stopping at.
  },
  {
    slug: "apparel-design",
    title: "Apparel Design",
    description: "",
    cover: { src: apparelDesignCover, alt: "Apparel Design" },
    // Graphic T's is the chapter's only listed project, so the tile opens it
    // directly and its animated cover plays at once — no one-item listing
    // in between. Its three layers are fetched while the tile is on screen.
    href: "/projects/graphic-tees",
    preload: APPAREL_HERO_LAYERS,
  },
  {
    slug: "illustration",
    title: "Illustration",
    description: "",
    cover: { src: illustrationCover, alt: "Illustration" },
    // No href bypass: the category page now hosts real content (the Tag
    // Designs gallery) in addition to the Damaged Goods project listing.
  },
  {
    slug: "creative-exploration",
    title: "Creative Exploration",
    description: "",
    cover: { src: creativeExplorationCover, alt: "Creative Exploration" },
  },
];
