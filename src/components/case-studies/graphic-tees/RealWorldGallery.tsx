"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import type { RealWorldPhoto } from "@/content/projects/graphic-tees";

import {
  CARD_ASPECT,
  CARD_HEIGHT,
  COLUMN_STAGGER_S,
  CYCLE_S,
  GUTTER,
  glide,
  MAX_CARD_WIDTH,
  ROWS_PER_CYCLE,
} from "./galleryMotion";
import { Sequences } from "./gallerySequences";
import { Lightbox, type OpenPhoto } from "./Lightbox";

type Photo = RealWorldPhoto;

type Layout = {
  width: number;
  height: number;
  cardW: number;
  cardH: number;
  pitchY: number;
  pitchX: number;
  side: number; // columns each side of the middle one
};

function layoutFor(width: number, height: number): Layout {
  const cardH = Math.min(
    CARD_HEIGHT * height,
    (MAX_CARD_WIDTH * width) / CARD_ASPECT,
  );
  const cardW = cardH * CARD_ASPECT;
  const gutter = (GUTTER / CARD_HEIGHT) * cardH;
  const pitchX = cardW + gutter;
  return {
    width,
    height,
    cardW,
    cardH,
    pitchY: cardH + gutter,
    pitchX,
    // trying 3 columns, like the reference (was: as many as fill the width —
    // Math.max(1, Math.ceil((width / 2 - cardW / 2) / pitchX)))
    side: 1,
  };
}

/** Rows currently on screen (plus one spare each end and the 3 that scroll
 *  in during a cycle), for a column whose centred row is `centre`. */
function rowWindow(centre: number, l: Layout) {
  const half = Math.ceil(l.height / 2 / l.pitchY) + 1;
  const rows: number[] = [];
  for (let r = centre - half; r <= centre + ROWS_PER_CYCLE + half; r++)
    if (r >= 0) rows.push(r);
  return rows;
}

/**
 * "Shirts in the real world": columns of mockup photos gliding upward in
 * the reference clip's rhythm — 3 cards per 4 s, slow-fast-long-settle,
 * staggered left to right — forever, in random order.
 */
export function RealWorldGallery({
  photos,
  reducedMotion,
}: {
  photos: Photo[];
  reducedMotion: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setLayout(layoutFor(el.clientWidth, el.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = layout ? 2 * layout.side + 1 : 0;
  const middle = layout ? layout.side : 0;
  // fresh random sequences whenever the column count (or the set) changes
  // — the no-alike-neighbours rule lives in gallerySequences.ts
  const sequences = useMemo(
    () => new Sequences(photos, middle),
    [photos, middle],
  );

  // Which cycle each column is on. Starts at 1 so the row window never
  // needs negative rows.
  const [cycles, setCycles] = useState<number[]>([]);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // An enlarged photo freezes the gallery exactly where it is; closing it
  // carries on from that same moment. (Ref, so the clock loop reads it
  // without restarting.)
  const [open, setOpen] = useState<OpenPhoto | null>(null);
  const pausedRef = useRef(false);
  // gallery time lives outside the loop effect, so a resize (which rebuilds
  // the loop) continues the motion instead of restarting it
  const elapsedRef = useRef(0);
  useEffect(() => {
    pausedRef.current = open !== null;
  }, [open]);

  useEffect(() => {
    if (!layout) return;
    const el = stageRef.current!;
    let last = performance.now();
    let visible = true;
    let raf = 0;
    const current: number[] = Array.from({ length: columns }, () => 0);
    let first = true; // publish the (re)started cycles on the first frame

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);

    const place = (c: number, position: number) => {
      const node = columnRefs.current[c];
      if (node)
        node.style.transform = `translate3d(0, ${-position * layout.pitchY}px, 0)`;
    };

    const frame = (now: number) => {
      // only advance while on screen; cap the step so a backgrounded tab
      // resumes where it left off instead of jumping
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (visible && !reducedMotion && !pausedRef.current)
        elapsedRef.current += dt;
      const elapsed = elapsedRef.current;
      let changed = first;
      first = false;
      for (let c = 0; c < columns; c++) {
        const local = Math.max(0, elapsed - c * COLUMN_STAGGER_S);
        const cycle = Math.floor(local / CYCLE_S) + 1;
        const t = (local % CYCLE_S) / CYCLE_S;
        place(c, (cycle + glide(t)) * ROWS_PER_CYCLE);
        if (cycle !== current[c]) {
          current[c] = cycle;
          changed = true;
        }
      }
      if (changed) setCycles(current.slice());
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [layout, columns, reducedMotion]);

  const openFrom = (card: HTMLElement, photo: Photo) => {
    const img = card.querySelector("img");
    setOpen({
      photo,
      from: card.getBoundingClientRect(),
      aspect:
        img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.7,
      // already decoded at card size — shown instantly while the sharper copy loads
      placeholder: img?.currentSrc ?? photo.src,
    });
  };

  return (
    <>
      {/* overflow-anchor: cards are added/removed every cycle — never let the
        browser's scroll anchoring pick one and nudge the page */}
      <div
        ref={stageRef}
        className="relative h-full w-full overflow-hidden [overflow-anchor:none]"
      >
        {layout &&
          cycles.length === columns &&
          Array.from({ length: columns }, (_, c) => {
            const left =
              layout.width / 2 -
              layout.cardW / 2 +
              (c - middle) * layout.pitchX;
            const centreRow = cycles[c] * ROWS_PER_CYCLE;
            return (
              <div
                key={c}
                ref={(node) => {
                  columnRefs.current[c] = node;
                }}
                className="absolute top-0 will-change-transform"
                style={{
                  left,
                  width: layout.cardW,
                  transform: `translate3d(0, ${-centreRow * layout.pitchY}px, 0)`,
                }}
              >
                {rowWindow(centreRow, layout).map((row) => {
                  const photo = sequences.get(c, row);
                  return (
                    <button
                      key={row}
                      type="button"
                      aria-label={`Enlarge photo: ${photo.alt}`}
                      onClick={(e) => openFrom(e.currentTarget, photo)}
                      className="absolute left-0 cursor-zoom-in overflow-hidden bg-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid"
                      style={{
                        top:
                          layout.height / 2 -
                          layout.cardH / 2 +
                          row * layout.pitchY,
                        width: layout.cardW,
                        height: layout.cardH,
                        borderRadius: layout.cardH * 0.018,
                      }}
                    >
                      <Image
                        src={photo.src}
                        alt=""
                        fill
                        loading="eager"
                        sizes={`${Math.ceil(layout.cardW)}px`}
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            );
          })}
      </div>
      <Lightbox
        open={open}
        onClose={() => setOpen(null)}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
