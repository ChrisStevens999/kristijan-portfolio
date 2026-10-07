/**
 * The About page's boards: the five designed screens, shipped as artwork.
 *
 *  - assets/about/boards/<n>-<name>.png (3840x2160, landscape) ship as
 *    public/about/boards/<n>-<name>.webp at 2560 wide;
 *  - assets/about/boards/portrait/<n>-<name>.png (9:16, for phones) ship as
 *    public/about/boards/portrait/<n>-<name>.webp at 1440 wide. Optional:
 *    a board without one shows the landscape version cropped to the middle.
 *
 *   node scripts/build-about-boards.mjs
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

const SRC = path.join(root, "assets/about/boards");
const OUT = path.join(root, "public/about/boards");

async function build(srcDir, outDir, width) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir).filter((f) => /\.png$/i.test(f)).sort()) {
    const out = path.join(outDir, f.replace(/\.png$/i, ".webp"));
    await sharp(path.join(srcDir, f)).resize({ width, withoutEnlargement: true }).webp({ quality: 86, effort: 6 }).toFile(out);
    console.log(`${path.relative(root, out).padEnd(44)} ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
await build(SRC, OUT, 2560);
await build(path.join(SRC, "portrait"), path.join(OUT, "portrait"), 1440);
