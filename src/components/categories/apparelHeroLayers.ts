/**
 * The three image layers of the animated Apparel cover (see ApparelHero).
 * In a plain module (no "use client") so server components can pass the
 * list along as a preload hint.
 */
export const APPAREL_HERO_SRC = "/apparel/hero/";
export const APPAREL_HERO_LAYERS = [
  `${APPAREL_HERO_SRC}bg.jpg`,
  `${APPAREL_HERO_SRC}text.webp`,
  `${APPAREL_HERO_SRC}angel.webp`,
];
