/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node build script, not part of the app bundle */
/**
 * Shrinks the site's source images IN PLACE (same file names, so no import
 * or URL changes) without changing anything a visitor can see:
 *
 *  - Every `assets/` image that src/ imports is copied by Next into the
 *    build at its ORIGINAL size, but Next never serves wider than 3840px
 *    (its largest configured size). Anything wider is downscaled to 3840
 *    wide; everything is re-compressed losslessly (PNG level 9) and the
 *    colour profile is kept. A file is only replaced if the result is
 *    at least 5% smaller.
 *  - public/tag-designs-hero/*: served through the optimizer at 828px, so
 *    the source is capped at 1200px wide.
 *  - public/textures/metal-*.jpg: only ever read back at 828px by the
 *    optimizer; capped at 1656px wide, JPEG q92.
 *
 * Originals should be backed up first (see the commit message / README of
 * the run); git history also keeps them.
 *
 *   node scripts/optimize-site-images.js          # apply
 *   node scripts/optimize-site-images.js --dry    # report only
 */
const fs = require("fs");
const path = require("path");
const sharp = require(path.join(__dirname, "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp"));

const root = path.join(__dirname, "..");
const DRY = process.argv.includes("--dry");
const MAX_SERVED = 3840;

const walk = (d, o = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, o) : o.push(p);
  }
  return o;
};

// --- what to process -------------------------------------------------------
const srcText = walk(path.join(root, "src"))
  .filter((f) => /\.(tsx?|css)$/.test(f))
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");

/** @type {Map<string, {maxWidth:number, jpegQuality?:number}>} */
const jobs = new Map();
for (const m of srcText.matchAll(/from\s+"((?:\.\.\/)+assets\/[^"]+)"/g)) {
  const p = path.join(root, m[1].replace(/^(\.\.\/)+/, ""));
  if (fs.existsSync(p) && /\.(png|jpe?g)$/i.test(p)) jobs.set(p, { maxWidth: MAX_SERVED, jpegQuality: 92 });
}
for (const f of walk(path.join(root, "public/tag-designs-hero"))) {
  if (/\.png$/i.test(f)) jobs.set(f, { maxWidth: 1200 });
}
for (const name of ["metal-scratches.jpg", "metal-zinc.jpg"]) {
  jobs.set(path.join(root, "public/textures", name), { maxWidth: 1656, jpegQuality: 92 });
}

(async () => {
  let before = 0;
  let after = 0;
  let changed = 0;
  for (const [file, { maxWidth, jpegQuality }] of jobs) {
    const orig = fs.readFileSync(file);
    before += orig.length;
    const meta = await sharp(orig).metadata();
    let pipeline = sharp(orig).keepIccProfile();
    if (meta.width > maxWidth) pipeline = pipeline.resize({ width: maxWidth });
    const isPng = /\.png$/i.test(file);
    const out = isPng
      ? await pipeline.png({ compressionLevel: 9, effort: 10 }).toBuffer()
      : await pipeline.jpeg({ quality: jpegQuality ?? 92, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();
    if (out.length < orig.length * 0.95) {
      after += out.length;
      changed++;
      if (!DRY) fs.writeFileSync(file, out);
    } else {
      after += orig.length;
    }
  }
  const mb = (n) => (n / 1048576).toFixed(0);
  console.log(
    `${DRY ? "[dry run] " : ""}${jobs.size} files, ${changed} ${DRY ? "would change" : "rewritten"}: ${mb(before)} MB -> ${mb(after)} MB (saves ${mb(before - after)} MB)`,
  );
})();
