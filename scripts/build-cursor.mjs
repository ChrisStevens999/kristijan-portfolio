/**
 * The site cursor: the red pointing hand (assets/brand/cursor-hand.webp,
 * transparent) trimmed and shipped at cursor size, 1x and 2x, with the
 * hotspot on the tip of the index finger. Prints the hotspot to paste into
 * globals.css.
 *
 *   node scripts/build-cursor.mjs
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// borrow gltf-transform's sharp (a second copy in-process breaks libvips)
const require = createRequire(import.meta.url);
const sharp = createRequire(
  require.resolve("ndarray-pixels", { paths: [path.dirname(require.resolve("@gltf-transform/functions"))] }),
)("sharp");

const SRC = path.join(root, "assets/brand/cursor-hand.webp");
const OUT = path.join(root, "public/cursor");
const HEIGHT = 56; // css px; browsers cap cursors at 128 and Windows at 32 on some setups, 56 keeps it readable yet unobtrusive

fs.mkdirSync(OUT, { recursive: true });
const trimmed = await sharp(SRC).trim({ threshold: 10 }).png().toBuffer();

/** the hotspot: the topmost opaque pixel (the fingertip), as fractions */
const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let tip = null;
outer: for (let y = 0; y < info.height; y++) {
  const xs = [];
  for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 128) xs.push(x);
  if (xs.length) {
    tip = { x: (xs[0] + xs[xs.length - 1]) / 2 / info.width, y: y / info.height };
    break outer;
  }
}

for (const [suffix, scale] of [["", 1], ["@2x", 2]]) {
  const out = path.join(OUT, `hand${suffix}.png`);
  await sharp(trimmed).resize({ height: HEIGHT * scale }).png({ compressionLevel: 9 }).toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${path.relative(root, out)}  ${m.width}x${m.height}  ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
}
const w = Math.round((HEIGHT * info.width) / info.height);
console.log(`hotspot (1x css px): ${Math.round(tip.x * w)} ${Math.round(tip.y * HEIGHT)}`);
