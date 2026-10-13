/**
 * Turns the supplied background textures into what the site ships.
 *
 * The masters are the supplied PNGs (assets/textures/): 3840x2160 and
 * 2560x1440 plates, 8 MB between them, every one painted as a full-screen
 * CSS background. The web copies are WebP at q90 and the same size — the
 * grain survives at a few dozen KB each (the red plate is a few hundred).
 *
 *  - public/textures/<name>.webp — see src/lib/textures.ts
 *
 *   node scripts/build-textures.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sharp } from "./lib/assets.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SRC = path.join(root, "assets/textures");
const OUT = path.join(root, "public/textures");
const NAMES = ["black-page", "red-page", "textured-page"];
const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;

for (const name of NAMES) {
  const src = path.join(SRC, `${name}.png`);
  const out = path.join(OUT, `${name}.webp`);
  await sharp(src).webp({ quality: 90, effort: 6 }).toFile(out);
  console.log(`${name.padEnd(14)} ${kb(src).padStart(9)} -> ${kb(out).padStart(7)}`);
}
