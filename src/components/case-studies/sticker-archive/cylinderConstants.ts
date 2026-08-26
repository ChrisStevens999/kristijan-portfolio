/**
 * Shared cylinder-geometry constants. The actual per-slice math (x =
 * radius·sin(angle), depth = cos(angle), physical occlusion, etc.) lives in
 * StickerSurfaceItem's imperative update loop, not a reactive `useTransform`
 * hook here — see that file's doc comment for why (a chained-`useTransform`
 * version of this, once per slice × up to 250 mounted slices, was a
 * measured multi-second scroll-lag performance cliff).
 */

// Half-width of the opacity transition band, centred on depth=0 (the true
// geometric edge of the visible hemisphere) — deliberately narrow, so a
// slice disappears because it has physically rotated behind the cylinder,
// not because of a wide cosmetic fade that starts well before the edge.
export const OCCLUSION_EDGE = 0.09;

// Only slices facing this much toward the viewer accept hover/click.
export const INTERACT_ABOVE = 0.55;
