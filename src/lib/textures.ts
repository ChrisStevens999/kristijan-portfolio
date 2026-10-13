import type { CSSProperties } from "react";

/**
 * The supplied background textures (11_VISUAL_ASSETS.md): the site's
 * surfaces, never replaced by flat fills or CSS effects. Shipped as WebP
 * (public/textures, built from the supplied PNGs by
 * scripts/build-textures.mjs) — the PNGs were 8 MB between them.
 */
export const TEXTURES = {
  /** default surface: intro black frames, section titles, About, Logofolio */
  black: "/textures/black-page.webp",
  /** accent surface, used only where the design switches to red */
  red: "/textures/red-page.webp",
  /** the Explore by Category chapter */
  textured: "/textures/textured-page.webp",
} as const;

/**
 * A texture as a full-bleed background: cover fit, centred, no repeat. Cover
 * rather than a tiled repeat: the textures are single large plates, and a
 * repeat tile would show a seam on screens bigger than one tile.
 */
export function textureStyle(url: string): CSSProperties {
  return {
    backgroundImage: `url('${url}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}
