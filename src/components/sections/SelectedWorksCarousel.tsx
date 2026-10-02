"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type CarouselWork = {
  slug: string;
  title: string;
  category: string;
  cover: { src: StaticImageData | string; alt: string };
};

/**
 * Timing and geometry measured off the reference clip (Klickpin "cozy
 * dinner" pin, 720x900):
 *  - a new photo every ~1.67 s: ~0.7 s move, ~1 s hold;
 *  - the move builds slowly and lands fast;
 *  - the current photo is ~78% of the frame width; the NEXT one waits at
 *    half size against the right edge, top-aligned with it; the PREVIOUS
 *    one sits at half size against the left edge, bottom-aligned; ~2% gaps.
 * On each step the next photo grows into the centre while the centre one
 * shrinks down to the bottom-left and the old previous one leaves.
 */
const HOLD_MS = 1000;
const MOVE_S = 0.7;
const EASE = [0.7, 0, 0.2, 1] as const;
const CENTER_W = 0.783; // × stage width
const CENTER_H = 0.784; // × stage height (max)
const SIDE = 0.5; // side photos, relative to the centre one
const GAP = 0.021; // × stage width

type Box = { x: number; y: number; s: number; o: number };

function geometry(stageW: number, stageH: number) {
  // landscape covers on landscape screens, the reference's portrait cards on phones
  const aspect = stageW >= stageH ? 16 / 9 : 4 / 5;
  let w = stageW * CENTER_W;
  let h = w / aspect;
  if (h > stageH * CENTER_H) {
    h = stageH * CENTER_H;
    w = h * aspect;
  }
  const left = (stageW - w) / 2;
  const top = (stageH - h) / 2;
  const gap = stageW * GAP;
  const sw = w * SIDE;
  const sh = h * SIDE;
  /** position of each slot relative to the current photo (0) */
  const slot = (k: number): Box => {
    if (k === 0) return { x: left, y: top, s: 1, o: 1 };
    if (k === 1) return { x: left + w + gap, y: top, s: SIDE, o: 1 };
    if (k === -1) return { x: left - gap - sw, y: top + h - sh, s: SIDE, o: 1 };
    if (k >= 2) return { x: left + w + gap + sw + gap, y: top, s: SIDE, o: 1 };
    return { x: left - gap - sw - gap - sw, y: top + h - sh, s: SIDE, o: 0 };
  };
  return { w, h, slot };
}

function Cover({ work, sizes }: { work: CarouselWork; sizes: string }) {
  return typeof work.cover.src === "string" ? (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate next/image bypass, see content/projects
    <img src={work.cover.src} alt={work.cover.alt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
  ) : (
    <Image src={work.cover.src} alt={work.cover.alt} fill sizes={sizes} className="object-cover" draggable={false} />
  );
}

export function SelectedWorksCarousel({ works }: { works: CarouselWork[] }) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [current, setCurrent] = useState(0); // grows forever; photo = current mod n
  const [visible, setVisible] = useState(false);
  const n = works.length;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // autoplay while on screen: hold, move, hold, move…
  useEffect(() => {
    if (!visible || reduced || n < 2) return;
    const t = setTimeout(() => setCurrent((c) => c + 1), HOLD_MS + MOVE_S * 1000);
    return () => clearTimeout(t);
  }, [current, visible, reduced, n]);

  const work = works[((current % n) + n) % n];
  const geo = size ? geometry(size.w, size.h) : null;

  return (
    <section
      aria-label="Selected work"
      className="relative flex h-[100svh] snap-start snap-always flex-col overflow-hidden bg-[#000] text-off-white"
    >
      {/* top / bottom captions, like the reference's chrome */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-5 font-accent text-[0.65rem] uppercase tracking-[0.25em] text-off-white/45 sm:px-8">
        <span>Curated</span>
        <span>Selected Work</span>
        <span className="tabular-nums">
          {String(((current % n) + n) % n + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
        </span>
      </div>

      <div ref={stageRef} className="relative min-h-0 flex-1">
        {geo &&
          [-2, -1, 0, 1, 2].map((offset) => {
            const k = current + offset;
            const item = works[((k % n) + n) % n];
            const box = geo.slot(offset);
            const isCenter = offset === 0;
            return (
              <motion.div
                key={k}
                className="absolute left-0 top-0 origin-top-left overflow-hidden"
                style={{ width: geo.w, height: geo.h, zIndex: isCenter ? 2 : 1 }}
                initial={false}
                animate={{ x: box.x, y: box.y, scale: box.s, opacity: box.o }}
                transition={{ duration: reduced ? 0 : MOVE_S, ease: EASE }}
              >
                {isCenter ? (
                  <Link href={`/projects/${item.slug}`} className="group absolute inset-0 block" aria-label={`Open ${item.title}`}>
                    <Cover work={item} sizes="80vw" />
                    <span className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/15" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    className="absolute inset-0 block cursor-pointer"
                    onClick={() => setCurrent((c) => c + offset)}
                  >
                    <Cover work={item} sizes="40vw" />
                  </button>
                )}
              </motion.div>
            );
          })}
      </div>

      <div className="flex shrink-0 items-center justify-between px-4 pb-5 font-accent text-[0.65rem] uppercase tracking-[0.25em] text-off-white/45 sm:px-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={work.slug + "-c"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {work.category}
          </motion.span>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={work.slug + "-t"}
            className="text-off-white/80"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {work.title}
          </motion.span>
        </AnimatePresence>
        <Link href={`/projects/${work.slug}`} className="transition-colors hover:text-off-white">
          View project
        </Link>
      </div>
    </section>
  );
}
