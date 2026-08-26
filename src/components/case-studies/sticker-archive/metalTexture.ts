import * as THREE from "three";

/**
 * Galvanized-steel material texture — a small tileable canvas, repeated
 * across the cylinder via RepeatWrapping rather than stretched over the
 * whole surface. Deliberately near-neutral overall: the bright-centre/
 * dark-side read comes from REAL lighting hitting the curved geometry (see
 * StickerScene's directional lights), not a baked-in gradient.
 *
 * Two earlier versions of this texture missed the actual visual signature
 * of galvanized steel: hot-dip galvanizing solidifies into a "spangle" —
 * small, irregular, fairly SHARP-edged crystalline cells of slightly
 * different brightness, not a soft cloudy gradient (that read as concrete/
 * large tiles) and not pure fine grain alone (that read as flat/smooth
 * "CGI grey", too clean). This version draws an actual cell pattern (cheap
 * nearest-seed fill over a coarse block grid — a Voronoi approximation,
 * not per-pixel) sized small enough that it never reads as a repeating
 * tile, then layers fine grain + tiny speckle + sparse wear on top.
 *
 * Built once and cached at module scope (not per-mount) — it never changes.
 */
let cached: THREE.CanvasTexture | null = null;

const TILE_PX = 768;
/** World-unit size one tile covers — tuned so the spangle cells read as fine industrial texture, not blown-up tiles. */
export const METAL_TILE_WORLD_SIZE = 1.35;

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
  // fill a coarse block grid by nearest seed. Small block size (6px) keeps
  // cell edges crisp without per-pixel cost.
  const SEED_COUNT = 220;
  const seeds: { x: number; y: number; shade: number }[] = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    seeds.push({
      x: rand() * TILE_PX,
      y: rand() * TILE_PX,
      shade: (rand() - 0.5) * 26, // +/-13 brightness per cell
    });
  }
  const BLOCK = 6;
  const spangle = ctx.createImageData(TILE_PX, TILE_PX);
  for (let by = 0; by < TILE_PX; by += BLOCK) {
    for (let bx = 0; bx < TILE_PX; bx += BLOCK) {
      let best = -1;
      let bestDist = Infinity;
      for (let s = 0; s < seeds.length; s++) {
        const dx = seeds[s].x - (bx + BLOCK / 2);
        const dy = seeds[s].y - (by + BLOCK / 2);
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
    const add = spangle.data[i] * 0.65;
    base.data[i] = Math.min(255, Math.max(0, base.data[i] + add));
    base.data[i + 1] = Math.min(255, Math.max(0, base.data[i + 1] + add));
    base.data[i + 2] = Math.min(255, Math.max(0, base.data[i + 2] + add));
  }
  ctx.putImageData(base, 0, 0);

  // Faint cell-boundary definition — real spangle has a barely-visible seam
  // between crystals. Cheap approximation: redraw the same nearest-seed
  // pass but only where the second-nearest seed is nearly as close (i.e.
  // near a cell boundary), darkening slightly.
  ctx.globalAlpha = 1;
  const boundary = ctx.getImageData(0, 0, TILE_PX, TILE_PX);
  for (let by = 0; by < TILE_PX; by += BLOCK) {
    for (let bx = 0; bx < TILE_PX; bx += BLOCK) {
      let best = Infinity;
      let second = Infinity;
      for (let s = 0; s < seeds.length; s++) {
        const dx = seeds[s].x - (bx + BLOCK / 2);
        const dy = seeds[s].y - (by + BLOCK / 2);
        const d = dx * dx + dy * dy;
        if (d < best) {
          second = best;
          best = d;
        } else if (d < second) {
          second = d;
        }
      }
      if (second - best < 900) {
        for (let y = by; y < Math.min(by + BLOCK, TILE_PX); y++) {
          for (let x = bx; x < Math.min(bx + BLOCK, TILE_PX); x++) {
            const idx = (y * TILE_PX + x) * 4;
            boundary.data[idx] *= 0.94;
            boundary.data[idx + 1] *= 0.94;
            boundary.data[idx + 2] *= 0.94;
          }
        }
      }
    }
  }
  ctx.putImageData(boundary, 0, 0);

  // Tiny irregular fleck speckle on top — small enough (1–5px) to read as
  // grain, not pattern.
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

  // Fine grain noise over everything.
  const img = ctx.getImageData(0, 0, TILE_PX, TILE_PX);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  // Sparse, faint dirt/wear streaks — mild, not dramatic scratches.
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${(0.03 + rand() * 0.05).toFixed(3)})`;
    ctx.lineWidth = 1 + rand();
    const y = rand() * TILE_PX;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TILE_PX, y + (rand() - 0.5) * 24);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cached = texture;
  return texture;
}
