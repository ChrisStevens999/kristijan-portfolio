"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Anton } from "next/font/google";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { useIntroSettled } from "@/components/categories/ApparelIntro";
import { NextProjectNav } from "@/components/ui/NextProjectNav";
import { apparelCollections, type Garment, type GarmentCollection } from "@/content/projects/apparel-display";
import type { Category } from "@/content/types";

import { RealWorldGallery } from "./RealWorldGallery";

// WebGL — client-only.
const TeeScene = dynamic(() => import("./TeeScene").then((m) => m.TeeScene), { ssr: false });

/** Condensed display face for the shirt-name tag only (the reference uses a
 *  Druk-style condensed; the local Druk files are trial licences). */
const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });

const RED = "#99181c";
/** the active tab: a brighter red than the bar's, so it reads over the dark wall */
const TAB_RED = "#c8202a";
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

/**
 * The stage for the open tab: the selected garment in 3D when the collection
 * has a model and the garment a print, otherwise its flat cutout floating in
 * the same spot above the floor shadow. A collection with nothing in it yet
 * shows "coming soon".
 */
function Stage({
  collection,
  index,
  reducedMotion,
}: {
  collection: GarmentCollection;
  index: number;
  reducedMotion: boolean;
}) {
  const item: Garment | undefined = collection.items[index];
  const settled = useIntroSettled();
  // a garment with its own model is shown as authored; otherwise its print
  // goes on the collection's shared model
  const model = item?.model ?? (item?.print ? collection.model : undefined);
  const print = item?.model ? undefined : item?.print;
  const is3d = Boolean(model);

  // What the 3D canvas shows. It keeps the last 3D view while a flat-only
  // garment (or an empty tab) is up, so the canvas — and its loaded models —
  // stay mounted instead of being rebuilt on the way back.
  const prefetch = useMemo(
    // the T-shirts' prints are small: fetch the rest once the first is up
    () => (collection.model ? collection.items.flatMap((g) => (g.print ? [g.print] : [])) : []),
    [collection],
  );
  const current = useMemo(
    () => (model ? { model, print, prefetch, faceBack: collection.faceBack } : null),
    [model, print, prefetch, collection.faceBack],
  );
  const [view, setView] = useState(current);
  if (current && current !== view) setView(current);

  return (
    <>
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: is3d ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.35 }}
        style={{ pointerEvents: is3d ? "auto" : "none" }}
        aria-hidden={!is3d}
      >
        {/* held back while the page's intro animation plays: WebGL
            setup would stall it (see useIntroSettled) */}
        {settled && view && <TeeScene view={view} reducedMotion={reducedMotion} />}
      </motion.div>
      <AnimatePresence>
        {!is3d && item && (
          <motion.div
            key={item.slug}
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
              <Image src={item.flat} alt={`${item.name} ${collection.noun}`} fill sizes="50vw" className="object-contain" />
            </motion.div>
          </motion.div>
        )}
        {!item && (
          <motion.p
            key={`${collection.id}-soon`}
            className="pointer-events-none absolute inset-0 grid place-items-center font-accent font-extrabold uppercase text-white/85"
            style={{ fontSize: "clamp(1rem, 2.6cqw, 3.5rem)", letterSpacing: "0.04em" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.4 }}
          >
            Coming soon
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}

/** The tabs that switch between collections (Graphic T's / Pattern AOPs / Hoodies). */
function Tabs({
  active,
  onSelect,
  className,
  style,
  gap,
}: {
  active: number;
  onSelect: (i: number) => void;
  className?: string;
  style?: React.CSSProperties;
  gap: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Apparel collections"
      className={`flex font-accent font-extrabold uppercase leading-none ${className ?? ""}`}
      style={{ ...style, columnGap: gap }}
      onKeyDown={(e) => {
        const n = apparelCollections.length;
        if (e.key === "ArrowRight") onSelect((active + 1) % n);
        else if (e.key === "ArrowLeft") onSelect((active - 1 + n) % n);
        else return;
        e.preventDefault();
        // focus follows selection, as tabs should
        const tabs = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]");
        tabs[e.key === "ArrowRight" ? (active + 1) % n : (active - 1 + n) % n]?.focus();
      }}
    >
      {apparelCollections.map((c, i) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          id={`apparel-tab-${c.id}`}
          aria-selected={i === active}
          tabIndex={i === active ? 0 : -1}
          onClick={() => onSelect(i)}
          className="whitespace-nowrap uppercase transition-colors duration-200 [text-shadow:0_0.08em_0.35em_rgba(0,0,0,0.7)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white focus-visible:outline-solid"
          style={{ color: i === active ? TAB_RED : "#ffffff" }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function NameTag({
  name,
  label,
  className,
  style,
}: {
  name: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
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
        {label}
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
      aria-label={dir === "prev" ? "Previous" : "Next"}
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
  collection,
  index,
  onSelect,
  itemBasis,
  className,
  style,
}: {
  collection: GarmentCollection;
  index: number;
  onSelect: (i: number) => void;
  itemBasis: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const garments = collection.items;
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

  if (garments.length === 0) {
    return (
      <div className={`grid place-items-center ${className ?? ""}`} style={style}>
        <p className="font-accent font-bold uppercase text-white/80" style={{ fontSize: "1.6em", letterSpacing: "0.06em" }}>
          {collection.label} are on the way
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={collection.label}
      aria-activedescendant={`garment-${garments[index].slug}`}
      tabIndex={0}
      style={style}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSelect((index + 1) % garments.length);
        else if (e.key === "ArrowLeft") onSelect((index - 1 + garments.length) % garments.length);
        else return;
        e.preventDefault();
      }}
      className={`flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid [&::-webkit-scrollbar]:hidden ${className ?? ""}`}
    >
      {garments.map((tee, i) => {
        const selected = i === index;
        return (
          <button
            key={tee.slug}
            id={`garment-${tee.slug}`}
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
  const settled = useIntroSettled();
  const isDesktop = useIsDesktop();
  // which tab is open, and the selected garment in each (remembered per tab)
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<number[]>(() => apparelCollections.map(() => 0));
  const collection = apparelCollections[tab];
  const count = collection.items.length;
  const index = Math.min(selected[tab], Math.max(0, count - 1));
  const garment: Garment | undefined = collection.items[index];
  const setIndex = useCallback((i: number) => setSelected((s) => s.map((v, t) => (t === tab ? i : v))), [tab]);
  const step = useCallback(
    (d: number) => {
      if (count > 0) setSelected((s) => s.map((v, t) => (t === tab ? (v + d + count) % count : v)));
    },
    [tab, count],
  );
  const scrollOn = () =>
    document.getElementById("graphic-tees-after")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });

  // pure #000 (not the site's #080808 `bg-black`): the exported backdrop
  // plate ends in #000, so the page around and below it must match
  return (
    <main className="bg-[#000] text-off-white">
      <h1 className="sr-only">Apparel: {collection.title}</h1>

      {isDesktop === true && (
        <section
          className="flex justify-center overflow-clip bg-[#000]"
          // a touch of space under the artboard so scroll line → gallery
          // matches bar → scroll line (both ≈ 23 artboard px at 3840 wide)
          style={{ paddingBottom: `calc(min(100svh, 100vw * ${H} / ${W}) * ${18 / H})` }}
        >
          {/* exactly as tall as the artboard (never letterboxed top/bottom), so the
              gallery starts right under the scroll line, not a band of empty black */}
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
              <Stage collection={collection} index={index} reducedMotion={reducedMotion} />
            </div>

            <div className="pointer-events-none absolute" style={{ left: px(178, W), top: px(146, H) }}>
              <p
                aria-hidden
                className="whitespace-nowrap font-accent font-extrabold uppercase leading-none"
                style={{ color: RED, fontSize: cq(128), letterSpacing: "-0.01em" }}
              >
                {collection.title}
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

            {/* the collections, bottom-left of the frame (as in the approved mockup) */}
            <Tabs
              active={tab}
              onSelect={setTab}
              className="absolute"
              gap={cq(86)}
              style={{ left: px(204, W), top: px(1430, H), fontSize: cq(38) }}
            />

            {garment && (
              <NameTag
                name={garment.name}
                label={collection.nameLabel}
                style={{ left: px(3015, W), top: px(1191, H), width: px(640, W), fontSize: cq(48) }}
              />
            )}

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
                // a fresh strip per tab: scroll position and item refs start clean
                key={collection.id}
                collection={collection}
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

            {collection.hasGallery && (
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
            )}
          </div>
        </section>
      )}

      {isDesktop === false && (
        <section className="flex min-h-[100svh] flex-col bg-[#000] px-4 pb-6 pt-24">
          <p className="font-accent text-[2.4rem] font-extrabold uppercase leading-none" style={{ color: RED }}>
            {collection.title}
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
            <Stage collection={collection} index={index} reducedMotion={reducedMotion} />
          </div>

          {/* sized so all three fit on one line on a narrow phone */}
          <Tabs
            active={tab}
            onSelect={setTab}
            className="mt-4 justify-between"
            gap="0.5rem"
            style={{ fontSize: "clamp(0.5rem, 2.7vw, 0.85rem)" }}
          />

          <div className="relative mt-3 ml-auto aspect-[640/303] w-[62%]">
            {garment && (
              <NameTag name={garment.name} label={collection.nameLabel} className="inset-0" style={{ fontSize: "0.75rem" }} />
            )}
          </div>

          <div className="mt-4 flex h-28 items-center gap-1 rounded-[1.4rem] px-2" style={{ background: RED }}>
            <Arrow dir="prev" onClick={() => step(-1)} className="h-6 w-5 shrink-0" />
            <Strip
              key={collection.id}
              collection={collection}
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

      {/* the "real world" photos belong to the T-shirts: only under that tab */}
      {collection.hasGallery && (
        <section id="graphic-tees-after" aria-label="The shirts in the real world" className="h-[100svh] bg-[#000]">
          {settled && <RealWorldGallery reducedMotion={reducedMotion} />}
        </section>
      )}
      {category ? <NextProjectNav mode="back-to-category" category={category} /> : null}
    </main>
  );
}
