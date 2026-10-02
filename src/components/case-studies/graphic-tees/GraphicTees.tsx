"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Anton } from "next/font/google";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { NextProjectNav } from "@/components/ui/NextProjectNav";
import { graphicTees } from "@/content/projects/graphic-tees";
import type { Category } from "@/content/types";

// WebGL — client-only.
const TeeScene = dynamic(() => import("./TeeScene").then((m) => m.TeeScene), { ssr: false });

/** Condensed display face for the shirt-name tag only (the reference uses a
 *  Druk-style condensed; the local Druk files are trial licences). */
const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });

const RED = "#99181c";
const BG = "/apparel/t-shirts/display-bg.jpg";
const TAG = "/apparel/t-shirts/name-tag.webp";

/** Everything below is placed in percentages of the approved 3840x2160 artboard. */
const W = 3840;
const H = 2160;
const px = (v: number, of: number) => `${(v / of) * 100}%`;
/** font sizes in container-width units of the artboard */
const cq = (v: number) => `${(v / W) * 100}cqw`;

const FRAME = { l: 72, t: 38, r: 3770, b: 1595 }; // white frame interior → 3D stage
const BAR = { l: 72, t: 1625, r: 3771, b: 2091 };
const STRIP = { l: 330, r: 3490 }; // visible shirt window inside the bar
const VISIBLE = 6;

function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => null,
  );
}

/** One shirt: the 3D tee if it has a print, otherwise its flat cutout floating
 *  in the same spot above the floor shadow. */
