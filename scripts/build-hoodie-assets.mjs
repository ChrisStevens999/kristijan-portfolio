/**
 * Turns the hoodie GLBs in assets/projects/apperal/hoodies/ into what the
 * Apparel display's "Hoodies" tab ships.
 *
 * Every source GLB is the same oversized-hoodie mesh (~27 MB each: 13.5 MB of
 * geometry and a 17.5 MB 4K normal map). The back-print hoodies also share
 * their UV layout and differ only in the 4096² base-colour texture (black
 * cotton + the print), so, as with the T-shirts:
 *
 *  - public/apparel/hoodies/hoodie.glb — the shared mesh + normal map, base
 *    colour stripped, positions/normals quantized and meshopt-compressed.
 *    UVs stay exact floats, so every print lands at its authored scale.
 *  - public/apparel/hoodies/prints/<slug>.webp — that hoodie's base-colour
 *    texture at its full authored size (4096², never resized), as a q92
 *    WebP: visually identical to the PNG in its GLB at a fraction of the
 *    bytes.
 *
 * A hoodie that can't be a print on the shared mesh (`own: true`) — an
 * all-over pattern mapped with ITS OWN UVs (the pattern's tiling scale), or
 * an off-white hoodie whose drawstrings aren't black — ships as its own
 * model, as authored:
 *
 *  - public/apparel/hoodies/models/<slug>.glb — that GLB with its base
 *    colour at full size as a q92 WebP (Concrete Memories' 17.7 MB PNG was
 *    most of a 24 MB model), the normal map re-encoded and the geometry
 *    compressed exactly as the shared mesh is.
 *
 * And for every hoodie:
 *
 *  - public/apparel/hoodies/flat/<slug>.webp — the preview PNG, trimmed and
 *    centred in the same 1200² square the other tabs use, for the strip.
 *  - public/apparel/hoodies/gallery/<slug>-<n>.webp — the "in the real
 *    world" mockup photos ("<Name> 1.png", "<Name>-2.png"… in the folder)
 *    for the gallery under the display, web-sized as the other two
 *    galleries (`--gallery-only` rebuilds just these).
 *
 *   node scripts/build-hoodie-assets.mjs                 # everything
 *   node scripts/build-hoodie-assets.mjs deviant         # just the named one(s)
 *   node scripts/build-hoodie-assets.mjs --gallery-only  # just the photos
 *
 * Adding a hoodie: drop its GLB + preview PNG (and its photos) in the
 * folder, add it to HOODIES (and GALLERY) below, run this script, then add
 * it to src/content/projects/apparel-display.ts.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, prune, quantize, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// borrow gltf-transform's own sharp (a second copy in-process breaks libvips)
const require = createRequire(import.meta.url);
const sharp = createRequire(
  require.resolve("ndarray-pixels", { paths: [path.dirname(require.resolve("@gltf-transform/functions"))] }),
)("sharp");

const SRC = path.join(root, "assets/projects/apperal/hoodies");
const OUT = path.join(root, "public/apparel/hoodies");
const FLAT_SIZE = 1200;

/** slug -> sources. The PNG is the strip cutout; the GLB carries the print.
 *  `own`: the GLB ships whole — its own UV layout (an all-over pattern) or
 *  its own trim colours (an off-white hoodie). */
const HOODIES = {
  bushido: { glb: "Bushido-Hoodie F.glb", png: "Bushido Back Print Preview.png" },
  deviant: { glb: "Deviant-Hoodie.glb", png: "Deviant Hoodie Back.png" },
  "error-404": { glb: "Error-404-Oversized-Hoodie (1).glb", png: "Error 404 Hoodie Back.png" },
  "la-leakers": { glb: "La-Leakers-Oversized-Hoodie (1).glb", png: "LA Leakers Preview.png", own: true },
  swimmin: { glb: "Swimmin-Hoodie.glb", png: "Swimmin Hoodie Front.png" },
  "concrete-memories": { glb: "Concrete-Memories-Hoodie (1).glb", png: "Skate HOodie.png", own: true },
  // standard UVs, but an off-white hoodie: its drawstrings are off-white
  // too, while the shared model's are black — so it ships whole
  purgatory: { glb: "Purgatory-Off-White-Hoodie F.glb", png: "Purgatory Hoodie.png", own: true },
  "brush-like-camo": { glb: "Brush-Like-Camo-Hoodie.glb", png: "Brush Like Camo.png", own: true },
  operator: { glb: "Operator-Hoodie.glb", png: "Opperator Hoodie.png" },
  vision: { glb: "Vision-Hoodie.glb", png: "Vision.png" },
  "hungry-dogs": { glb: "Hungry-Dogs-Hoodie.glb", png: "Hungry Dogs.png" },
};
/** the mesh + normal map are identical in every GLB; this one supplies them */
const SHARED_MESH_FROM = "bushido";

/** slug -> its mockup photos, in order (sources are 3392x5056, 1–25 MB each).
 *  Concrete Memories has one so far. */
const GALLERY = {
  bushido: ["Bushido-1.png", "Bushido-2.png"],
  deviant: ["Devian Hoodie-1.png", "Devian Hoodie-2.png"],
  "error-404": ["Error 404 hoodie-1.png", "Error 404 hoodie-2.png"],
  "la-leakers": ["La 1.png", "La 2.png"],
  swimmin: ["Swimmin 1.png", "Swimmin 2.png"],
  "concrete-memories": ["Skate Hoodie 2.png"],
  purgatory: ["Purgatory-1.png", "Purgatory-2.png"],
  "brush-like-camo": ["Brush Like Camo 1.png", "Brush Like Camo 2.png"],
  operator: ["Opperator hoodie-1.png", "Opperator hoodie-2.png"],
  vision: ["Vision 1.png", "Vision 2.png"],
  "hungry-dogs": ["Hungry Dogs Hoodie-1.png", "Hungry Dogs Hoodie-2.png"],
};
const GALLERY_WIDTH = 1100; // as the T-shirt and AOP galleries
/** WebP quality for prints and own-model base colours: visually lossless here */
const PRINT_QUALITY = 92;

