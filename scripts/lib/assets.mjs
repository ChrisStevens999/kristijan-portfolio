/**
 * Shared by the asset build scripts.
 *
 * sharp: not a dependency of the site itself, so it is borrowed from
 * gltf-transform's texture tools, which load their own copy. Using that same
 * copy matters: a second sharp in one process breaks libvips.
 */
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
export const sharp = createRequire(
  require.resolve("ndarray-pixels", { paths: [path.dirname(require.resolve("@gltf-transform/functions"))] }),
)("sharp");

/** Strip cutouts are all this size, square. */
export const FLAT_SIZE = 1200;

/**
 * A garment's strip cutout: trimmed to the garment, then centred in the same
 * 1200² square with the same margin, so every thumbnail lines up whatever the
 * source framing.
 */
export async function writeFlat(src, out) {
  const trimmed = await sharp(src).trim({ threshold: 1 }).png().toBuffer();
  const inner = Math.round(FLAT_SIZE * 0.92);
  const fitted = await sharp(trimmed).resize(inner, inner, { fit: "inside" }).png().toBuffer();
  const m = await sharp(fitted).metadata();
  await sharp({
    create: { width: FLAT_SIZE, height: FLAT_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fitted, left: Math.round((FLAT_SIZE - m.width) / 2), top: Math.round((FLAT_SIZE - m.height) / 2) }])
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(out);
}
