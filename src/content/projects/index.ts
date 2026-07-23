import type { Project } from "@/content/types";

import project02Cover from "../../../assets/featured projects/2 Fav.png";
import project03Cover from "../../../assets/featured projects/3 Fav.png";
import hardcoreCover from "../../../assets/featured projects/4 Fav.png";
import boyzclubCover from "../../../assets/projects/boyzclub/BZC 1.png";
import damagedGoodsCover from "../../../assets/projects/damaged goods/4 5.png";
import tagDesignsCover from "../../../assets/projects/tag designs/hero/Venom.png";

/**
 * One entry per project. Titles/categories below are placeholders pending
 * confirmation — see chat for which fields are read directly off the
 * supplied artwork ("Dropin Skateboards", "Hardcore Mentality") versus
 * generic placeholders where no legible project name exists in the image
 * (02, 03). challenge/process/outcome are left empty: no project-page copy
 * has been supplied yet, and Selected Works cards don't display them.
 */
export const projects: Project[] = [
  {
    slug: "dropin-skateboards",
    title: "Dropin Skateboards",
    category: "apparel-design",
    summary: "Skateboard deck graphic and campaign photography.",
    // Bypasses next/image entirely — the optimizer's WebP re-encode was
    // introducing real block-compression artifacts in this image's dark
    // areas (confirmed: source is clean, blockRatio 1.0 vs 16.3 optimized).
    cover: {
      src: "/featured/1-fav.png",
      alt: "Dropin Skateboards campaign photograph",
    },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    featured: true,
    order: 1,
  },
  {
    slug: "project-02",
    title: "Untitled Project 02",
    category: "apparel-design",
    summary: "Apparel campaign photography.",
    cover: { src: project02Cover, alt: "Apparel campaign photograph" },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    featured: true,
    order: 2,
  },
  {
    slug: "project-03",
    title: "Untitled Project 03",
    category: "apparel-design",
    summary: "Eyewear campaign photography.",
    cover: { src: project03Cover, alt: "Eyewear campaign photograph" },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    featured: true,
    order: 3,
  },
  {
    slug: "hardcore-mentality",
    title: "Hardcore Mentality",
    category: "apparel-design",
    summary: "Apparel graphic design and campaign photography.",
    cover: { src: hardcoreCover, alt: "Hardcore Mentality campaign photograph" },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    featured: true,
    order: 4,
  },
  {
    slug: "boyzclub",
    title: "BoyzClub",
    category: "brand-direction",
    summary:
      "A complete streetwear identity developed across apparel, packaging, digital and campaign culture.",
    introduction: "Camouflage was created to conceal. BoyzClub uses it to be seen.",
    services: [
      "Creative Direction",
      "Brand Identity",
      "Apparel",
      "Packaging",
      "Website Design",
      "Campaign Direction",
    ],
    cover: { src: boyzclubCover, alt: "Camouflaged sports car with the BoyzClub wordmark" },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    // Not part of the curated homepage Selected Works — reachable via the
    // Brand Direction category listing and its own project page.
    featured: false,
    order: 5,
  },
  {
    slug: "damaged-goods",
    title: "Damaged Goods",
    category: "illustration",
    summary: "Illustration-Led Pop-Up Identity",
    introduction:
      "Damaged Goods is an illustration-led pop-up concept centered around mental wellbeing, self-love and human connection. Its visual language combines bold color, expressive artwork and imperfect textures to create memorable physical and digital experiences.",
    cover: { src: damagedGoodsCover, alt: "Damaged Goods branded skateboard deck" },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    // Not part of the curated homepage Selected Works — reachable via the
    // Illustration category listing and its own project page.
    featured: false,
    order: 6,
  },
  {
    slug: "tag-designs",
    title: "Tag Designs",
    category: "illustration",
    summary: "Original illustrations created for clothing tags.",
    cover: { src: tagDesignsCover, alt: "The Symbiote tag illustration" },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    // Not part of the curated homepage Selected Works — reachable via the
    // Illustration category listing and its own project page.
    featured: false,
    order: 7,
  },
];
