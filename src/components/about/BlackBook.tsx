"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

import { BOOK_LEAVES, BOOK_PAGE_ASPECT, type BookFace } from "@/content/about-book";

/**
 * The little black book. It lies closed on the dark page, its cover saying
 * "click to open"; a click opens it and each further click (or the arrows,
 * the arrow keys, a swipe) turns a page, the leaf lifting over the spine in
 * real depth, until the book closes on its back cover, which offers the way
 * back to the front.
 *
 * How it is built: every leaf of the book is one box, hinged on the spine
 * (its left edge), with a page image on each face. Turning a leaf is a
 * rotation about that hinge. Each leaf sits a hair deeper than the one
 * before it, applied AFTER the rotation, so the stack sorts itself in 3D on
 * both sides of the spine: unturned, the earlier leaf is on top; turned, the
 * later one is — with no z-index bookkeeping while several leaves move.
 *
 * Wide screens show the open book as a two-page spread. Phones show one
 * page at a time, large enough to read: within a spread the book slides
 * from the left page to the right, and from a right page the leaf turns.
 */

const LAST = BOOK_LEAVES.length; // leaves turned once the book is closed on its back
const TURN_S = 0.95;
const EASE = [0.3, 0.05, 0.2, 1] as const;
/** depth between leaves, px */
const LEAF_GAP = 1;
/** the closed book lies a little askew */
const TILT_DEG = 3;
const PERSPECTIVE = 2600;
/** a drag shorter than this is a click; a longer sideways one is a swipe */
const CLICK_SLOP = 8;
const SWIPE = 44;

type Place = {
  /** how many leaves are turned: 0 = closed (front), LAST = closed (back) */
  turned: number;
  /** phones: which page of the open spread is in view */
  side: -1 | 1;
};

type Size = { pageW: number; pageH: number; single: boolean };

function measure(width: number, height: number): Size {
  const single = width < 768;
  const pageH = single
    ? Math.min(height * 0.72, (width * 0.86) / BOOK_PAGE_ASPECT)
    : Math.min(height * 0.8, (width * 0.9) / 2 / BOOK_PAGE_ASPECT);
  return { pageW: pageH * BOOK_PAGE_ASPECT, pageH, single };
}

const forward = ({ turned, side }: Place, single: boolean): Place => {
  if (turned >= LAST) return { turned, side };
  if (single && turned > 0 && side === -1) return { turned, side: 1 };
  return { turned: turned + 1, side: -1 };
};
const backward = ({ turned, side }: Place, single: boolean): Place => {
  if (turned <= 0) return { turned, side };
  if (single && turned < LAST && side === 1) return { turned, side: -1 };
  return { turned: turned - 1, side: 1 };
};

function Face({ face, back = false }: { face: BookFace; back?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed-size page, moved in 3D; the words are in the transcript
    <img
      src={face.src}
      alt=""
      draggable={false}
      decoding="async"
      className="absolute inset-0 h-full w-full select-none"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
      }}
    />
  );
}

