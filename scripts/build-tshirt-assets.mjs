/**
 * Turns the T-shirt GLBs in assets/projects/apperal/t-shirts/ into what the
 * Graphic T's viewer ships.
 *
 * Every source GLB is the same oversized-tee mesh (~19 MB each); only the
 * baked 4K base-colour texture (black cotton + the print) differs. So:
 *
 *  - public/apparel/t-shirts/tshirt.glb — the shared mesh + normal map,
 *    base-colour texture stripped, quantized + meshopt-compressed.
 *  - public/apparel/t-shirts/prints/<slug>.webp — one 4096² base-colour
 *    texture per shirt (mostly flat black, so it compresses very small; the
 *    print only fills a corner of the UV sheet, so it stays at full 4K).
 *  - public/apparel/t-shirts/flat/<slug>.webp — the 2D cutout for the strip.
 *
 * Adding a shirt: drop its GLB + PNG next to the others, add it to SHIRTS
 * below, run `node scripts/build-tshirt-assets.mjs`, then add it to
 * src/content/projects/graphic-tees.ts.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, EXTTextureWebP, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, prune, quantize, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// gltf-transform's texture tools already load their own sharp; a second
// copy (e.g. the one Next uses) in the same process breaks libvips, so
// borrow theirs.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("ndarray-pixels", { paths: [path.dirname(require.resolve("@gltf-transform/functions"))] }))("sharp");

const SRC = path.join(root, "assets/projects/apperal/t-shirts");
const OUT = path.join(root, "public/apparel/t-shirts");

/**
 * slug -> sources. `glb` gives the 3D print; `png` the flat cutout for the
 * strip. 7 Deadly Sins has no PNG: its flat was cut from the "7 Deadly Sins"
 * layer of Shirt Display 2.psd and is left as is.
 */
const SHIRTS = {
  morality: { glb: "MoralityIsAMissingConcept-T-Shirt.glb", png: "Morality.png" },
  "hardcore-mentality": { glb: "HardcoreMentality-T-Shirt.glb", png: "Hardcore Mentality.png" },
  conformity: { glb: "Conformity-T-Shirt.glb", png: "Conformity.png" },
  "seven-deadly-sins": { glb: "7DeadlySins-T-Shirt.glb" },
  abaddon: { glb: "Abaddon-T-Shirt.glb", png: "Abaddon.png" },
  "burden-of-intellect": { glb: "Burden-T-Shirt.glb", png: "Burden of Intellect.png" },
  "nod-mami": { glb: "NodMami-T-Shirt.glb", png: "Nod Mami.png" },
  essentials: { glb: "Essentials-T-Shirt.glb", png: "Essentials.png" },
  ferocious: { glb: "Ferocious-T-Shirt.glb", png: "Ferocious.png" },
  sheep: { glb: "Sheep.glb", png: "Sheep.png" },
  "the-eyes-chico": { glb: "The Eyes Chico-T-Shirt.glb", png: "The Eyes Chico.png" },
  "the-tempest-of-iron": { glb: "The Tempest of Iron.glb", png: "The Tempest of Iron.png" },
  vision: { glb: "Vision-T-Shirt.glb", png: "Vision.png" },
  "damaged-goods": { glb: "Damaged Goods-T-Shirt.glb", png: "Damaged Goods.png" },
  "speak-up": { glb: "Speak-T-Shirt.glb", png: "Speak Up.png" },
};

/** Flat cutouts: trimmed to the shirt, then centred in the same 1200² square
 *  with the same margin, so every thumbnail lines up whatever the source
 *  framing (sources are 3500–7000 px). */
const FLAT_SIZE = 1200;
async function writeFlat(src, out) {
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

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, EXTTextureWebP, KHRMeshQuantization])
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

fs.mkdirSync(path.join(OUT, "prints"), { recursive: true });
fs.mkdirSync(path.join(OUT, "flat"), { recursive: true });

const baseColorOf = (doc) => doc.getRoot().listMaterials()[0].getBaseColorTexture();
const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;

// --- per-shirt print textures + flat cutouts -----------------------------------
for (const [slug, { glb, png }] of Object.entries(SHIRTS)) {
  const doc = await io.read(path.join(SRC, glb));
  const print = path.join(OUT, "prints", `${slug}.webp`);
  await sharp(Buffer.from(baseColorOf(doc).getImage())).webp({ quality: 90, effort: 6 }).toFile(print);
  let line = `${slug.padEnd(22)} print ${kb(print)}`;
  if (png) {
    const flat = path.join(OUT, "flat", `${slug}.webp`);
    await writeFlat(path.join(SRC, png), flat);
    line += `  flat ${kb(flat)}`;
  }
  console.log(line);
}

// --- shared mesh ---------------------------------------------------------------
const doc = await io.read(path.join(SRC, SHIRTS.morality.glb));
const material = doc.getRoot().listMaterials()[0];
material.setName("Black cotton");
const baseColor = material.getBaseColorTexture();
material.setBaseColorTexture(null);
baseColor.dispose();
await doc.transform(
  prune(),
  textureCompress({ encoder: sharp, targetFormat: "webp", quality: 90 }),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
const glbOut = path.join(OUT, "tshirt.glb");
await io.write(glbOut, doc);
console.log(`tshirt.glb  ${(fs.statSync(glbOut).size / 1048576).toFixed(2)} MB`);
