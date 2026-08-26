import * as THREE from "three";

/**
 * Galvanized-steel material texture — a small tileable canvas, repeated
 * across the cylinder via RepeatWrapping rather than stretched over the
 * whole surface. Deliberately near-neutral: the bright-centre/dark-side
 * read comes from REAL lighting hitting the curved geometry (see
 * StickerScene's directional lights), not a baked-in gradient.
 *
 * Kept FINE-grained on purpose — an earlier version of this texture had
 * large low-frequency blotches (70–200px on a 512px tile) that, once tiled
 * up the whole pole, read as an obvious repeating tile/concrete pattern
 * instead of a continuous metal surface. Variation here is all small-scale:
 * fine noise grain + tiny irregular speckle, nothing bigger than a few
 * pixels at this tile's resolution.
 *
 * Built once and cached at module scope (not per-mount) — it never changes.
 */
let cached: THREE.CanvasTexture | null = null;

const TILE_PX = 512;
/** World-unit size one tile covers — tuned so grain reads as fine, not blown up. */
export const METAL_TILE_WORLD_SIZE = 1.1;

export function getMetalTexture(): THREE.CanvasTexture {
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = TILE_PX;
  canvas.height = TILE_PX;
  const ctx = canvas.getContext("2d")!;

  // Bright galvanized silver base — brighter than the old mid-grey so the
  // lit centre can read as genuinely bright, not just "less dark".
  ctx.fillStyle = "#aeb4bc";
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);

  let seed = 17;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) % 1;
  };

  // Tiny irregular speckle — small enough (2–9px) that repeating the tile
  // never reads as a pattern, just texture.
  for (let i = 0; i < 900; i++) {
    const x = rand() * TILE_PX;
    const y = rand() * TILE_PX;
    const r = 2 + rand() * 7;
    const shade = 150 + rand() * 90;
    ctx.fillStyle = `rgba(${shade | 0},${(shade + 3) | 0},${(shade + 7) | 0},${(0.05 + rand() * 0.09).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine grain noise over the top.
  const img = ctx.getImageData(0, 0, TILE_PX, TILE_PX);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 16;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  // Very sparse, very faint wear streaks — mild, not dramatic scratches.
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${(0.03 + rand() * 0.04).toFixed(3)})`;
    ctx.lineWidth = 1;
    const y = rand() * TILE_PX;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TILE_PX, y + (rand() - 0.5) * 20);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cached = texture;
  return texture;
}
