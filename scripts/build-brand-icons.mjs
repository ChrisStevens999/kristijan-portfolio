/**
 * The site icon: the "Chris Stevens" roundel (assets/brand/icon.png, 800²,
 * transparent outside the circle) as every icon the browsers ask for. The
 * outputs sit in src/app, where Next's app router picks them up by name and
 * writes the <link rel="icon"> / apple-touch-icon tags itself:
 *
 *  - src/app/icon.png        512², transparent corners (the tab icon)
 *  - src/app/apple-icon.png  180², on black (iOS fills transparency with
 *                            black anyway; this keeps the edge clean)
 *  - src/app/favicon.ico     16 + 32 + 48 (PNG-in-ICO), for old lookups of
 *                            /favicon.ico
 *
 *   node scripts/build-brand-icons.mjs
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

const SRC = path.join(root, "assets/brand/icon.png");
const APP = path.join(root, "src/app");

const png = (size) => sharp(SRC).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png();

await png(512).toFile(path.join(APP, "icon.png"));
await sharp(SRC).resize(180, 180).flatten({ background: "#000" }).png().toFile(path.join(APP, "apple-icon.png"));

/** ICO container holding PNG-encoded images (every current browser reads these). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const dir = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    dir.push(e);
  }
  return Buffer.concat([header, ...dir, ...images.map((i) => i.data)]);
}

const sizes = [16, 32, 48];
const images = [];
for (const size of sizes) images.push({ size, data: await png(size).toBuffer() });
fs.writeFileSync(path.join(APP, "favicon.ico"), ico(images));

for (const f of ["icon.png", "apple-icon.png", "favicon.ico"])
  console.log(`src/app/${f.padEnd(16)} ${(fs.statSync(path.join(APP, f)).size / 1024).toFixed(1)} KB`);
