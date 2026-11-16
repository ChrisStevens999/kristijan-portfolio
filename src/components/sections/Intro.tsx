"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";

import heroPhoto from "../../../assets/Intro/1.png";
// The blue-sky regrade of the supplied finale frame.
import finalePhoto from "../../../assets/Intro/5 blue.webp";
import { TEXTURES, textureStyle } from "@/lib/textures";

/**
 * Has the intro started since this page was loaded? Kept in memory, not in
 * storage: a reload or a new visit starts clean, so the intro plays again
 * every time the homepage is opened, while moving around the site and
 * coming back to the homepage does not replay it. (It used to be remembered
 * for the whole browser session, so a reloaded or restored tab never saw it
 * again.)
 */
let playedThisLoad = false;

/** Inputs in the first moments don't skip: the tail of a scroll, or the key
 *  that reloaded the page, would otherwise end the intro before it shows. */
const SKIP_GRACE_MS = 800;
/** The opening photograph gets this long to arrive before the clock starts anyway. */
const HERO_CAP_MS = 3000;

/**
 * Texture surfaces are plain CSS backgrounds served from /public, bypassing
 * next/image entirely. Cover fit was chosen over tiled repeat: the repeat
 * tile is sized to the source's native 1920x1080 (at 1x), which would show
 * a visible seam on any viewport wider or taller than that (e.g. a 2560x1440
 * monitor) — cover scales cleanly from the 3840x2160 source at every size
 * with no seam risk.
 */

/**
 * 05_COMPONENT_LIBRARY.md: full screen, cinematic, plays once per opening
 * of the homepage (see the gate at the bottom).
 * Frames 1 and 5 are the provided photographic/illustrative assets.
 * Frames 2-4 reproduce the copy of the supplied intro frames 2-4 as live
 * HTML text rather than baked-in images, per the Decision Log
 * ("Typography remains HTML rather than being embedded inside imagery").
 * Text-frame backgrounds are the supplied paper textures, per
 * 11_VISUAL_ASSETS.md's Background Surface Mapping — never flat colors.
 */
type Frame =
  | { kind: "image"; src: StaticImageData; alt: string; hold: number }
  | {
      kind: "text";
      lines: string[];
      hold: number;
      texture: string;
      className: string;
    };

const FRAMES: Frame[] = [
  { kind: "image", src: heroPhoto, alt: "", hold: 2600 },
  {
    kind: "text",
    lines: ["Chris Stevens"],
    hold: 1900,
    texture: TEXTURES.black,
    className: "text-off-white",
  },
  {
    kind: "text",
    lines: ["Brand Design", "Creative Direction"],
    hold: 1900,
    texture: TEXTURES.black,
    className: "text-red",
  },
  {
    kind: "text",
    lines: ["Creating What", "People Remember"],
    hold: 2100,
    texture: TEXTURES.red,
    className: "text-off-white",
  },
  { kind: "image", src: finalePhoto, alt: "", hold: 2600 },
];

function IntroFrame({ frame, calm, onImageReady }: { frame: Frame; calm: boolean; onImageReady?: () => void }) {
  if (frame.kind === "image") {
    return (
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        // calm (reduced motion): the photograph holds still
        animate={{ scale: calm ? 1 : 1.045 }}
        transition={{ duration: frame.hold / 1000 + 1, ease: "linear" }}
      >
        <Image
          src={frame.src}
          alt={frame.alt}
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          quality={95}
          className="object-cover"
          onLoad={onImageReady}
        />
      </motion.div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center px-6">
      <div className="absolute inset-0" style={textureStyle(frame.texture)} />
      <div className="relative text-center">
        {frame.lines.map((line, i) => {
          const multiLine = frame.lines.length > 1;
          return (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: calm ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 * i, ease: "easeOut" }}
              className={`font-intro text-4xl sm:text-6xl lg:text-8xl xl:text-9xl ${multiLine ? "leading-none" : "leading-tight"} ${multiLine && i > 0 ? "mt-1 sm:mt-2 lg:mt-3 xl:mt-4" : ""} ${frame.className}`}
            >
              {line}
            </motion.p>
          );
        })}
      </div>
    </div>
  );
}

function IntroSequence({ calm, onComplete }: { calm: boolean; onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const exiting = index >= FRAMES.length;
  // the opening photograph is on screen (or has had long enough to be)
  const [heroReady, setHeroReady] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    // it has played once it has started (set here rather than in the gate,
    // so React's development double-run of the gate's effect can't mark it
    // played before it ever shows)
    playedThisLoad = true;
    startedAt.current = performance.now();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Skippable, as the Apparel intro is: any click, key, wheel or swipe goes
  // straight to the closing fade (and doesn't scroll the page underneath).
  useEffect(() => {
    if (exiting) return;
    const skip = (e: Event) => {
      // the gesture that skips is spent on skipping: no scroll, and no
      // Space/arrow/Page key moving the page underneath on its way out
      if (e.type !== "pointerdown") e.preventDefault();
      // …but not in the first moments: see SKIP_GRACE_MS
      if (performance.now() - startedAt.current < SKIP_GRACE_MS) return;
      setIndex(FRAMES.length);
    };
    const opts = { passive: false } as const;
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("touchmove", skip, opts);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [exiting]);

  useEffect(() => {
    if (exiting) return;
    // the first frame's clock starts when its photograph has arrived, so a
    // slow connection sees the photograph for its full hold, not a blur
    if (index === 0 && !heroReady) {
      const cap = setTimeout(() => setHeroReady(true), HERO_CAP_MS);
      return () => clearTimeout(cap);
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), FRAMES[index].hold);
    return () => clearTimeout(timer);
  }, [index, exiting, heroReady]);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      aria-hidden="true"
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.9, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (exiting) onComplete();
      }}
    >
      <AnimatePresence>
        {!exiting && (
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <IntroFrame frame={FRAMES[index]} calm={calm} onImageReady={index === 0 ? () => setHeroReady(true) : undefined} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * The gate. The intro plays every time the homepage is opened at its top —
 * a first visit, a reload, a restored tab — and not again while the visitor
 * moves around the site and comes back (see `playedThisLoad`). It is
 * skipped only when the visitor arrives at a section of the page (a #hash
 * link, e.g. the "Back to Categories" door). Any input skips it while it
 * plays (see IntroSequence).
 *
 * Visitors who ask for reduced motion get it too, calm: the same frames and
 * crossfades, with no zoom on the photographs and no slide on the words.
 * (It used to be skipped for them outright, so on a phone with "reduce
 * motion" on it never played.)
 *
 * Before the browser has been asked any of this, the first paint is the
 * intro's own black (.intro-cover in globals.css), not the homepage
 * underneath — so the page never flashes before the intro, and a slow
 * connection can't show the homepage, take a scroll, and lose the intro to
 * it. The cover lets go by itself if the page's code never arrives.
 */
type Gate = "pending" | "play" | "calm" | "skip";

export function Intro() {
  const [gate, setGate] = useState<Gate>(() => (playedThisLoad ? "skip" : "pending"));

  useEffect(() => {
    if (gate !== "pending") return;
    const deepLink = window.location.hash.length > 1;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // the hash and matchMedia don't exist during SSR, so this can't be
    // derived at render time — it must sync from the browser after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGate(deepLink ? "skip" : reducedMotion ? "calm" : "play");
  }, [gate]);

  if (gate === "skip") return null;
  if (gate === "pending") return <div className="intro-cover" aria-hidden="true" />;

  return <IntroSequence calm={gate === "calm"} onComplete={() => setGate("skip")} />;
}
