/**
 * Tight bounding box of an image's non-transparent pixels, in the image's
 * own natural pixel coordinates. Shared by useStickerAtlasTexture (sizing
 * against real artwork bounds, not the padded PNG canvas) and
 * useSingleStickerTexture (same reasoning, for the individually-rendered
 * slap-animation stickers). One-time per-sticker cost — drawing to an
 * offscreen canvas and scanning alpha is the only way to know this; it
 * isn't in the PNG's own metadata.
 */
export function getAlphaBBox(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  const ALPHA_THRESHOLD = 10;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    const rowBase = y * w;
    for (let x = 0; x < w; x++) {
      const a = data[(rowBase + x) * 4 + 3];
      if (a > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fully-transparent image (shouldn't happen for real sticker art) — fall
  // back to the full canvas rather than a degenerate zero-size box.
  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, w, h };
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
