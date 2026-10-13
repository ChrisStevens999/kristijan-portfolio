import type { RealWorldPhoto } from "@/content/projects/graphic-tees";

type Photo = RealWorldPhoto;

/** A column never repeats a photo within this many cards. */
const RECENT = 5;

/** Two photos are alike when they show the same garment (`shirt`). */
export const alike = (a: Photo, b: Photo) => a.shirt === b.shirt;

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
 * gallery, generated lazily row by row. One rule above all: no card ever
 * shows the same garment as a card next to it — directly above or below,
 * beside it on the same row, or diagonally in the next column (the
 * columns' staggered glides put those side by side for part of each
 * cycle). Whichever of two neighbours is generated second checks the
 * first, so every pair is checked once.
 *
 * The MIDDLE column deals from shuffled decks of the whole set, so every
 * photo passes through the centre once per deck before any repeats. When
 * the cards left in a deck all clash, the next deck is shuffled in early
 * rather than dealing a clash. The other columns pick at random from
 * whatever fits, avoiding their own recent cards.
 *
 * A clash is only ever dealt when a set has fewer distinct garments than a
 * slot can have neighbours (no collection comes close); checkGallery
 * (scripts/check-gallery-neighbours.mjs) proves the rule holds for the
 * real sets.
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

  /** the garments already placed above / beside / diagonal to this slot */
  private neighbourShirts(col: number, row: number, list: Photo[]) {
    const shirts = new Set<string>();
    if (list[row - 1]) shirts.add(list[row - 1].shirt);
    for (const c of [col - 1, col + 1]) {
      const n = this.rows.get(c);
      for (const r of [row - 1, row, row + 1]) if (n?.[r]) shirts.add(n[r].shirt);
    }
    return shirts;
  }

  private next(col: number, row: number, list: Photo[]): Photo {
    const clash = this.neighbourShirts(col, row, list);
    const fits = (p: Photo) => !clash.has(p.shirt);

    if (col === this.middle) {
      if (this.deck.length === 0) this.deck = shuffle(this.photos, this.random);
      let i = this.deck.findIndex(fits);
      if (i === -1) {
        // nothing left in this deck fits: bring the next deck forward and
        // keep the leftovers in it, so they still get their turn
        this.deck = shuffle([...this.deck, ...this.photos], this.random);
        i = this.deck.findIndex(fits);
      }
      if (i === -1) i = 0; // set too small for the rule (never, with these sets)
      return this.deck.splice(i, 1)[0];
    }

    const recent = new Set<Photo>(list.slice(-RECENT));
    const pick = (pool: Photo[]) => pool[Math.floor(this.random() * pool.length)];
    const fresh = this.photos.filter((p) => fits(p) && !recent.has(p));
    if (fresh.length) return pick(fresh);
    const fitting = this.photos.filter(fits);
    return pick(fitting.length ? fitting : this.photos);
  }
}

/**
 * Every pair of neighbouring slots across `columns` columns and `rows`
 * rows, as the gallery lays them out: above/below, beside, and diagonal
 * into the next column. Used by the check script.
 */
export function neighbourPairs(columns: number, rows: number): [number, number, number, number][] {
  const pairs: [number, number, number, number][] = [];
  for (let c = 0; c < columns; c++) {
    for (let r = 0; r < rows; r++) {
      if (r + 1 < rows) pairs.push([c, r, c, r + 1]);
      if (c + 1 < columns) {
        for (const dr of [-1, 0, 1]) {
          if (r + dr >= 0 && r + dr < rows) pairs.push([c, r, c + 1, r + dr]);
        }
      }
    }
  }
  return pairs;
}