function Arrow({
  dir,
  label,
  onClick,
  hidden,
  style,
}: {
  dir: "prev" | "next";
  label: string;
  onClick: () => void;
  hidden: boolean;
  style: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      // hidden while the cover is the invitation, but still there for the keyboard
      className={`absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center text-off-white/80 transition-opacity duration-500 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-off-white focus-visible:outline-solid ${hidden ? "pointer-events-none opacity-0 focus-visible:pointer-events-auto" : "opacity-100"}`}
      style={style}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
        <path
          d={dir === "next" ? "M5 3l11 7-11 7z" : "M15 3L4 10l11 7z"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function BlackBook({ startOpen = false }: { startOpen?: boolean }) {
  const reduced = Boolean(useReducedMotion());
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [place, setPlace] = useState<Place>({ turned: startOpen ? 1 : 0, side: -1 });
  // the inside pages are fetched as the book comes near, the cover with the page
  const near = useInView(stageRef, { margin: "60% 0px", once: true });
  const inView = useInView(stageRef, { amount: 0.6 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => setSize(measure(el.clientWidth, el.clientHeight));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const single = size?.single ?? false;
  const next = useCallback(() => setPlace((p) => forward(p, single)), [single]);
  const prev = useCallback(() => setPlace((p) => backward(p, single)), [single]);
  const toFront = useCallback(() => setPlace({ turned: 0, side: -1 }), []);

  // ← → turn pages while the book is the thing on screen
  useEffect(() => {
    if (!inView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inView, next, prev]);

  const { turned, side } = place;
  const closedFront = turned === 0;
  const closedBack = turned === LAST;
  const open = !closedFront && !closedBack;
  // where the book's spine sits relative to the middle of the stage, in page widths
  const centre = closedFront ? 0.5 : closedBack ? -0.5 : single ? side * 0.5 : 0;
  const pageW = size?.pageW ?? 0;
  const pageH = size?.pageH ?? 0;
  /** half the width of what is in view: one page, or the open spread */
  const halfSpan = open && !single ? pageW : pageW / 2;

  // click a page to turn it (right: on, left: back); swipe sideways on touch
  const press = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button,a")) return;
    press.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const from = press.current;
    press.current = null;
    const el = stageRef.current;
    if (!from || !el) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else prev();
      return;
    }
    if (Math.abs(dx) > CLICK_SLOP || Math.abs(dy) > CLICK_SLOP) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    if (Math.abs(x) > halfSpan || Math.abs(y) > pageH / 2) return; // not on the book
    if (closedFront) next();
    else if (closedBack) toFront();
    else if (x >= 0) next();
    else prev();
  };

  const turn = { duration: reduced ? 0 : TURN_S, ease: EASE };
  const arrowGap = 44;

  return (
    <div
      ref={stageRef}
      role="group"
      aria-roledescription="book"
      aria-label="About me: a little black book"
      className="relative h-full w-full touch-pan-y select-none"
      style={{ perspective: PERSPECTIVE }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (press.current = null)}
    >
      {size && (
        <motion.div
          className="absolute top-1/2 left-1/2"
          style={{ width: 0, height: 0, transformStyle: "preserve-3d" }}
          initial={false}
          animate={{ x: -centre * pageW, rotate: closedFront ? -TILT_DEG : closedBack ? TILT_DEG : 0 }}
          transition={turn}
        >
          {BOOK_LEAVES.map((leaf, i) => (
            <motion.div
              key={leaf.front.src}
              className="absolute left-0"
              style={{
                top: -pageH / 2,
                width: pageW,
                height: pageH,
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
              }}
              initial={false}
              animate={{ rotateY: i < turned ? -180 : 0 }}
              transition={turn}
              // rotation first, depth second: the leaf's place in the stack flips with it
              transformTemplate={({ rotateY }) =>
                `rotateY(${typeof rotateY === "number" ? `${rotateY}deg` : (rotateY ?? "0deg")}) translateZ(${-i * LEAF_GAP}px)`
              }
            >
              {(i === 0 || near) && <Face face={leaf.front} />}
              {near && <Face face={leaf.back} back />}
            </motion.div>
          ))}
        </motion.div>
      )}

      {size && (
        <>
          <Arrow
            dir="prev"
            label="Previous page"
            onClick={prev}
            hidden={closedFront}
            style={
              single
                ? { left: "calc(50% - 44px)", top: `calc(50% + ${pageH / 2 + 34}px)` }
                : { left: `calc(50% - ${halfSpan + arrowGap}px)`, top: "50%" }
            }
          />
          <Arrow
            dir="next"
            label={closedFront ? "Open the book" : "Next page"}
            onClick={next}
            hidden={closedFront || closedBack}
            style={
              single
                ? { left: "calc(50% + 44px)", top: `calc(50% + ${pageH / 2 + 34}px)` }
                : { left: `calc(50% + ${halfSpan + arrowGap}px)`, top: "50%" }
            }
          />
          <button
            type="button"
            onClick={toFront}
            className={`font-accent absolute -translate-y-1/2 cursor-pointer text-[0.65rem] tracking-[0.25em] whitespace-nowrap text-off-white/80 uppercase underline underline-offset-4 transition-opacity duration-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-off-white focus-visible:outline-solid ${closedBack ? "opacity-100 delay-500" : "pointer-events-none opacity-0"}`}
            style={
              single
                ? { left: "calc(50% + 16px)", top: `calc(50% + ${pageH / 2 + 34}px)` }
                : { left: `calc(50% + ${pageW / 2 + arrowGap - 16}px)`, top: "50%" }
            }
            tabIndex={closedBack ? 0 : -1}
          >
            Back to front
          </button>
        </>
      )}

      {/* the book's words, in reading order, for screen readers and search */}
      <div className="sr-only">
        {BOOK_LEAVES.flatMap((leaf) => [leaf.front, leaf.back]).map((face) => (
          <section key={face.src}>
            <p>{face.alt}</p>
            {face.text?.map((line) => <p key={line}>{line}</p>)}
          </section>
        ))}
      </div>
    </div>
  );
}
