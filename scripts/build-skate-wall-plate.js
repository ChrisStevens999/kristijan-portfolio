/**
 * Builds the clean skate-shop WALL PLATE used behind the interactive decks
 * (src/components/case-studies/skateboard-designs/DeckWall.tsx) from the
 * approved flattened mock-up, `assets/projects/skateboarding/Cover 1.png`.
 *
 * The mock-up has everything baked in — six decks, the heading, the labels,
 * a hover cursor and the footer strip. The live page draws all of those
 * itself, so they're removed here and only the real wall, its overhead
 * spotlights and the two steel rails are kept:
 *
 *  - Everything outside the two boxes below is the mock-up, pixel for pixel
 *    (the whole lit top of the wall, the rail ends, the vignette).
 *  - Inside a box the wall is re-synthesised: LOW frequencies (lighting)
 *    are carried in from the box's own borders, so brightness and colour
 *    are continuous with the untouched wall around it; HIGH frequencies
 *    (the concrete's tooth) are lifted from the clean wall margin left of
 *    the rails and mirrored across.
 *  - The rails are rebuilt across the deck box from their own clean
 *    cross-section (sampled where no deck or screw sits), then the
 *    mock-up's own screw head is stamped once per gap between decks.
 *  - The footer strip is cropped off (the page has its own).
 *
 * Re-run after replacing Cover 1.png:   node scripts/build-skate-wall-plate.js
 */
/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node build script, not part of the app bundle */
const path = require("path");
const sharp = require(path.join(__dirname, "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp"));

const SRC = path.join(__dirname, "../assets/projects/skateboarding/Cover 1.png");
const OUT = path.join(__dirname, "../assets/projects/skateboarding/wall-plate.jpg");

// All coordinates are in the 3840x2160 mock-up.
const DECK_BOX = { x1: 384, x2: 3466, y1: 338, y2: 1996 }; // decks + gaps + labels + cursor
const HEADING_BOX = { x1: 1180, x2: 2660, y1: 78, y2: 294 };
const TEXTURE_SRC = { x1: 14, x2: 262 }; // clean wall, left of the rails
const RAILS = [693, 1440]; // top edge of each rail
const RAIL_BAND = { above: 6, below: 100 }; // rows rebuilt around a rail (bar + its shadow)
const RAIL_SAMPLE_X = [352, 376]; // clean rail columns: past the end screw, before deck 1
const SCREW = { x: 321, dy: 32, r: 22 }; // the mock-up's end screw: centre x, centre below rail top, patch radius
const CROP_BOTTOM = 2036; // just above the footer rule

/** Deck centres on the live page: equal pitch, fitted to the mock-up's six (must match DeckWall's DECK_X). */
const DECK_CENTRE_0 = 664;
const DECK_PITCH = 513.4;

