/**
 * Builds a URL through Next.js's own image optimizer, for cases where an
 * image is consumed as a raw `new Image()` / canvas source rather than
 * through the `<Image>` component — so Next's automatic optimization never
 * kicks in and `img.src = someStaticImport.src` fetches the ORIGINAL,
 * full-resolution source file every time. For camera-resolution product
 * photography that can be 10–25MB EACH.
 *
 * Confirmed via live network profiling on the deployed Sticker Archive:
 * the sticker-atlas canvas (useStickerAtlasTexture.ts) was pulling down
 * ~165MB of unoptimized PNGs on every single visit — several seconds of
 * blank metal before any sticker art appeared, the actual cause of the
 * section reading as "laggy". Routing the same sources through this
 * function instead (used by useStickerAtlasTexture.ts,
 * useSingleStickerTexture.ts, and metalTexture.ts's two photo-detail
 * layers) cuts that to a small fraction — these are canvas-texture inputs
 * that get scaled down into a shared atlas/tile far smaller than the
 * source photography anyway, so there was never a quality reason to fetch
 * the originals at full resolution.
 *
 * `width` must be one of Next's configured imageSizes/deviceSizes —
 * next.config.ts has no override, so the framework defaults apply: 16,
 * 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
 * 3840. `quality` must be one of next.config.ts's `images.qualities`
 * (75 or 95 here). Either mismatch gets a 400 from the optimizer endpoint.
 */
export function optimizedImageUrl(src: string, width: number, quality: 75 | 95 = 75): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
