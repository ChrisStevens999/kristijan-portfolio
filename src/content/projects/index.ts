import type { Project } from "@/content/types";

import skateboardsThumbnail from "../../../assets/projects/skateboarding/hf_20260713_144648_eab4affd-b95c-405f-97cd-3f50bb56a7cd.png";
import neoTokyoCover from "../../../assets/featured projects/2 Fav.png";
import lxixFeaturedCover from "../../../assets/featured projects/3 Fav.png";
import hardcoreCover from "../../../assets/featured projects/4 Fav.png";
import boyzclubCover from "../../../assets/projects/boyzclub/BZC 1.png";
import boyzclubFeaturedCover from "../../../assets/featured projects/5 Fav.jpg";
import lxixCover from "../../../assets/projects/lxix/Cover Page.png";
import damagedGoodsCover from "../../../assets/projects/damaged goods/4 5.png";
import tagDesignsCover from "../../../assets/projects/tag designs/hero/Venom.png";
import tagDesignsThumbnail from "../../../assets/sub categories/DSC03342.jpg";
import stickerArchiveCover from "../../../assets/projects/Sticker Illustrations/Miami Vice Tiger C-Drip Sticker-Front.png";
import stickerArchiveThumbnail from "../../../assets/sub categories/Stickers Thumbnail.png";

/**
 * One entry per project. challenge/process/outcome are left empty: no
 * project-page copy has been supplied yet, and Selected Works cards don't
 * display them. The five homepage Selected Works are, in order: Drop In
 * Skateboards, Neo Tokyo, LXIX, Hardcore Mentality and BoyzClub.
 */
export const projects: Project[] = [
  {
    slug: "dropin-skateboards",
    title: "Drop In Skateboards",
    category: "illustration",
    summary: "Skateboard deck illustrations and campaign photography.",
    categoryTitle: "Skateboard Designs",
    // The samurai campaign photo: its deck sits dead centre, so a portrait
    // tile crop keeps the whole board in frame.
    categoryThumbnail: {
      src: skateboardsThumbnail,
      alt: "Figure holding the pink and blue samurai skateboard deck",
      desktopObjectPosition: "50% 50%",
      mobileObjectPosition: "50% 50%",
    },
    // Bypasses next/image entirely — the optimizer's WebP re-encode was
    // introducing real block-compression artifacts in this image's dark
    // areas (confirmed: source is clean, blockRatio 1.0 vs 16.3 optimized).
    cover: {
      src: "/featured/1-fav.png",
      alt: "Drop In Skateboards campaign photograph",
    },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    featured: true,
    order: 1,
  },
  {
    slug: "neo-tokyo",
    title: "Neo Tokyo",
    category: "apparel-design",
    summary: "Apparel campaign photography.",
    cover: { src: neoTokyoCover, alt: "Neo Tokyo — a model in a pink printed shirt among shipping containers" },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    featured: true,
    // Homepage Selected Works only — the Apparel listing shows just Graphic T's.
    listedInCategory: false,
    order: 2,
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
    // Homepage Selected Works only — the Apparel listing shows just Graphic T's.
    listedInCategory: false,
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
    // Homepage Selected Works shows the BoyzClub cover art instead.
    featuredCover: { src: boyzclubFeaturedCover, alt: "BoyzClub — a figure in a blue balaclava over a grainy crowd" },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    // Fifth of the homepage Selected Works, and in the Brand Direction listing.
    featured: true,
    order: 5,
  },
  {
    slug: "lxix",
    title: "LXIX",
    category: "brand-direction",
    summary:
      "A luxury champagne identity where aristocracy collides with the attitude of rebellion.",
    introduction:
      "LXIX is a luxury champagne brand where aristocracy collides with the attitude of rebellion — rooted in art, rebellion, and provocative storytelling.",
    services: [
      "Creative Direction",
      "Brand Identity",
      "Packaging",
      "Icon & Symbol Design",
      "Campaign Direction",
    ],
    cover: { src: lxixCover, alt: "A champagne bottle held to a model's lips, LXIX wordmark below" },
    // Homepage Selected Works shows the LXIX sunglasses campaign shot instead.
    featuredCover: { src: lxixFeaturedCover, alt: "LXIX — a model in sunglasses" },
    featuredOrder: 3,
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    // Third of the homepage Selected Works (see featuredCover/featuredOrder),
    // and the second Brand Direction project in that category's listing.
    featured: true,
    order: 6,
  },
  {
    slug: "damaged-goods",
    title: "Damaged Goods",
    category: "illustration",
    summary: "Pop-up apparel design project.",
    introduction:
      "Damaged Goods is an illustration-led pop-up concept centered around mental wellbeing, self-love and human connection. Its visual language combines bold color, expressive artwork and imperfect textures to create memorable physical and digital experiences.",
    cover: { src: damagedGoodsCover, alt: "Damaged Goods branded skateboard deck" },
    // Same source photo as `cover`, cropped tighter to a portrait grid tile
    // — the category page needs a much taller crop than the wide hero shot.
    categoryThumbnail: {
      src: damagedGoodsCover,
      alt: "Damaged Goods branded skateboard deck, cropped portrait",
      desktopObjectPosition: "50% 15%",
      mobileObjectPosition: "50% 15%",
    },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    // Not part of the curated homepage Selected Works — reachable via the
    // Illustration category listing and its own project page.
    featured: false,
    order: 7,
  },
  {
    slug: "tag-designs",
    title: "Tag Designs",
    category: "illustration",
    categoryTitle: "Tag Design Illustrations",
    summary: "Apparel tag design illustration.",
    cover: { src: tagDesignsCover, alt: "The Symbiote tag illustration" },
    categoryThumbnail: {
      src: tagDesignsThumbnail,
      alt: "A pistol and game controller on a camo-print WARRIOR jacket, lit in red",
      desktopObjectPosition: "60% 50%",
      mobileObjectPosition: "60% 50%",
    },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    // Not part of the curated homepage Selected Works — reachable via the
    // Illustration category listing and its own project page.
    featured: false,
    order: 8,
  },
  {
    slug: "sticker-archive",
    title: "Sticker Archive",
    category: "illustration",
    categoryTitle: "Sticker Illustrations",
    summary: "Sticker illustrations done over the years.",
    introduction:
      "Selected graphic work presented as a rotating, sticker-covered street object.",
    cover: { src: stickerArchiveCover, alt: "Miami Vice tiger sticker" },
    categoryThumbnail: {
      src: stickerArchiveThumbnail,
      alt: "A cluster of die-cut sticker designs on black",
    },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    // Phase 1 interactive prototype — reachable at /projects/sticker-archive
    // and via the Illustration category listing.
    featured: false,
    order: 9,
  },
  {
    slug: "graphic-tees",
    title: "Graphic T's",
    category: "apparel-design",
    categoryTitle: "Graphic T's",
    summary: "Graphic T-shirt designs: illustration, photobashing and collage.",
    // Still of the animated APPAREL angel cover — on the Apparel listing it
    // expands full screen into the animated intro, then the project page.
    cover: { src: "/apparel/hero/cover.jpg", alt: "A red-lit angel statue rising in front of the word APPAREL" },
    gallery: [],
    challenge: "",
    process: "",
    outcome: "",
    featured: false,
    order: 10,
  },
];
