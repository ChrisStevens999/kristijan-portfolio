/**
 * The Contact page's dog (src/app/contact).
 *
 * STAND-IN: no cut-out of the dog was supplied, so this lifts it off the
 * Contact mockup itself (assets/contact/mockup.webp, 2000x1125), where it
 * sits bottom-left on the red texture. The dog is black-and-white and the
 * background is red, so a pixel's "redness" (R above its G and B) says how
 * much background is in it: that becomes the alpha, and the red is unmixed
 * out of the edge pixels. When a real cut-out arrives, save it as
 * assets/contact/dog.png (transparent) and this script ships that instead.
 *
 *   node scripts/build-contact-dog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sharp } from "./lib/assets.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "assets/contact");
const OUT = path.join(root, "public/contact");
fs.mkdirSync(OUT, { recursive: true });
const dest = path.join(OUT, "dog.webp");

const supplied = path.join(SRC, "dog.png");
if (fs.existsSync(supplied)) {
  await sharp(supplied).trim({ threshold: 1 }).resize({ height: 1200, withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 95, effort: 6 }).toFile(dest);
  console.log(`dog.webp from the supplied cut-out  ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
} else {
  /** where the dog is in the mockup */
  const REGION = { left: 0, top: 560, width: 640, height: 565 };
  /** redness at which a pixel is all background, and below which it is all dog */
  const FULL_BG = 58;
  const FULL_DOG = 14;
  const { data, info } = await sharp(path.join(SRC, "mockup.webp")).extract(REGION).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const redness = r - Math.max(g, b);
    const alpha = Math.min(1, Math.max(0, (FULL_BG - redness) / (FULL_BG - FULL_DOG)));
    // the dog is grey: take its tone from green and blue, where the red texture is nearly black,
    // with the background's share of them (about 24) unmixed out
    const mix = (g + b) / 2;
    const tone = alpha > 0 ? Math.min(255, Math.max(0, (mix - (1 - alpha) * 24) / alpha)) : 0;
    out[o] = out[o + 1] = out[o + 2] = Math.round(tone);
    out[o + 3] = Math.round(alpha * 255);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(dest);
  const m = await sharp(dest).metadata();
  console.log(`dog.webp lifted from the mockup (stand-in)  ${m.width}x${m.height}  ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
}