function Stage({ index, reducedMotion }: { index: number; reducedMotion: boolean }) {
  const tee = graphicTees[index];
  // keep the last 3D print so the canvas stays mounted (and keeps its loaded
  // model) while a flat-only shirt is shown
  const [lastPrint, setLastPrint] = useState(() => graphicTees.find((t) => t.print)!.print!);
  if (tee.print && tee.print !== lastPrint) setLastPrint(tee.print);
  const is3d = Boolean(tee.print);
  return (
    <>
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: is3d ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.35 }}
        style={{ pointerEvents: is3d ? "auto" : "none" }}
        aria-hidden={!is3d}
      >
        <TeeScene print={lastPrint} reducedMotion={reducedMotion} />
      </motion.div>
      <AnimatePresence>
        {!is3d && (
          <motion.div
            key={tee.slug}
            className="pointer-events-none absolute left-1/2 aspect-square -translate-x-1/2"
            style={{ top: "12%", height: "77%", maxWidth: "88%" }}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="relative h-full w-full"
              animate={reducedMotion ? undefined : { y: ["-1.2%", "1.2%", "-1.2%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image src={tee.flat} alt={`${tee.name} T-shirt, back print`} fill sizes="50vw" className="object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NameTag({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  // single line; long names shrink to fit the tag
  const fit = Math.min(1, 9.5 / Math.max(name.length, 1));
  return (
    <div className={`absolute ${className ?? ""}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed decorative tag, exact pixels */}
      <img src={TAG} alt="" className="block h-auto w-full" draggable={false} />
      <p
        className="absolute font-accent font-semibold uppercase leading-none text-black"
        style={{ right: "15.8%", top: "31.5%", fontSize: "0.42em", letterSpacing: "0.02em" }}
      >
        Shirt name
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={name}
          className={`${anton.className} absolute whitespace-nowrap uppercase leading-none text-white`}
          style={{ right: "14.7%", top: "43%", fontSize: `${2.35 * fit}em`, lineHeight: 0.92 }}
          initial={{ opacity: 0, y: "18%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-18%" }}
          transition={{ duration: 0.18 }}
          aria-live="polite"
        >
          {name}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function Arrow({
  dir,
  onClick,
  className,
  style,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      aria-label={dir === "prev" ? "Previous shirt" : "Next shirt"}
      className={`grid place-items-center text-white transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white focus-visible:outline-solid ${className ?? ""}`}
    >
      <svg viewBox="0 0 62 72" className="h-full w-full" aria-hidden>
        <path d={dir === "prev" ? "M0 36 62 0v72z" : "M62 36 0 0v72z"} fill="currentColor" />
      </svg>
    </button>
  );
}

/** Horizontal shirt picker. `itemBasis` is the width of one slot as a CSS
 *  length (6 slots fill the window on desktop). */
function Strip({
  index,
  onSelect,
  itemBasis,
  className,
  style,
}: {
  index: number;
  onSelect: (i: number) => void;
  itemBasis: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  // keep the selected shirt in view without scrolling the page
  useEffect(() => {
    const strip = ref.current;
    const el = items.current[index];
    if (!strip || !el) return;
    const left = el.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollTo({ left, behavior: "smooth" });
    else if (right > strip.scrollLeft + strip.clientWidth)
      strip.scrollTo({ left: right - strip.clientWidth, behavior: "smooth" });
  }, [index]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label="T-shirts"
      aria-activedescendant={`tee-${graphicTees[index].slug}`}
      tabIndex={0}
      style={style}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSelect((index + 1) % graphicTees.length);
        else if (e.key === "ArrowLeft") onSelect((index - 1 + graphicTees.length) % graphicTees.length);
        else return;
        e.preventDefault();
      }}
      className={`flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid [&::-webkit-scrollbar]:hidden ${className ?? ""}`}
    >
      {graphicTees.map((tee, i) => {
        const selected = i === index;
        return (
          <button
            key={tee.slug}
            id={`tee-${tee.slug}`}
            ref={(el) => {
              items.current[i] = el;
            }}
            type="button"
            role="option"
            aria-selected={selected}
            tabIndex={-1}
            onClick={() => onSelect(i)}
            className="group relative h-full shrink-0 snap-start"
            style={{ width: itemBasis }}
          >
            <span
              className="absolute inset-[4%] transition-transform duration-300 ease-out group-hover:scale-[1.05]"
              style={{
                transform: selected ? "scale(1.08)" : undefined,
                // sticker-style white outline around the selected cutout
                filter: selected
                  ? "drop-shadow(0.22em 0 0 #fff) drop-shadow(-0.22em 0 0 #fff) drop-shadow(0 0.22em 0 #fff) drop-shadow(0 -0.22em 0 #fff)"
                  : undefined,
              }}
            >
              <Image
                src={tee.flat}
                alt={tee.name}
                fill
                sizes="(min-width: 768px) 14vw, 30vw"
                className="object-contain"
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function GraphicTees({ category }: { category?: Category }) {
  const reducedMotion = Boolean(useReducedMotion());
  const isDesktop = useIsDesktop();
  const [index, setIndex] = useState(0);
  const tee = graphicTees[index];
  const step = useCallback(
    (d: number) => setIndex((i) => (i + d + graphicTees.length) % graphicTees.length),
    [],
  );
  const scrollOn = () =>
    document.getElementById("graphic-tees-after")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });

  return (
    <main className="bg-black text-off-white">
      <h1 className="sr-only">Graphic T&apos;s</h1>

      {isDesktop === true && (
        <section className="flex h-[100svh] items-center justify-center overflow-clip bg-black">
          <div
            className="relative [container-type:inline-size]"
            style={{ aspectRatio: `${W} / ${H}`, width: `min(100vw, calc(100svh * ${W} / ${H}))` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- exact backdrop plate, fills the artboard */}
            <img src={BG} alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />

            <div
              className="absolute"
              style={{
                left: px(FRAME.l, W),
                top: px(FRAME.t, H),
                width: px(FRAME.r - FRAME.l, W),
                height: px(FRAME.b - FRAME.t, H),
              }}
            >
              <Stage index={index} reducedMotion={reducedMotion} />
            </div>

            <div className="pointer-events-none absolute" style={{ left: px(178, W), top: px(146, H) }}>
              <p
                aria-hidden
                className="font-accent font-extrabold uppercase leading-none"
                style={{ color: RED, fontSize: cq(128), letterSpacing: "-0.01em" }}
              >
                Graphic T&rsquo;s
              </p>
              <p
                className="font-accent font-medium uppercase text-white"
                style={{ fontSize: cq(29), lineHeight: 1.07, marginTop: cq(30) }}
              >
                All designs created by me through
                <br />
                illustration, photobashing collage
                <br />
                design and other techniques
              </p>
            </div>

            <p
              className="pointer-events-none absolute font-accent font-extrabold uppercase"
              style={{ left: px(3395, W), top: px(146, H), color: RED, fontSize: cq(36), lineHeight: 0.92 }}
            >
              Chris
              <br />
              Stevens
            </p>

            <NameTag
              name={tee.name}
              style={{ left: px(3015, W), top: px(1191, H), width: px(640, W), fontSize: cq(48) }}
            />

            <div
              className="absolute overflow-hidden"
              style={{
                left: px(BAR.l, W),
                top: px(BAR.t, H),
                width: px(BAR.r - BAR.l, W),
                height: px(BAR.b - BAR.t, H),
                background: RED,
                borderRadius: cq(64),
              }}
            >
              {/* positions inside the bar, still measured off the artboard */}
              <Arrow
                dir="prev"
                onClick={() => step(-1)}
                className="absolute"
                style={{
                  left: px(164 - BAR.l, BAR.r - BAR.l),
                  top: px(1814 - BAR.t, BAR.b - BAR.t),
                  width: px(62, BAR.r - BAR.l),
                  height: px(72, BAR.b - BAR.t),
                }}
              />
              <Arrow
                dir="next"
                onClick={() => step(1)}
                className="absolute"
                style={{
                  left: px(3618 - BAR.l, BAR.r - BAR.l),
                  top: px(1814 - BAR.t, BAR.b - BAR.t),
                  width: px(62, BAR.r - BAR.l),
                  height: px(72, BAR.b - BAR.t),
                }}
              />
              <Strip
                index={index}
                onSelect={setIndex}
                itemBasis={`calc(100% / ${VISIBLE})`}
                className="absolute"
                // a little vertical breathing room so the selected shirt's
                // scale + outline is not clipped by the scroller
                style={{
                  left: px(STRIP.l - BAR.l, BAR.r - BAR.l),
                  width: px(STRIP.r - STRIP.l, BAR.r - BAR.l),
                  top: "2%",
                  height: "96%",
                  fontSize: cq(16),
                }}
              />
            </div>

            <button
              type="button"
              onClick={scrollOn}
              className="absolute flex -translate-x-1/2 items-center font-accent font-bold uppercase"
              style={{ left: "50%", top: px(2114, H), color: RED, fontSize: cq(27), gap: cq(22) }}
            >
              Scroll down to check out the shirts in the real world
              <svg viewBox="0 0 34 22" style={{ width: cq(34) }} aria-hidden>
                <path d="M0 0h34L17 22z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </section>
      )}

      {isDesktop === false && (
        <section className="flex min-h-[100svh] flex-col bg-black px-4 pb-6 pt-24">
          <p className="font-accent text-[2.4rem] font-extrabold uppercase leading-none" style={{ color: RED }}>
            Graphic T&rsquo;s
          </p>
          <p className="mt-3 max-w-[22rem] font-accent text-[0.65rem] font-medium uppercase leading-snug text-white">
            All designs created by me through illustration, photobashing, collage design and other techniques
          </p>

          <div className="relative mt-5 aspect-[4/5] w-full overflow-hidden rounded-[1.4rem] border-[3px] border-[#d2d2d2]">
            {/* the frame interior of the plate, cropped around the shadow */}
            {/* eslint-disable-next-line @next/next/no-img-element -- exact backdrop plate */}
            <img
              src={BG}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                height: `${(H / (FRAME.b - FRAME.t)) * 100}%`,
                top: `${(-FRAME.t / (FRAME.b - FRAME.t)) * 100}%`,
                left: "50%",
                transform: `translateX(-${(1926 / W) * 100}%)`,
              }}
            />
            <Stage index={index} reducedMotion={reducedMotion} />
          </div>

          <div className="relative mt-3 ml-auto aspect-[640/303] w-[62%]">
            <NameTag name={tee.name} className="inset-0" style={{ fontSize: "0.75rem" }} />
          </div>

          <div className="mt-4 flex h-28 items-center gap-1 rounded-[1.4rem] px-2" style={{ background: RED }}>
            <Arrow dir="prev" onClick={() => step(-1)} className="h-6 w-5 shrink-0" />
            <Strip
              index={index}
              onSelect={setIndex}
              itemBasis="28%"
              className="h-full min-w-0 flex-1 py-2"
              style={{ fontSize: "0.7rem" }}
            />
            <Arrow dir="next" onClick={() => step(1)} className="h-6 w-5 shrink-0" />
          </div>
        </section>
      )}

      <div id="graphic-tees-after" />
      {category ? <NextProjectNav mode="back-to-category" category={category} /> : null}
    </main>
  );
}
