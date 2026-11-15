/**
 * Proves the "in the real world" gallery's rules for the real photo sets
 * (the rules themselves are in gallerySequences.ts):
 *
 *  - the same GARMENT never appears twice in a row (any two columns), nor
 *    on the row above/below in any column, nor within two cards in its own
 *    column;
 *  - the same PHOTO never appears within two rows of itself in any column,
 *    so it is never on screen twice.
 *
 * Runs the gallery's own sequencer for each collection the way the
 * component drives it — three columns, rows dealt lazily per cycle, column
 * by column — over many cycles and many random seeds, and checks every
 * pair of slots the rules cover. Also reports how often the preferred
 * three-row photo reach was missed and how evenly the middle column deals
 * the set.
 *
 *   node scripts/check-gallery-neighbours.mjs
 *
 * Exit code 1 if any rule is broken.
 */
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// The content modules are plain TypeScript (Node strips the types) but use
// the app's extensionless and "@/" imports, which Node's resolver doesn't
// know — map them here.
registerHooks({
  resolve(specifier, context, next) {
    let s = specifier;
    if (s.startsWith("@/")) s = pathToFileURL(path.join(root, "src", s.slice(2))).href;
    if ((s.startsWith("./") || s.startsWith("../") || s.startsWith("file:")) && !/\.[a-z]+$/i.test(s)) {
      for (const ext of [".ts", ".tsx"]) {
        try {
          return next(s + ext, context);
        } catch {
          /* try the next extension */
        }
      }
    }
    return next(s, context);
  },
});

const { Sequences, alike, garmentsMustDiffer, photosMustDiffer } = await import(
  "../src/components/case-studies/graphic-tees/gallerySequences.ts"
);
const { apparelCollections } = await import("../src/content/projects/apparel-display.ts");

/** small seeded PRNG so a failure is reproducible */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLUMNS = 3;
const MIDDLE = 1;
const ROWS_PER_CYCLE = 3;
const HALF = 3; // rows either side of the centre row that the window keeps
const CYCLES = 400;
const SEEDS = 50;
const REACH = 3; // how far apart two slots are compared (the preferred photo reach)

let failed = false;
let reported = 0;
const report = (line) => {
  failed = true;
  if (reported++ < 20) console.error(line);
};

for (const collection of apparelCollections) {
  const photos = collection.gallery;
  if (!photos) continue;
  const garments = new Set(photos.map((p) => p.shirt)).size;
  const dealt = new Map();
  let slots = 0;
  let nearMisses = 0; // the same photo three rows apart: allowed, but counted
  for (let seed = 1; seed <= SEEDS; seed++) {
    const seq = new Sequences(photos, MIDDLE, mulberry32(seed));
    // deal exactly as the component does: per cycle, column by column, the
    // rows of that column's window
    for (let cycle = 1; cycle <= CYCLES; cycle++) {
      const centre = cycle * ROWS_PER_CYCLE;
      for (let c = 0; c < COLUMNS; c++) {
        for (let r = centre - HALF; r <= centre + ROWS_PER_CYCLE + HALF; r++) if (r >= 0) seq.get(c, r);
      }
    }
    const rows = (CYCLES + 1) * ROWS_PER_CYCLE + HALF;
    // every pair of slots within reach, each pair once
    for (let c1 = 0; c1 < COLUMNS; c1++) {
      for (let r1 = 0; r1 < rows; r1++) {
        slots++;
        const a = seq.get(c1, r1);
        for (let c2 = c1; c2 < COLUMNS; c2++) {
          for (let r2 = c2 === c1 ? r1 + 1 : Math.max(0, r1 - REACH); r2 <= Math.min(rows - 1, r1 + REACH); r2++) {
            const b = seq.get(c2, r2);
            const dCol = c2 - c1;
            const dRow = r2 - r1;
            if (garmentsMustDiffer(dCol, dRow) && alike(a, b))
              report(`GARMENT  ${collection.id}  seed ${seed}  (${c1},${r1})  ~  (${c2},${r2})  ${a.shirt}`);
            if (a === b) {
              if (photosMustDiffer(dCol, dRow)) report(`PHOTO  ${collection.id}  seed ${seed}  (${c1},${r1})  ~  (${c2},${r2})  ${a.src}`);
              else nearMisses++;
            }
          }
        }
      }
    }
    if (seed === 1) {
      for (let r = 0; r < rows; r++) {
        const p = seq.get(MIDDLE, r);
        dealt.set(p.src, (dealt.get(p.src) ?? 0) + 1);
      }
    }
  }
  const counts = [...dealt.values()];
  console.log(
    `${collection.id.padEnd(14)} ${String(photos.length).padStart(2)} photos of ${String(garments).padStart(2)} garments — ` +
      `${SEEDS} seeds x ${CYCLES} cycles (${slots.toLocaleString("en")} cards): rules hold; ` +
      `same photo three rows apart ${nearMisses} times; ` +
      `middle column dealt each photo ${Math.min(...counts)}–${Math.max(...counts)} times`,
  );
}
if (failed) {
  console.error(reported > 20 ? `… and ${reported - 20} more` : "");
  process.exit(1);
}
console.log("ok");
