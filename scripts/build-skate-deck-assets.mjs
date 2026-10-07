/**
 * Turns the deck GLBs in assets/projects/skateboarding/decks/ into what the
 * Skateboard Designs wall ships (src/components/case-studies/skateboard-designs).
 *
 * Every source GLB (12–15 MB) is the same deck mesh with the same UV layout:
 * a 4096² wood-grain normal map, a plain-coloured edge, and ONE 2048x4096
 * print PNG that both printed faces use (the graphic underneath, the smooth
 * top with the logo). So, as with the T-shirts and hoodies:
 *
 *  - public/skateboarding/deck.glb — the shared mesh + normal map (re-encoded
 *    as a 2048² WebP: the deck is small on screen), the print stripped, the
 *    two unused images dropped, positions/normals quantized and
 *    meshopt-compressed. UVs stay exact floats.
 *  - public/skateboarding/prints/<slug>.png — that deck's print, the
 *    ORIGINAL PNG bytes from its GLB: not re-encoded, not resized.
 *
 * The edge colour is per deck and is read off each GLB's edge material; the
 * script prints it to paste into src/content/projects/skateboard-designs.ts,
 * where the wall sets it on the shared model at runtime.
 *
 *   node scripts/build-skate-deck-assets.mjs
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

const SRC = path.join(root, "assets/projects/skateboarding/decks");
const OUT = path.join(root, "public/skateboarding");
const NORMAL_SIZE = 2048;

/** slug -> GLB; left to right on the wall */
const DECKS = {
  ronin: "Ronin-Deck.glb",
  cobra: "Cobra-Deck.glb",
  corruption: "Corruption-Deck.glb",
  "damaged-goods": "Damaged-Goods-Deck.glb",
  dobermann: "Dobermann-Deck.glb",
  "error-404": "Error-404-Deck.glb",
};
/** the mesh + normal map are identical in every GLB; this one supplies them */
const SHARED_MESH_FROM = "ronin";

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;
const mb = (f) => `${(fs.statSync(f).size / 1048576).toFixed(2)} MB`;
const hex = ([r, g, b]) =>
  "#" +
  [r, g, b]
    .map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255).toString(16).padStart(2, "0")) // linear -> sRGB
    .join("");

/** the print both printed faces share */
function printOf(doc) {
  const tex = doc.getRoot().listMaterials().find((m) => / printed deck$/.test(m.getName()))?.getBaseColorTexture();
  if (!tex) throw new Error("no print texture");
  return tex;
}
/** the plain-coloured edge material */
const edgeOf = (doc) => doc.getRoot().listMaterials().find((m) => / edge$/.test(m.getName()));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "prints"), { recursive: true });

// --- per deck: the print, original bytes ------------------------------------------
for (const [slug, glb] of Object.entries(DECKS)) {
  const doc = await io.read(path.join(SRC, glb));
  const tex = printOf(doc);
  if (tex.getMimeType() !== "image/png") throw new Error(`${glb}: expected a PNG print, got ${tex.getMimeType()}`);
  const print = path.join(OUT, "prints", `${slug}.png`);
  fs.writeFileSync(print, Buffer.from(tex.getImage()));
  const edge = edgeOf(doc);
  console.log(
    `${slug.padEnd(14)} print ${kb(print).padStart(8)} (${tex.getSize().join("x")}, as authored)  edge ${hex(edge.getBaseColorFactor())} "${edge.getName()}"`,
  );
}

// --- shared mesh ------------------------------------------------------------------
{
  const doc = await io.read(path.join(SRC, DECKS[SHARED_MESH_FROM]));
  const print = printOf(doc);
  for (const m of doc.getRoot().listMaterials()) if (m.getBaseColorTexture()) m.setBaseColorTexture(null);
  print.dispose();
  // the edge ships white so the wall can colour it per deck
  edgeOf(doc).setBaseColorFactor([1, 1, 1, 1]);
  await doc.transform(
    dedup(),
    // drops the two images no material uses; every vertex attribute is kept
    prune({ keepAttributes: true }),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      quality: 90,
      slots: /^normalTexture$/,
      resize: [NORMAL_SIZE, NORMAL_SIZE],
    }),
    // positions/normals only: the UVs carry the print and stay exact
    quantize({ pattern: /^(POSITION|NORMAL|TANGENT)(_\d+)?$/ }),
  );
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const model = path.join(OUT, "deck.glb");
  await io.write(model, doc);
  console.log(`deck.glb       ${mb(model)}`);
}
