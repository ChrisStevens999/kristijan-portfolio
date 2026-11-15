import type { RealWorldPhoto } from "@/content/projects/graphic-tees";

type Photo = RealWorldPhoto;

/** A column never repeats a photo within this many cards. */
const RECENT = 5;

/** Two photos are alike when they show the same garment (`shirt`). */
export const alike = (a: Photo, b: Photo) => a.shirt === b.shirt;

/**
 * THE RULES, as distances between two slots (columns apart, rows apart).
 * About three rows of every column are on screen at once, so the rules
 * reach as far as two cards can be seen together.
 *
 * Same GARMENT, never:
 *  - in the same column, within two cards (directly above/below, or with
 *    one card between);
 *  - in ANY other column on the same row or the row above/below it — so a
 *    row never shows a garment twice, edge to edge, and no diagonal does
 *    either (the columns' staggered glides put those side by side).
 */
export const garmentsMustDiffer = (dCol: number, dRow: number) =>
  dCol === 0 ? dRow !== 0 && Math.abs(dRow) <= 2 : Math.abs(dRow) <= 1;
/**
 * Same PHOTO, never within two rows in any column: the very same picture is
 * never on screen twice. (Three rows is preferred and almost always holds;
 * it is not a rule only because the smallest set cannot always afford it.)
 */
export const photosMustDiffer = (dCol: number, dRow: number) => (dCol !== 0 || dRow !== 0) && Math.abs(dRow) <= 2;
const PHOTO_REACH = 2;
const PHOTO_PREFERRED_REACH = 3;

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Endless, random photo sequences per column of the "in the real world"
 * gallery, generated lazily row by row, under the rules above. Whichever of
 * two slots is generated second checks the first, so every pair is checked
 * once, whatever order the columns are dealt in.
 *
 * The MIDDLE column deals from shuffled decks of the whole set, so every
 * photo passes through the centre once per deck before any repeats. When
 * the cards left in a deck all break a rule, the next deck is shuffled in
 * early rather than dealing one that does. The other columns pick at random
 * from whatever fits, avoiding their own recent cards.
 *
 * A slot can have up to eight garments ruled out around it, and the
 * smallest set has eleven, so something always fits;
 * scripts/check-gallery-neighbours.mjs proves the rules hold for the real
 * sets over many thousands of rows.
 */
export class Sequences {
  private rows = new Map<number, Photo[]>(); // column -> photo per row
  private deck: Photo[] = [];
  private photos: Photo[];
  private middle: number;
  private random: () => number;

  // plain assignments rather than parameter properties, so Node can run
  // this file with its types stripped (the check script)
  constructor(photos: Photo[], middle: number, random: () => number = Math.random) {
    this.photos = photos;
    this.middle = middle;
    this.random = random;
  }

  get(col: number, row: number): Photo {
    let list = this.rows.get(col);
    if (!list) this.rows.set(col, (list = []));
    while (list.length <= row) list.push(this.next(col, list.length, list));
    return list[row];
  }

  /** What the cards already placed around this slot rule out. */
  private around(col: number, row: number) {
    const garments = new Set<string>(); // ruled out by the garment rule
    const near = new Set<Photo>(); // ruled out by the photo rule
    const far = new Set<Photo>(); // better avoided (the preferred reach)
    for (const [c, list] of this.rows) {
      for (let dRow = -PHOTO_PREFERRED_REACH; dRow <= PHOTO_PREFERRED_REACH; dRow++) {
        const p = list[row + dRow];
        if (!p || (c === col && dRow === 0)) continue;
        if (garmentsMustDiffer(c - col, dRow)) garments.add(p.shirt);
        if (Math.abs(dRow) <= PHOTO_REACH) near.add(p);
        far.add(p);
      }
    }
    return { garments, near, far };
  }

  private next(col: number, row: number, list: Photo[]): Photo {
    const { garments, near, far } = this.around(col, row);
    const recent = new Set<Photo>(list.slice(-RECENT));
    // strictest first; the first two tiers keep every rule, the third only
    // when a set is too small for the photo rule (never, with these sets)
    const tiers: ((p: Photo) => boolean)[] = [
      (p) => !garments.has(p.shirt) && !far.has(p) && !recent.has(p),
      (p) => !garments.has(p.shirt) && !near.has(p),
      (p) => !garments.has(p.shirt),
    ];

    if (col === this.middle) {
      if (this.deck.length === 0) this.deck = shuffle(this.photos, this.random);
      let i = this.deck.findIndex(tiers[0]);
      if (i === -1) {
        // nothing left in this deck fits: bring the next deck forward and
        // keep the leftovers in it, so they still get their turn
        this.deck = shuffle([...this.deck, ...this.photos], this.random);
        for (const fits of tiers) {
          i = this.deck.findIndex(fits);
          if (i !== -1) break;
        }
      }
      if (i === -1) i = 0; // set too small for the rules (never, with these sets)
      return this.deck.splice(i, 1)[0];
    }

    const pick = (pool: Photo[]) => pool[Math.floor(this.random() * pool.length)];
    for (const fits of tiers) {
      const pool = this.photos.filter(fits);
      if (pool.length) return pick(pool);
    }
    return pick(this.photos);
  }
}
