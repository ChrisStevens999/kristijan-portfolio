/**
 * Turns the supplied retro TV (assets/projects/skateboarding/tv/, from
 * retro-tv-website-export.zip) into what the Skateboard Designs page ships.
 *
 * The master tv.glb is one 12.5k-vertex mesh with ~10 MB of PNG textures (a
 * 4096² base colour with the stickers baked in, 2048² normal and
 * metal/roughness) plus a "Screen" material whose JPEG frame stands in until
 * the screen clip plays. The web copies:
 *
 *  - public/skateboarding/tv/tv.glb — textures as WebP (base colour kept at
 *    4096² for the sticker detail, q90), positions/normals quantized,
 *    meshopt-compressed; UVs exact.
 *  - public/skateboarding/tv/screen.mp4 — the 4 s channel clip (the
 *    campaign photographs with the channel logo), H.264, no audio,
 *    faststart, so it streams as soon as it's asked for.
 *
 *   node scripts/build-tv-assets.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, prune, quantize, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

import { sharp } from "./lib/assets.mjs";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "assets/projects/skateboarding/tv");
const OUT = path.join(root, "public/skateboarding/tv");
const mb = (f) => `${(fs.statSync(f).size / 1048576).toFixed(2)} MB`;

fs.mkdirSync(OUT, { recursive: true });

// --- the model -------------------------------------------------------------------
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const doc = await io.read(path.join(SRC, "tv.glb"));
await doc.transform(
  dedup(),
  prune({ keepAttributes: true }),
  // every texture as WebP at its authored size; the screen's stand-in frame too
  textureCompress({ encoder: sharp, targetFormat: "webp", quality: 90 }),
  // positions/normals only: the UVs carry the stickers and stay exact
  quantize({ pattern: /^(POSITION|NORMAL|TANGENT)(_\d+)?$/ }),
);
doc
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
const model = path.join(OUT, "tv.glb");
await io.write(model, doc);
console.log(`tv.glb       ${mb(path.join(SRC, "tv.glb")).padStart(9)} -> ${mb(model)}`);

// --- the screen clip ---------------------------------------------------------------
const run = (args) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const clip = path.join(OUT, "screen.mp4");
run([
  "-i", path.join(SRC, "screen.mp4"),
  "-an",
  "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  clip,
]);
console.log(`screen.mp4   ${mb(path.join(SRC, "screen.mp4")).padStart(9)} -> ${mb(clip)}`);

