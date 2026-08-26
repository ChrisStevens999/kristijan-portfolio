import * as THREE from "three";

/**
 * Galvanized-steel material texture — a small tileable canvas (mottled
 * variation + fine grain + a few dirt streaks), repeated across the
 * cylinder via RepeatWrapping rather than stretched over the whole surface.
 * Deliberately near-neutral: the bright-centre/dark-side read comes from
 * REAL lighting hitting the curved geometry (see StickerScene's
 * directional lights), not a baked-in gradient — that's the whole point of
 * moving off the CSS version.
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

  // Base mid-silver.
  ctx.fillStyle = "#9aa0a8";
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);

  // Mottled galvanized blotches — soft, low-contrast, irregular.
  let seed = 17;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) % 1;
  };
  for (let i = 0; i < 90; i++) {
    const x = rand() * TILE_PX;
    const y = rand() * TILE_PX;
    const r = 14 + rand() * 46;
    const shade = 150 + rand() * 70;
    ctx.fillStyle = `rgba(${shade | 0},${(shade + 3) | 0},${(shade + 7) | 0},${(0.04 + rand() * 0.08).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine grain noise.
  const img = ctx.getImageData(0, 0, TILE_PX, TILE_PX);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 16;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  // Sparse dirt streaks.
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${(0.06 + rand() * 0.08).toFixed(3)})`;
    ctx.lineWidth = 1 + rand() * 2;
    const y = rand() * TILE_PX;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TILE_PX, y + (rand() - 0.5) * 30);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cached = texture;
  return texture;
}
