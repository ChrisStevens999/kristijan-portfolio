import * as THREE from "three";

/**
 * Galvanized-steel material texture — a small tileable canvas, repeated
 * across the cylinder via RepeatWrapping rather than stretched over the
 * whole surface. Deliberately near-neutral overall: the bright-centre/
 * dark-side read comes from REAL lighting hitting the curved geometry (see
 * StickerScene's directional lights), not a baked-in gradient.
 *
 * Earlier versions of this texture missed two things: the actual visual
 * signature of galvanized steel (hot-dip galvanizing solidifies into a
 * "spangle" — small, irregular, fairly SHARP-edged crystalline cells of
 * slightly different brightness, not a soft cloudy gradient and not pure
 * fine grain alone), and genuine seamlessness — the spangle cells were
 * generated as an ordinary (non-wrapping) nearest-seed fill, so every tile
 * repeat showed a visible boundary as the cylinder rotated, and a prior
 * pass's added vertical micro-streaking made the whole surface read as
 * brushed stainless rather than irregular galvanized steel.
 *
 * This version fixes both: the nearest-seed search wraps distances toroidally
 * (see `wrapDelta`) so the cell pattern tiles with NO seam in either
 * direction, and the vertical streak layer is removed entirely in favour of
 * non-directional fine grain + speckle.
 *
 * Built once and cached at module scope (not per-mount) — it never changes.
 */
let cached: THREE.CanvasTexture | null = null;

const TILE_PX = 768;
/** World-unit size one tile covers — small enough that the spangle cells read as fine industrial grain, not blown-up tiles. */
export const METAL_TILE_WORLD_SIZE = 0.85;

/** Shortest signed distance from a to b on a size-periodic line — makes the nearest-seed search below toroidal (seamless on tile repeat) instead of flat. */
function wrapDelta(d: number, size: number): number {
  if (d > size / 2) return d - size;
  if (d < -size / 2) return d + size;
  return d;
}

export function getMetalTexture(): THREE.CanvasTexture {
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = TILE_PX;
  canvas.height = TILE_PX;
  const ctx = canvas.getContext("2d")!;

  let seed = 17;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) % 1;
  };

  // Bright galvanized silver base.
  ctx.fillStyle = "#adb3bb";
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);

  // --- Spangle: scatter seed points, each with its own slight brightness,
  // fill a coarse block grid by nearest seed (toroidal distance, so the
  // cell pattern wraps with no seam). Small block size (5px) keeps cell
  // edges crisp without per-pixel cost.
  const SEED_COUNT = 350;
  const seeds: { x: number; y: number; shade: number }[] = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    seeds.push({
      x: rand() * TILE_PX,
      y: rand() * TILE_PX,
      shade: (rand() - 0.5) * 30, // +/-15 brightness per cell
    });
  }
  const BLOCK = 5;
  const spangle = ctx.createImageData(TILE_PX, TILE_PX);
  for (let by = 0; by < TILE_PX; by += BLOCK) {
    for (let bx = 0; bx < TILE_PX; bx += BLOCK) {
      const qx = bx + BLOCK / 2;
      const qy = by + BLOCK / 2;
      let best = -1;
      let bestDist = Infinity;
      for (let s = 0; s < seeds.length; s++) {
        const dx = wrapDelta(seeds[s].x - qx, TILE_PX);
        const dy = wrapDelta(seeds[s].y - qy, TILE_PX);
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = s;
        }
      }
      const shade = seeds[best].shade;
      for (let y = by; y < Math.min(by + BLOCK, TILE_PX); y++) {
        for (let x = bx; x < Math.min(bx + BLOCK, TILE_PX); x++) {
          const idx = (y * TILE_PX + x) * 4;
          spangle.data[idx] = shade;
          spangle.data[idx + 1] = shade;
          spangle.data[idx + 2] = shade;
          spangle.data[idx + 3] = 255;
        }
      }
    }
  }
  // Composite the spangle shading onto the base as a soft-light-ish overlay
  // (additive at reduced strength) rather than a hard replace.
  const base = ctx.getImageData(0, 0, TILE_PX, TILE_PX);
  for (let i = 0; i < base.data.length; i += 4) {
    const add = spangle.data[i] * 0.75;
    base.data[i] = Math.min(255, Math.max(0, base.data[i] + add));
    base.data[i + 1] = Math.min(255, Math.max(0, base.data[i + 1] + add));
    base.data[i + 2] = Math.min(255, Math.max(0, base.data[i + 2] + add));
  }
  ctx.putImageData(base, 0, 0);

  // Faint cell-boundary definition — real spangle has a barely-visible seam
  // between crystals. Cheap approximation: redraw the same toroidal
  // nearest-seed pass but only where the second-nearest seed is nearly as
  // close (i.e. near a cell boundary), darkening slightly.
  const boundary = ctx.getImageData(0, 0, TILE_PX, TILE_PX);
  for (let by = 0; by < TILE_PX; by += BLOCK) {
    for (let bx = 0; bx < TILE_PX; bx += BLOCK) {
      const qx = bx + BLOCK / 2;
      const qy = by + BLOCK / 2;
      let best = Infinity;
      let second = Infinity;
      for (let s = 0; s < seeds.length; s++) {
        const dx = wrapDelta(seeds[s].x - qx, TILE_PX);
        const dy = wrapDelta(seeds[s].y - qy, TILE_PX);
        const d = dx * dx + dy * dy;
        if (d < best) {
          second = best;
          best = d;
        } else if (d < second) {
          second = d;
        }
      }
      if (second - best < 700) {
        for (let y = by; y < Math.min(by + BLOCK, TILE_PX); y++) {
          for (let x = bx; x < Math.min(bx + BLOCK, TILE_PX); x++) {
            const idx = (y * TILE_PX + x) * 4;
            boundary.data[idx] *= 0.91;
            boundary.data[idx + 1] *= 0.91;
            boundary.data[idx + 2] *= 0.91;
          }
        }
      }
    }
  }
  ctx.putImageData(boundary, 0, 0);

  // Tiny irregular fleck speckle on top — small enough (1–5px) to read as
  // grain, not pattern. Per-pixel/local scale, so already seamless on
  // tile repeat without any special wrapping treatment.
  for (let i = 0; i < 1400; i++) {
    const x = rand() * TILE_PX;
    const y = rand() * TILE_PX;
    const r = 1 + rand() * 4;
    const dark = rand() < 0.55;
    const shade = dark ? 0 : 255;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${(0.05 + rand() * 0.08).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine grain noise over everything — independent per-pixel, so it reads
  // as texture rather than a directional pattern and is inherently seamless.
  const img = ctx.getImageData(0, 0, TILE_PX, TILE_PX);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cached = texture;
  return texture;
}
