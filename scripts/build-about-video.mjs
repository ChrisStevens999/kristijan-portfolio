/**
 * Turns the About stop's source clip (assets/about/Animation.mp4) into what
 * the homepage ships.
 *
 * The source is a 3.3 s loop exported at 2160x2798 at ~18 Mb/s with its
 * index at the END of the file — a browser would have to download all of
 * it before showing a frame. The web copy:
 *
 *  - public/about/web-animation.mp4 — H.264, 1080 wide (the stop shows it
 *    at ~30% of the screen), frame rate kept as authored, index moved to
 *    the front (faststart), the silent audio track dropped;
 *  - public/about/web-animation-poster.webp — the first frame, shown while
 *    the clip loads.
 *
 *   node scripts/build-about-video.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "assets/about/Animation.mp4");
const OUT = path.join(root, "public/about");
const WIDTH = 1080;

fs.mkdirSync(OUT, { recursive: true });
const run = (args) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const mb = (f) => `${(fs.statSync(f).size / 1048576).toFixed(2)} MB`;

const video = path.join(OUT, "web-animation.mp4");
run([
  "-i", SRC,
  "-an",
  "-vf", `scale=${WIDTH}:-2`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  video,
]);
console.log(`web-animation.mp4         ${mb(video)}`);

const poster = path.join(OUT, "web-animation-poster.webp");
run(["-i", SRC, "-frames:v", "1", "-vf", `scale=${WIDTH}:-2`, "-quality", "85", poster]);
console.log(`web-animation-poster.webp ${mb(poster)}`);
