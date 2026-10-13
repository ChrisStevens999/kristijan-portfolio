/**
 * Proves the "in the real world" gallery's one rule for the real photo
 * sets: no two neighbouring cards ever show the same garment — above,
 * below, beside, or diagonal into the next column.
 *
 * Runs the gallery's own sequencer (gallerySequences.ts) for each
 * collection the way the component drives it — three columns, rows dealt
 * lazily per cycle, column by column — over many cycles and many random
 * seeds, and checks every neighbouring pair. Also reports how evenly the
 * middle column deals the set.
 *
 *   node scripts/check-gallery-neighbours.mjs
 *
 * Exit code 1 on the first clash found.
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

const { Sequences, alike, neighbourPairs } = await import("../src/components/case-studies/graphic-tees/gallerySequences.ts");
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

let failed = false;
for (const collection of apparelCollections) {
  const photos = collection.gallery;
  if (!photos) continue;
  const garments = new Set(photos.map((p) => p.shirt)).size;
  let dealt = new Map();
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
    for (const [c1, r1, c2, r2] of neighbourPairs(COLUMNS, rows)) {
      const a = seq.get(c1, r1);
      const b = seq.get(c2, r2);
      if (alike(a, b)) {
        console.error(`CLASH  ${collection.id}  seed ${seed}  (${c1},${r1}) ${a.shirt}  ~  (${c2},${r2}) ${b.shirt}`);
        failed = true;
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
      `${SEEDS} seeds x ${CYCLES} cycles, no alike neighbours; middle column dealt each photo ${Math.min(...counts)}–${Math.max(...counts)} times`,
  );
}
if (failed) process.exit(1);
console.log("ok");
