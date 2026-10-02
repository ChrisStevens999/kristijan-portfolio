/**
 * Motion measured off the reference clip (Klickpin "coastal mood boards"
 * pin, 544x680 @ 30fps, 4 s loop):
 *
 *  - every column moves UP by exactly 3 card pitches per 4 s cycle,
 *  - with one long glide: slow start, peak speed at ~1.15 s, then a long
 *    deceleration that settles just before the cycle ends,
 *  - columns are staggered left → right by ~2–3 frames (≈0.08 s),
 *  - card ≈ 50.6% of the stage height, 0.724 wide:tall, gutters ≈ 4.6% of
 *    the stage height; the middle column is centred, the outer columns run
 *    off the edges.
 *
 * FRAME_DELTAS is the middle column's per-frame upward shift in source
 * pixels (block-matched frame to frame); its running sum, normalised, is
 * used directly as the easing curve, so the glide matches the video.
 */
const FRAME_DELTAS = [
  0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 6, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 23, 27, 31, 35, 40,
  43, 46, 46, 45, 42, 38, 35, 32, 29, 26, 24, 22, 21, 19, 18, 17, 15, 15, 14, 13, 12, 12, 11, 10, 10, 9, 9, 8, 8, 8,
  7, 7, 7, 6, 6, 6, 6, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0,
];

const CUMULATIVE = (() => {
  const out = [0];
  for (const d of FRAME_DELTAS) out.push(out[out.length - 1] + d);
  const total = out[out.length - 1];
  return out.map((v) => v / total);
})();

/** 0..1 progress of one cycle → 0..1 distance travelled. */
export function glide(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const x = t * (CUMULATIVE.length - 1);
  const i = Math.floor(x);
  return CUMULATIVE[i] + (CUMULATIVE[i + 1] - CUMULATIVE[i]) * (x - i);
}

export const CYCLE_S = 4;
export const ROWS_PER_CYCLE = 3;
export const COLUMN_STAGGER_S = 0.08;
export const CARD_HEIGHT = 0.506; // × stage height
export const CARD_ASPECT = 0.724; // width / height
export const GUTTER = 0.046; // × stage height
/** In the reference the card is 45.8% of the (portrait) stage width — on a
 *  narrow phone the card shrinks to keep that, so the side columns peek in. */
export const MAX_CARD_WIDTH = 0.458; // × stage width
