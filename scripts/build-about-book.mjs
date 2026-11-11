/**
 * The About book's pages (src/components/about/BlackBook.tsx).
 *
 * Sources, in assets/about/book/ (transparent PNGs, the book cut out):
 *  - cover.png, back-cover.png — the closed book, front and back
 *    (3712x4608; the book itself is ~2880x3858 in the middle)
 *  - spread-1.png … spread-3.png — the open book, two pages each
 *    (3168x2464; the book is x 56–3024, y 290–2276, the spine at x 1530)
 *
 * Out, in public/about/book/, every page the same box (PAGE_H tall), so the
 * leaves of the book line up when they turn:
 *  - cover.webp, back.webp — cropped to the book
 *  - 1l.webp 1r.webp … 3l.webp 3r.webp — each spread cut at the spine into
 *    its left and right page. Both halves are cut the same width (the right
 *    page's; the left keeps a sliver of its transparent margin), so the
 *    spine sits exactly on the fold.
 *
 *   node scripts/build-about-book.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sharp } from "./lib/assets.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "assets/about/book");
const OUT = path.join(root, "public/about/book");
const PAGE_H = 1600; // a page shows at up to ~80% of the screen height: 1600 covers a laptop at 2x

/** the open book inside a spread file, and its fold */
const SPREAD = { x1: 56, x2: 3024, y1: 290, y2: 2276, spine: 1530 };
const HALF_W = SPREAD.x2 + 1 - SPREAD.spine; // the right page's width; the left is cut to match
const SPREADS = ["spread-1.png", "spread-2.png", "spread-3.png"];

const webp = (img) => img.webp({ quality: 84, alphaQuality: 90, effort: 6 });
const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;

/** opaque bounds of a cut-out (alpha > 128) */
async function bounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let x1 = info.width, x2 = -1, y1 = info.height, y2 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[y * info.width + x] > 128) {
        if (x < x1) x1 = x;
        if (x > x2) x2 = x;
        if (y < y1) y1 = y;
        if (y > y2) y2 = y;
      }
  return { left: x1, top: y1, width: x2 - x1 + 1, height: y2 - y1 + 1 };
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const pageW = Math.round((PAGE_H * HALF_W) / (SPREAD.y2 - SPREAD.y1 + 1));

// the closed book: cropped to the book, fitted to the page box
for (const [src, out] of [["cover.png", "cover.webp"], ["back-cover.png", "back.webp"]]) {
  const file = path.join(SRC, src);
  const dest = path.join(OUT, out);
  await webp(sharp(file).extract(await bounds(file)).resize(pageW, PAGE_H, { fit: "fill" })).toFile(dest);
  console.log(`${out.padEnd(12)} ${pageW}x${PAGE_H}  ${kb(dest)}`);
}

// the spreads: left and right page, cut at the spine
for (const [i, src] of SPREADS.entries()) {
  const file = path.join(SRC, src);
  const top = SPREAD.y1;
  const height = SPREAD.y2 - SPREAD.y1 + 1;
  for (const [side, left] of [["l", SPREAD.spine - HALF_W], ["r", SPREAD.spine]]) {
    const dest = path.join(OUT, `${i + 1}${side}.webp`);
    await webp(sharp(file).extract({ left, top, width: HALF_W, height }).resize(pageW, PAGE_H, { fit: "fill" })).toFile(dest);
    console.log(`${path.basename(dest).padEnd(12)} ${pageW}x${PAGE_H}  ${kb(dest)}`);
  }
}
console.log(`page box: ${pageW} x ${PAGE_H} (aspect ${(pageW / PAGE_H).toFixed(4)})`);