/** The geometry/normal-map treatment every shipped hoodie model gets. The
 *  base colour is never touched here: it is either stripped (shared mesh) or
 *  kept as authored (own model). */
async function compressModel(doc) {
  await doc.transform(
    dedup(),
    prune({ keepAttributes: true }),
    // the knit normal map: kept at 4096², re-encoded as WebP
    textureCompress({ encoder: sharp, targetFormat: "webp", quality: 90, slots: /^normalTexture$/ }),
    // an own model's base colour (stripped from the shared mesh before this
    // runs): full size, WebP q92 — visually lossless on these graphics
    textureCompress({ encoder: sharp, targetFormat: "webp", quality: PRINT_QUALITY, slots: /^baseColorTexture$/ }),
    // positions/normals only: the UVs carry the print's scale and stay exact
    quantize({ pattern: /^(POSITION|NORMAL|TANGENT)(_\d+)?$/ }),
  );
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
}

/** Preview cutout: trimmed to the hoodie, then centred in a square with the
 *  same margin, so every thumbnail lines up whatever the source framing. */
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
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;
const mb = (f) => `${(fs.statSync(f).size / 1048576).toFixed(2)} MB`;

/** the one base-colour image the cloth materials share */
function baseColorOf(doc) {
  const tex = doc.getRoot().listMaterials().find((m) => m.getBaseColorTexture())?.getBaseColorTexture();
  if (!tex) throw new Error("no base-colour texture");
  return tex;
}

const galleryOnly = process.argv.includes("--gallery-only");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
for (const slug of only) if (!HOODIES[slug]) throw new Error(`unknown hoodie "${slug}"`);
// a full build starts clean (a renamed or removed hoodie leaves nothing
// behind) — except the flats, which may have to be kept when their preview
// PNG has left the folder (see below); they are overwritten otherwise
if (only.length === 0 && !galleryOnly)
  for (const p of ["prints", "models", "gallery", "hoodie.glb"]) fs.rmSync(path.join(OUT, p), { recursive: true, force: true });
for (const dir of ["prints", "flat", "models", "gallery"]) fs.mkdirSync(path.join(OUT, dir), { recursive: true });

// --- gallery photos -----------------------------------------------------------
for (const [slug, files] of Object.entries(GALLERY)) {
  if (only.length && !only.includes(slug)) continue;
  for (const [i, file] of files.entries()) {
    const out = path.join(OUT, "gallery", `${slug}-${i + 1}.webp`);
    await sharp(path.join(SRC, file))
      .flatten({ background: "#000" })
      .resize({ width: GALLERY_WIDTH })
      .webp({ quality: 82, effort: 6 })
      .toFile(out);
    console.log(`gallery/${slug}-${i + 1}.webp  ${kb(out)}`);
  }
}
if (galleryOnly) process.exit(0);

// --- per hoodie: print (original bytes) or own model, + flat cutout -------------
for (const [slug, { glb, png, own }] of Object.entries(HOODIES)) {
  if (only.length && !only.includes(slug)) continue;
  const doc = await io.read(path.join(SRC, glb));
  const tex = baseColorOf(doc);
  if (tex.getMimeType() !== "image/png") throw new Error(`${glb}: expected a PNG print, got ${tex.getMimeType()}`);
  let line;
  if (own) {
    const size = tex.getSize().join("x");
    await compressModel(doc);
    const model = path.join(OUT, "models", `${slug}.glb`);
    await io.write(model, doc);
    line = `${slug.padEnd(12)} model ${mb(model).padStart(8)} (own model, ${size} texture, WebP q${PRINT_QUALITY})`;
  } else {
    const print = path.join(OUT, "prints", `${slug}.webp`);
    await sharp(Buffer.from(tex.getImage())).webp({ quality: PRINT_QUALITY, effort: 6 }).toFile(print);
    line = `${slug.padEnd(12)} print ${kb(print).padStart(8)} (${tex.getSize().join("x")}, WebP q${PRINT_QUALITY})`;
  }
  const flat = path.join(OUT, "flat", `${slug}.webp`);
  if (fs.existsSync(path.join(SRC, png))) await writeFlat(path.join(SRC, png), flat);
  // the preview PNG has left the folder: keep the cutout already built
  else if (fs.existsSync(flat)) console.warn(`${slug}: "${png}" is missing — kept the existing flat`);
  else throw new Error(`${slug}: "${png}" is missing and there is no flat to keep`);
  console.log(`${line}  flat ${kb(flat).padStart(7)}`);
}

// --- shared mesh ------------------------------------------------------------------
if (only.length === 0 || only.includes(SHARED_MESH_FROM)) {
  const doc = await io.read(path.join(SRC, HOODIES[SHARED_MESH_FROM].glb));
  const baseColor = baseColorOf(doc);
  for (const m of doc.getRoot().listMaterials()) if (m.getBaseColorTexture()) m.setBaseColorTexture(null);
  baseColor.dispose();
  await compressModel(doc);
  const model = path.join(OUT, "hoodie.glb");
  await io.write(model, doc);
  console.log(`hoodie.glb   ${mb(model)}`);
}