(async () => {
  const { data: src, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const out = Buffer.from(src);
  const at = (x, y) => (y * W + x) * 3;
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

  /** Mean colour of a small window of the ORIGINAL image. */
  const mean = (cx, cy, rx, ry) => {
    const acc = [0, 0, 0];
    let n = 0;
    for (let y = Math.max(0, cy - ry); y <= Math.min(H - 1, cy + ry); y++)
      for (let x = Math.max(0, cx - rx); x <= Math.min(W - 1, cx + rx); x++) {
        const i = at(x, y);
        acc[0] += src[i];
        acc[1] += src[i + 1];
        acc[2] += src[i + 2];
        n++;
      }
    return acc.map((v) => v / n);
  };

  // High-frequency concrete detail, as a RATIO (margin pixel / its own local
  // mean): texture is a property of the surface, so it must scale with the
  // light falling on it — added flat, it vanished under the spotlights.
  const texW = TEXTURE_SRC.x2 - TEXTURE_SRC.x1 + 1;
  const texCache = new Map();
  const texMeanRow = (y) => {
    // local mean per texture column for this row (box ~ 31x31), cached per row
    if (texCache.has(y)) return texCache.get(y);
    const row = new Array(texW);
    for (let i = 0; i < texW; i++) row[i] = mean(TEXTURE_SRC.x1 + i, y, 15, 15);
    if (texCache.size > 4) texCache.delete(texCache.keys().next().value);
    texCache.set(y, row);
    return row;
  };
  const detail = (x, y) => {
    const p = ((x % (2 * texW)) + 2 * texW) % (2 * texW);
    const i = p < texW ? p : 2 * texW - 1 - p; // ping-pong, so tiles never seam
    const o = at(TEXTURE_SRC.x1 + i, y);
    const m = texMeanRow(y)[i];
    const ratio = (v, mv) => Math.min(2.4, Math.max(0.35, (v + 2) / (mv + 2)));
    return [ratio(src[o], m[0]), ratio(src[o + 1], m[1]), ratio(src[o + 2], m[2])];
  };

  const synth = ({ x1, x2, y1, y2 }) => {
    const w = x2 - x1;
    const h = y2 - y1;
    // Border lighting profiles, blurred along the border, sampled just outside the box.
    const T = [];
    const B = [];
    for (let x = x1; x <= x2; x++) {
      T.push(mean(x, y1 - 8, 40, 5));
      B.push(mean(x, y2 + 8, 40, 5));
    }
    const L = [];
    const R = [];
    for (let y = y1; y <= y2; y++) {
      L.push(mean(x1 - 8, y, 5, 40));
      R.push(mean(x2 + 8, y, 5, 40));
    }
    for (let y = y1; y <= y2; y++) {
      const v = (y - y1) / h;
      const wt = (1 - v) ** 5; // the ceiling lights die away quickly down the wall
      const wb = v ** 3;
      for (let x = x1; x <= x2; x++) {
        const u = (x - x1) / w;
        const d = detail(x, y);
        const o = at(x, y);
        for (let c = 0; c < 3; c++) {
          const base = L[y - y1][c] * (1 - u) + R[y - y1][c] * u;
          const baseTop = L[0][c] * (1 - u) + R[0][c] * u;
          const baseBottom = L[h][c] * (1 - u) + R[h][c] * u;
          const low = base + (T[x - x1][c] - baseTop) * wt + (B[x - x1][c] - baseBottom) * wb;
          out[o + c] = clamp(low * d[c]);
        }
      }
    }
  };

  synth(HEADING_BOX);
  synth(DECK_BOX);

  // Rails: rebuild across the deck box from their own clean cross-section.
  for (const top of RAILS) {
    const rows = [];
    for (let y = top - RAIL_BAND.above; y <= top + RAIL_BAND.below; y++) {
      const cx = Math.round((RAIL_SAMPLE_X[0] + RAIL_SAMPLE_X[1]) / 2);
      rows.push(mean(cx, y, Math.round((RAIL_SAMPLE_X[1] - RAIL_SAMPLE_X[0]) / 2), 0));
    }
    // how the band sits against the wall beside it, so the shadow can be re-applied as a ratio
    for (let y = top - RAIL_BAND.above; y <= top + RAIL_BAND.below; y++) {
      const k = y - (top - RAIL_BAND.above);
      const isBar = y >= top - 1 && y <= top + 63;
      const fade = y > top + 63 ? Math.max(0, 1 - (y - (top + 63)) / (RAIL_BAND.below - 63)) : 1;
      for (let x = DECK_BOX.x1; x <= DECK_BOX.x2; x++) {
        const o = at(x, y);
        const d = detail(x, y);
        for (let c = 0; c < 3; c++) {
          if (isBar) {
            out[o + c] = clamp(rows[k][c] * (1 + (d[c] - 1) * 0.3));
          } else {
            // shadow / top lip: blend the sampled band over the synthesised wall
            out[o + c] = clamp(out[o + c] * (1 - fade) + rows[k][c] * (1 + (d[c] - 1) * 0.6) * fade);
          }
        }
      }
    }
    // One screw per gap between decks, stamped from the mock-up's own.
    for (let g = 0; g < 5; g++) {
      const gx = Math.round(DECK_CENTRE_0 + DECK_PITCH * (g + 0.5));
      for (let dy = -SCREW.r; dy <= SCREW.r; dy++)
        for (let dx = -SCREW.r; dx <= SCREW.r; dx++) {
          const dist = Math.hypot(dx, dy);
          if (dist > SCREW.r) continue;
          const a = Math.min(1, (SCREW.r - dist) / 6); // soft rim
          // the mock-up's end screw sits on the FIRST rail; reuse it for both
          const s = at(SCREW.x + dx, RAILS[0] + SCREW.dy + dy);
          const o = at(gx + dx, top + SCREW.dy + dy);
          for (let c = 0; c < 3; c++) out[o + c] = clamp(out[o + c] * (1 - a) + src[s + c] * a);
        }
    }
  }

  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .extract({ left: 0, top: 0, width: W, height: CROP_BOTTOM })
    .resize({ width: 3200 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(OUT);
  console.log("wrote", OUT);
})();
