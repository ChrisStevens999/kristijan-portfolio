/**
 * Builds a brand's logofolio film from its stills: ten frames cut quickly
 * together in the order of the brand's sequence-preview.webp, the way the
 * supplied reference clip is cut — hard cuts, no dissolves, no drift, no
 * fades. Every still is up for 8 frames and the two logo frames for 13,
 * which is 90 frames: exactly 3 s at 30 fps, looping cleanly.
 *
 *  - public/<brand>/<brand>-animation.mp4        — H.264 1920x1080 30 fps, faststart
 *  - public/<brand>/<brand>-animation-poster.webp — the first still
 *
 * With --dissolve the same stills are cut slowly instead (0.7 s holds,
 * 1.1 s on the logos, 0.3 s dissolves, a 4% push-in/pull-out per still,
 * fades in and out), written as <brand>-animation-dissolve.mp4 — kept as
 * an alternative, not what the site uses.
 *
 *   node scripts/build-logofolio-video.mjs mono
 *   node scripts/build-logofolio-video.mjs boyzclub --dissolve
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const FPS = 30;
const W = 1920, H = 1080;

// Default cut: hard cuts, counted in frames.
const STILL_FRAMES = 8;
const LOGO_FRAMES = 13; // 8 x 8 + 2 x 13 = 90 frames = 3 s

// --dissolve cut, in seconds.
const FADE = 0.3;       // dissolve length
const HOLD = 0.7;       // on-screen time per still
const LOGO_HOLD = 1.1;  // the logo frames linger a little longer
const ZOOM = 0.04;      // 4% drift over a still's hold

// A `true` second element marks the two logo frames, which hold longer in both cuts.
const BRANDS = {
  mono: {
    src: "assets/projects/mono",
    fadeIn: "black", fadeOut: "white",
    stills: [
      ["01-logo-black.png", true],
      ["02-dropper-bottle.webp"],
      ["03-type-collage.webp"],
      ["04-pouch.png"],
      ["05-bag.webp"],
      ["06-jar-dark.png"],
      ["07-jar-aloe.webp"],
      ["08-glitch-bottle.webp"],
      ["09-portrait.webp"],
      ["10-logo-white.png", true],
    ],
  },
  boyzclub: {
    src: "assets/projects/boyzclub/logofolio",
    fadeIn: "white", fadeOut: "black",
    stills: [
      ["01-logo-white.png", true],
      ["02-car.webp"],
      ["03-cap.webp"],
      ["04-jacket-back.webp"],
      ["05-hoodie.webp"],
      ["06-bzc-mark.webp"],
      ["07-balaclava.webp"],
      ["08-glasses.webp"],
      ["09-statue.webp"],
      ["10-logo-black.png", true],
    ],
  },
  rc: {
    src: "assets/projects/rc",
    fadeIn: "white", fadeOut: "black",
    stills: [
      ["01-logo-white.png", true],
      ["02-dark-smear.webp"],
      ["03-bucket-pour.png"],
      ["04-excavator-cab.webp"],
      ["05-quarry-blur.webp"],
      ["06-inverted-site.webp"],
      ["07-controller.webp"],
      ["08-excavator-black.png"],
      ["09-loader.webp"],
      ["10-logo-black.png", true],
    ],
  },
  lxix: {
    src: "assets/projects/lxix/logofolio",
    fadeIn: "black", fadeOut: "white",
    stills: [
      ["01-logo-black.png", true],
      ["02-glasses-mark.webp"],
      ["03-droplets.webp"],
      ["04-ink-mark.webp"],
      ["05-sign.webp"],
      ["06-lips-bottle.webp"],
      ["07-cuff-watch.webp"],
      ["08-newspaper-type.webp"],
      ["09-hands-visor.webp"],
      ["10-logo-white.png", true],
    ],
  },
  warrior: {
    src: "assets/projects/warrior",
    fadeIn: "white", fadeOut: "black",
    stills: [
      ["01-logo-white.png", true],
      ["02-balaclava-phone.webp"],
      ["03-night-vision.webp"],
      ["04-helmet.webp"],
      ["05-car-door.webp"],
      ["06-soldier-hex.webp"],
      ["07-sniper-back.webp"],
      ["08-truck-trio.webp"],
      ["09-masked-grass.webp"],
      ["10-logo-black.png", true],
    ],
  },
};

const DISSOLVE = process.argv.includes("--dissolve");
const name = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
const brand = BRANDS[name];
if (!brand) {
  console.error(`usage: node scripts/build-logofolio-video.mjs <${Object.keys(BRANDS).join("|")}> [--dissolve]`);
  process.exit(1);
}
const SRC = path.join(root, brand.src);
const OUT = path.join(root, "public", name);
const stills = brand.stills.map(([file, logo = false]) => ({ file: path.join(SRC, file), logo }));

fs.mkdirSync(OUT, { recursive: true });
const run = (args) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const mb = (f) => `${(fs.statSync(f).size / 1048576).toFixed(2)} MB`;

const inputs = [];
const chains = [];
let total;

if (!DISSOLVE) {
  stills.forEach(({ file, logo }, i) => {
    const frames = logo ? LOGO_FRAMES : STILL_FRAMES;
    inputs.push("-loop", "1", "-framerate", String(FPS), "-t", (frames / FPS).toFixed(4), "-i", file);
    chains.push(`[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},setsar=1,fps=${FPS},format=yuv420p[v${i}]`);
  });
  chains.push(`${stills.map((_, i) => `[v${i}]`).join("")}concat=n=${stills.length}:v=1:a=0[out]`);
  total = stills.reduce((t, { logo }) => t + (logo ? LOGO_FRAMES : STILL_FRAMES), 0) / FPS;
} else {
  stills.forEach(({ file, logo }, i) => {
    const hold = logo ? LOGO_HOLD : HOLD;
    // Every still but the last also has to cover the dissolve into the next one.
    const dur = hold + (i < stills.length - 1 ? FADE : 0);
    inputs.push("-loop", "1", "-framerate", String(FPS), "-t", dur.toFixed(3), "-i", file);
    const frames = Math.round(dur * FPS);
    // Zoom over the still's frames: 1 -> 1+ZOOM (push in) or 1+ZOOM -> 1 (pull out),
    // as a zoompan over a 2x upscale so the sub-pixel drift stays smooth.
    const z = i % 2 === 0 ? `1+${ZOOM}*in/${frames}` : `1+${ZOOM}-${ZOOM}*in/${frames}`;
    chains.push(
      `[${i}:v]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase:flags=lanczos,` +
      `crop=${W * 2}:${H * 2},setsar=1,` +
      `zoompan=z='${z}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},` +
      `format=yuv420p[v${i}]`
    );
  });
  // Chain the dissolves: each xfade starts FADE seconds before the previous clip ends.
  let prev = "v0";
  let elapsed = (stills[0].logo ? LOGO_HOLD : HOLD) + FADE;
  stills.slice(1).forEach(({ logo }, j) => {
    const i = j + 1;
    const offset = elapsed - FADE;
    const out = i === stills.length - 1 ? "film" : `x${i}`;
    chains.push(`[${prev}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}[${out}]`);
    prev = out;
    elapsed = offset + (logo ? LOGO_HOLD : HOLD) + FADE;
  });
  total = elapsed - FADE;
  chains.push(`[film]fade=t=in:st=0:d=0.3:color=${brand.fadeIn},fade=t=out:st=${(total - 0.3).toFixed(3)}:d=0.3:color=${brand.fadeOut}[out]`);
}

const video = path.join(OUT, `${name}-animation${DISSOLVE ? "-dissolve" : ""}.mp4`);
run([
  ...inputs,
  "-filter_complex", chains.join(";"),
  "-map", "[out]",
  "-t", total.toFixed(3),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  video,
]);
console.log(`${path.basename(video).padEnd(32)} ${mb(video)}  (${total.toFixed(1)} s)`);

if (!DISSOLVE) {
  const poster = path.join(OUT, `${name}-animation-poster.webp`);
  run(["-i", stills[0].file, "-frames:v", "1", "-vf", `scale=${W}:${H}`, "-quality", "85", poster]);
  console.log(`${path.basename(poster).padEnd(32)} ${mb(poster)}`);
}
