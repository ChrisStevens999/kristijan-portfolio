/**
 * Turns the pattern (all-over-print) button-downs in
 * assets/projects/apperal/pattern AOPs/ into what the Apparel display's
 * "Pattern AOPs" tab ships.
 *
 *   node scripts/build-aop-assets.mjs
 *
 * Each shirt is a pair in that folder: a preview PNG (a transparent cutout —
 * its FILE NAME is the shirt's display name) and a GLB.
 *
 * The GLBs all use the same shirt shape, but each one maps its pattern onto
 * it at its own scale and position (its own UVs) and colours its buttons and
 * stitching to match. So — unlike the T-shirts, which share one mesh — every
 * shirt ships as ITS OWN model, exactly as authored, only made lighter:
 *
 *  - public/apparel/aop/models/<slug>.glb — that shirt's GLB with its
 *    pattern re-encoded as a 2048² WebP (from a 4096² PNG), the two unused
 *    images dropped, and the geometry meshopt-compressed. UVs, materials and
 *    colours are untouched: positions and normals are quantized, UVs stay
 *    full-precision floats.
 *  - public/apparel/aop/flat/<slug>.webp — the preview PNG, trimmed and
 *    centred in a 1200² square, for the strip.
 *
 * Adding a shirt: put its PNG + GLB in the folder, add it to SHIRTS below,
 * run this script, then add it to src/content/projects/apparel-display.ts.
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

const SRC = path.join(root, "assets/projects/apperal/pattern AOPs");
const OUT = path.join(root, "public/apparel/aop");
const PRINT_SIZE = 2048;
const FLAT_SIZE = 1200;

/**
 * slug -> the pair of source files. The PNG's name (minus ".png") is the
 * display name; the GLBs were exported under their working titles, so the
 * pairing is spelled out here (matched by the pattern itself).
 */
const SHIRTS = {
  ronin: { png: "Ronin.png", glb: "Ronin-AOP-Button-Down.glb" },
  "neo-tokyo": { png: "Neo Tokyo.png", glb: "Rhodesian-Black-HotPink-Button-Down.glb" },
  "midnight-blossom": { png: "MIdnight Blossom.png", glb: "MidnightBlossom-Button-Down.glb" },
  "miami-brushstroke": { png: "Miami Brushstroke.png", glb: "MiamiBrushstroke-TealHotPink-Button-Down.glb" },
  "nods-aop": { png: "NODS AOP Preview.png", glb: "NODS-AOP-Button-Down.glb" },
  "conspiracy-theory": { png: "Conspiracy Theory.png", glb: "ConspiracyTheory-Button-Down.glb" },
  "arcade-night": { png: "Arcade Night.png", glb: "Arcade1-Button-Down.glb" },
  "x-ray": { png: "X-Ray.png", glb: "X-Ray-Button-Down.glb" },
  "synth-tiger": { png: "Synth Tiger.png", glb: "Synth-Tiger-Button-Down.glb" },
  marbloro: { png: "Marbloro.png", glb: "Marlboro-Pattern-5-Button-Down.glb" },
  "forest-stripes": { png: "Forest Stripes.png", glb: "Floral-Tiger-1-Button-Down.glb" },
  "fourth-of-july": { png: "4th Of July.png", glb: "4th-of-July-Button-Down (1).glb" },
  "purple-haze": { png: "Purple Haze.png", glb: "DCUPurpleHazeDarkReverse-Button-Down.glb" },
  "sex-ism": { png: "Sex.Ism.png", glb: "Sexism1-Button-Down.glb" },
  "black-naja": { png: "Black Naja.png", glb: "Black-Naja-Button-Down.glb" },
};

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;

/** Preview cutout: trimmed to the shirt, then centred in a square with the
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

// start clean, so a renamed or removed shirt leaves nothing behind
fs.rmSync(OUT, { recursive: true, force: true });
for (const dir of ["models", "flat"]) fs.mkdirSync(path.join(OUT, dir), { recursive: true });

for (const [slug, { png, glb }] of Object.entries(SHIRTS)) {
  const doc = await io.read(path.join(SRC, glb));
  await doc.transform(
    dedup(),
    // drops the two images no material uses; every vertex attribute is kept
    prune({ keepAttributes: true }),
    textureCompress({ encoder: sharp, targetFormat: "webp", quality: 86, resize: [PRINT_SIZE, PRINT_SIZE] }),
    // positions/normals only: the UVs carry the pattern's scale and stay exact
    quantize({ pattern: /^(POSITION|NORMAL|TANGENT)(_\d+)?$/ }),
  );
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const model = path.join(OUT, "models", `${slug}.glb`);
  await io.write(model, doc);

  const flat = path.join(OUT, "flat", `${slug}.webp`);
  await writeFlat(path.join(SRC, png), flat);
  console.log(`${slug.padEnd(20)} ${png.replace(".png", "").padEnd(20)} model ${kb(model).padStart(8)}  flat ${kb(flat).padStart(7)}`);
}
