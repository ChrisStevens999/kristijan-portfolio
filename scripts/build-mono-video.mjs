/**
 * Builds the mono (cosmetics and skincare) brand film from the ten stills in
 * assets/projects/mono, in the order of sequence-preview.webp:
 *
 *   logo on black, dropper bottle, type collage, pouch, bag, jar in the dark,
 *   jar on aloe, glitch bottle, portrait, logo on white.
 *
 * Each still holds for well under a second with a slight push-in (odd frames) or
 * pull-out (even frames) of about 6%, and dissolves into the next. The
 * motion is a zoompan over a 2x upscale (so the sub-pixel drift stays
 * smooth), sampled straight to 1080p at 30 fps.
 *
 *  - public/mono/mono-animation.mp4        — H.264 1920x1080 30 fps, faststart
 *  - public/mono/mono-animation-poster.webp — first frame
 *
 *   node scripts/build-mono-video.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "assets/projects/mono");
const OUT = path.join(root, "public/mono");

const FPS = 30;
const W = 1920, H = 1080;
const FADE = 0.3;       // dissolve length, seconds
const HOLD = 0.7;       // on-screen time per still, seconds
const LOGO_HOLD = 1.1;  // the two logo frames linger a little longer
const ZOOM = 0.04;      // 4% drift over a still's hold

const stills = [
  ["01-logo-black.png", LOGO_HOLD],
  ["02-dropper-bottle.webp", HOLD],
  ["03-type-collage.webp", HOLD],
  ["04-pouch.png", HOLD],
  ["05-bag.webp", HOLD],
  ["06-jar-dark.png", HOLD],
  ["07-jar-aloe.webp", HOLD],
  ["08-glitch-bottle.webp", HOLD],
  ["09-portrait.webp", HOLD],
  ["10-logo-white.png", LOGO_HOLD],
];

fs.mkdirSync(OUT, { recursive: true });
const run = (args) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const mb = (f) => `${(fs.statSync(f).size / 1048576).toFixed(2)} MB`;

const inputs = [];
const chains = [];
stills.forEach(([file, hold], i) => {
  // Every still but the last also has to cover the dissolve into the next one.
  const dur = hold + (i < stills.length - 1 ? FADE : 0);
  inputs.push("-loop", "1", "-framerate", String(FPS), "-t", dur.toFixed(3), "-i", path.join(SRC, file));
  const zoomIn = i % 2 === 0;
  const frames = Math.round(dur * FPS);
  // Zoom over the still's frames: 1 -> 1+ZOOM (push in) or 1+ZOOM -> 1 (pull out).
  const z = zoomIn ? `1+${ZOOM}*in/${frames}` : `1+${ZOOM}-${ZOOM}*in/${frames}`;
  chains.push(
    `[${i}:v]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase:flags=lanczos,` +
    `crop=${W * 2}:${H * 2},setsar=1,` +
    `zoompan=z='${z}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},` +
    `format=yuv420p[v${i}]`
  );
});

// Chain the dissolves: each xfade starts FADE seconds before the previous clip ends.
let prev = "v0";
let elapsed = stills[0][1] + FADE;
stills.slice(1).forEach(([, hold], j) => {
  const i = j + 1;
  const offset = elapsed - FADE;
  const out = i === stills.length - 1 ? "film" : `x${i}`;
  chains.push(`[${prev}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}[${out}]`);
  prev = out;
  elapsed = offset + hold + FADE;
});
const total = elapsed - FADE;
chains.push(`[film]fade=t=in:st=0:d=0.3:color=black,fade=t=out:st=${(total - 0.3).toFixed(3)}:d=0.3:color=white[out]`);

const video = path.join(OUT, "mono-animation.mp4");
run([
  ...inputs,
  "-filter_complex", chains.join(";"),
  "-map", "[out]",
  "-t", total.toFixed(3),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  video,
]);
console.log(`mono-animation.mp4         ${mb(video)}  (${total.toFixed(1)} s)`);

const poster = path.join(OUT, "mono-animation-poster.webp");
run(["-i", path.join(SRC, stills[0][0]), "-frames:v", "1", "-vf", `scale=${W}:${H}`, "-quality", "85", poster]);
console.log(`mono-animation-poster.webp ${mb(poster)}`);
