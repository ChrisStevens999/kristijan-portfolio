/**
 * Web-sized copy of the statue model for the /lab/statue showcase.
 *
 *   node scripts/build-statue-asset.mjs [path-to-source.glb]
 *
 * Source (default: Desktop/Statue-Website-V2-Materials.glb) is ~15 MB:
 * 735k Draco-compressed triangles, a 10 MB PNG normal map and a 2 MB PNG
 * base colour. Output public/lab/statue.glb: welded + simplified geometry,
 * WebP textures, quantized and meshopt-compressed. Materials (silver with
 * clearcoat, black frame, emissive red lens) are kept as authored.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, quantize, simplify, textureCompress, weld } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// borrow gltf-transform's own sharp (a second copy in-process breaks libvips)
const require = createRequire(import.meta.url);
const sharp = createRequire(
  require.resolve("ndarray-pixels", { paths: [path.dirname(require.resolve("@gltf-transform/functions"))] }),
)("sharp");

const SRC = process.argv[2] ?? path.join(os.homedir(), "Desktop", "Statue-Website-V2-Materials.glb");
const OUT = path.join(root, "public/lab/statue.glb");
/** fraction of triangles to keep, and the most shape error allowed (× model size) */
const KEEP = 0.35;
const MAX_ERROR = 0.0004;

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

const tris = (doc) =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0);

const doc = await io.read(SRC);
const before = tris(doc);
// the Draco extension must go: the output is meshopt-compressed instead
doc.getRoot().listExtensionsUsed().find((e) => e.extensionName === "KHR_draco_mesh_compression")?.dispose();

await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: KEEP, error: MAX_ERROR }),
  prune(),
  // normal maps need gentle compression — artefacts show up as dents in the chrome
  textureCompress({ encoder: sharp, targetFormat: "webp", quality: 92, resize: [2048, 2048] }),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await io.write(OUT, doc);
console.log(`triangles ${Math.round(before)} -> ${Math.round(tris(doc))}`);
console.log(`${(fs.statSync(SRC).size / 1048576).toFixed(1)} MB -> ${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB  (${OUT})`);
