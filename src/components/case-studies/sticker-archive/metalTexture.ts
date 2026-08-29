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
 * non-directional fine grain + speckle. A later revision shrank the cells
 * further (more seeds, smaller world tile size) and softened the
 * cell-boundary contrast — at the previous scale the pattern was still
 * fine enough to be non-repeating but coarse enough for the eye to track
 * as the cylinder turned, which read as a faint directional "streak".
 *
 * A further revision layers in two real photographed metal textures
 * (public/textures/metal-scratches.jpg, metal-zinc.jpg) as subtle detail —
 * see `applyPhotoDetailLayers` below for how they're processed so they
 * don't fight the procedural base or the real lighting.
 *
 * Built once and cached at module scope (not per-mount) — it never changes.
 */
let cached: THREE.CanvasTexture | null = null;

const TILE_PX = 768;
/** World-unit size one tile covers — shrunk again this pass (was 0.85) so the spangle cells read as genuinely fine mottling rather than a pattern the eye can track as the cylinder turns. */
export const METAL_TILE_WORLD_SIZE = 0.6;

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
  const SEED_COUNT = 480;
  const seeds: { x: number; y: number; shade: number }[] = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    seeds.push({
      x: rand() * TILE_PX,
      y: rand() * TILE_PX,
      shade: (rand() - 0.5) * 26, // +/-13 brightness per cell — slightly gentler than before
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
      if (second - best < 500) {
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
  // MirroredRepeatWrapping rather than plain RepeatWrapping: every other
  // tile is flipped, so the pixels AT the boundary between two tiles are
  // always identical by construction — a guaranteed seam match (not just a
  // statistically-seamless one) in both directions. This matters more now
  // that real photo detail is layered in below (see applyPhotoDetailLayers):
  // that detail has actual macro-scale features (blotches, scratch runs) an
  // eye can lock onto, unlike the procedural spangle's fine uniform noise,
  // so a hard non-mirrored repeat would be far more likely to read as
  // "the same tile again" as the cylinder turns through it ~17 times.
  texture.wrapS = THREE.MirroredRepeatWrapping;
  texture.wrapT = THREE.MirroredRepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cached = texture;

  // Photo detail is loaded/processed asynchronously (real <img> decode) and
  // painted onto this SAME canvas once ready, then needsUpdate is flagged —
  // exactly the synchronous-placeholder + async-fill pattern already used
  // for the sticker atlas (useStickerAtlasTexture). Fire-and-forget: if it's
  // slow or a file 404s, the procedural material above is already a
  // complete, correct-looking result on its own.
  void applyPhotoDetailLayers(canvas, ctx, texture);

  return texture;
}

let photoLayersRequested = false;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Turns one arbitrary lit photo of metal into a flattened, desaturated
 * square detail layer, ready to be blended in at low strength:
 *
 *  - grayscale first — these are ordinary lit photos (one has a visible
 *    green cast, the other a blue-ish shadow side); the brief is explicit
 *    that the pole must not pick up a colour shift, so colour is discarded
 *    entirely rather than just reduced.
 *  - high-pass filtered — subtract a heavily blurred copy of the same
 *    grayscale image (mid-grey where nothing changes, lighter/darker where
 *    the original deviates from its own local average). This is what
 *    strips out each photo's own baked-in studio lighting gradient (one of
 *    the two source photos is strongly lit bright-corner-to-dark-corner)
 *    while keeping the actual surface detail — the pole's own bright-centre/
 *    dark-edge look must still come only from StickerScene's real lights.
 *  - `blurPx` controls what counts as "lighting" (removed) vs. "detail"
 *    (kept): a small radius keeps only fine marks (used for the scratch
 *    layer), a larger radius keeps broader cloudy patches too (used for the
 *    zinc/tonal layer) while still washing out the whole-image gradient.
 */
function buildFlattenedGrayscaleLayer(img: HTMLImageElement, tilePx: number, blurPx: number): HTMLCanvasElement {
  const src = document.createElement("canvas");
  src.width = tilePx;
  src.height = tilePx;
  const sctx = src.getContext("2d")!;
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  sctx.drawImage(img, sx, sy, side, side, 0, 0, tilePx, tilePx);

  const flat = sctx.getImageData(0, 0, tilePx, tilePx);
  for (let i = 0; i < flat.data.length; i += 4) {
    const g = flat.data[i] * 0.299 + flat.data[i + 1] * 0.587 + flat.data[i + 2] * 0.114;
    flat.data[i] = g;
    flat.data[i + 1] = g;
    flat.data[i + 2] = g;
  }

  const blurred = document.createElement("canvas");
  blurred.width = tilePx;
  blurred.height = tilePx;
  const bctx = blurred.getContext("2d")!;
  bctx.putImageData(flat, 0, 0);
  bctx.filter = `blur(${blurPx}px)`;
  // Draw the already-grayscale canvas onto itself through the blur filter —
  // drawImage(self) reads the pre-filter pixels and writes filtered ones.
  bctx.drawImage(blurred, 0, 0);
  const blurData = bctx.getImageData(0, 0, tilePx, tilePx);

  for (let i = 0; i < flat.data.length; i += 4) {
    const detail = flat.data[i] - blurData.data[i] + 128;
    flat.data[i] = detail;
    flat.data[i + 1] = detail;
    flat.data[i + 2] = detail;
    flat.data[i + 3] = 255;
  }
  const out = document.createElement("canvas");
  out.width = tilePx;
  out.height = tilePx;
  out.getContext("2d")!.putImageData(flat, 0, 0);
  return out;
}

/**
 * Loads the two reference photos and blends each in as a restrained detail
 * layer on top of the already-complete procedural base:
 *  - metal-zinc.jpg → broad tonal variation / cloudy patches. Larger blur
 *    radius (keeps mid-scale blotchiness, discards the photo's own overall
 *    gradient). Stronger of the two, but still low-to-medium strength.
 *  - metal-scratches.jpg → fine scratches/scuffs/wear marks. Smaller blur
 *    radius (keeps only fine marks). Kept subtle — scratches must read as
 *    incidental wear, not as the dominant surface pattern.
 * Both use 'overlay' compositing: the high-pass layers are centred on
 * neutral grey (128), so overlay only lightens/darkens relative to that
 * midpoint instead of washing a flat tint across the metal.
 */
async function applyPhotoDetailLayers(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  texture: THREE.CanvasTexture,
) {
  if (photoLayersRequested) return;
  photoLayersRequested = true;

  try {
    const [zincImg, scratchImg] = await Promise.all([
      loadImage("/textures/metal-zinc.jpg"),
      loadImage("/textures/metal-scratches.jpg"),
    ]);

    const tilePx = canvas.width;
    const zincLayer = buildFlattenedGrayscaleLayer(zincImg, tilePx, tilePx * 0.22);
    const scratchLayer = buildFlattenedGrayscaleLayer(scratchImg, tilePx, tilePx * 0.05);

    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.4;
    ctx.drawImage(zincLayer, 0, 0);
    ctx.globalAlpha = 0.22;
    ctx.drawImage(scratchLayer, 0, 0);
    ctx.restore();

    texture.needsUpdate = true;
  } catch {
    // A missing/failed photo load leaves the procedural-only material in
    // place — already a complete, correct result on its own.
  }
}
