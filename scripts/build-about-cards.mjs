/**
 * The About teaser's cards: the black-and-white photographs that gather into
 * the middle of the screen and form the video. Sources are
 * assets/about/cards/<n>.png (1080x1400, the same frame as the video); they
 * ship as public/about/cards/<n>.webp at the same size.
 *
 *   node scripts/build-about-cards.mjs
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

const SRC = path.join(root, "assets/about/cards");
const OUT = path.join(root, "public/about/cards");
const WIDTH = 900; // the cards show at ~48% of the screen height: 900 wide covers a 4K screen at 1x and a laptop at 2x

fs.mkdirSync(OUT, { recursive: true });
const files = fs
  .readdirSync(SRC)
  .filter((f) => /^\d+\.png$/i.test(f))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

for (const f of files) {
  const out = path.join(OUT, f.replace(/\.png$/i, ".webp"));
  await sharp(path.join(SRC, f)).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(out);
  console.log(`${f.padEnd(8)} -> ${path.basename(out).padEnd(8)} ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}
