/**
 * Turns the case-study films' source masters into what the pages ship.
 *
 * The masters (assets/projects/<project>/films/) are the files as exported:
 * the LXIX intro is 5504x3072 H.264 at ~57 Mb/s (31 MB for 4.5 s, above
 * what many phone decoders accept), and the two BoyzClub films are 4K HEVC
 * — one 10-bit — which Firefox and many Windows browsers can't play at all,
 * with an audio track the muted panels never use. The web copies:
 *
 *  - H.264 High, yuv420p, 1920 wide (the panels are at most a screen wide),
 *    frame rate kept as authored, no audio, index at the front (faststart);
 *  - a first-frame poster (WebP) beside the LXIX intro, shown until the
 *    video paints (the BoyzClub films open on black, so need none).
 *
 *   node scripts/build-case-study-films.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = 1920;

/** master (under assets/) -> web copy (under public/, no extension), with a poster? */
const FILMS = [
  ["assets/projects/lxix/films/intro-animation.mp4", "public/lxix/intro-animation", true],
  ["assets/projects/boyzclub/films/drop-film.mp4", "public/boyzclub/drop-film", false],
  ["assets/projects/boyzclub/films/break-film.mp4", "public/boyzclub/break-film", false],
];

const run = (args) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const mb = (f) => `${(fs.statSync(f).size / 1048576).toFixed(2)} MB`;

for (const [master, out, withPoster] of FILMS) {
  const src = path.join(root, master);
  const video = path.join(root, `${out}.mp4`);
  run([
    "-i", src,
    "-an",
    "-vf", `scale=${WIDTH}:-2:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high",
    "-movflags", "+faststart",
    video,
  ]);
  let line = `${path.basename(video).padEnd(22)} ${mb(src).padStart(9)} -> ${mb(video).padStart(8)}`;
  if (withPoster) {
    const poster = path.join(root, `${out}-poster.webp`);
    run(["-i", src, "-frames:v", "1", "-vf", `scale=${WIDTH}:-2:flags=lanczos`, "-quality", "85", poster]);
    line += `   poster ${mb(poster)}`;
  }
  console.log(line);
}
