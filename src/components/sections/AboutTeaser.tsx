"use client";

import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** The call to action's face (12_TYPOGRAPHY.md). */
const inter = Inter({ weight: "700", subsets: ["latin"], display: "swap" });

/**
 * About — the homepage stop between Selected Works and Explore by Category
 * (04_CONTENT_ARCHITECTURE.md). Ten black-and-white photographs and the
 * portrait video, on the black paper.
 *
 * Shape of it:
 *   1. one small card faces us; the first scroll screen turns the deck and
 *      unfolds the cards into their places;
 *   2. scrolling turns the upright cluster in depth for one screen;
 *      centered depth keeps the foreground from ballooning;
 *   3. scrolling gathers them: they glide into one stack in the middle with
 *      a gentle swing, and the video fades up through the stack as it forms;
 *   4. the video grows to its resting size and loops, with "Click to find
 *      out about me" over its lower left corner (the only text here; Inter
 *      Bold, see 12_TYPOGRAPHY.md);
 *   5. one more stop holds on that frame before the next section.
 *
 * The gather is a function of one clock driven by the scroll through this
 * several-screens-tall section with a sticky stage, so it plays forward and
 * back with the visitor. Nothing opens or drifts on its own.
 * Reduced motion shows the end.
 */

/** built by scripts/build-about-video.mjs from assets/about/Animation.mp4 */
const VIDEO = "/about/web-animation.mp4";
const POSTER = "/about/web-animation-poster.webp";
/** the clip's own frame: 1080 x 1399 — the cards share it */
const FRAME_W = 1080;
const FRAME_H = 1399;
const RATIO = FRAME_H / FRAME_W;
const CTA_LINES = ["Click to", "find out", "about me"];
const CTA_HREF = "/about";
/** The stage's surface: the supplied black paper (11_VISUAL_ASSETS.md),
 *  as on the Intro and the section titles. */
const TEXTURE = "/textures/black-page.png";

/**
 * Back to front, with positions in card widths/heights. Parallel planes
 * and a shared turn make this read as a spatial deck, not a pile of prints.
 * public/about/cards/<n>.webp, built by scripts/build-about-cards.mjs.
 */
const CARDS: { src: string; x: number; y: number }[] = [
  { src: "/about/cards/7.webp", x: 0.68, y: -0.12 },
  { src: "/about/cards/8.webp", x: -0.68, y: -0.04 },
  { src: "/about/cards/9.webp", x: -0.28, y: -0.52 },
  { src: "/about/cards/10.webp", x: 0.3, y: -0.46 },
  { src: "/about/cards/5.webp", x: 0.05, y: 0.48 },
  { src: "/about/cards/6.webp", x: 0.42, y: 0.33 },
  { src: "/about/cards/3.webp", x: -0.52, y: 0.27 },
  { src: "/about/cards/4.webp", x: 0.64, y: -0.03 },
  { src: "/about/cards/11.webp", x: -0.56, y: -0.22 },
  { src: "/about/cards/2.webp", x: 0.02, y: 0.04 },
];
/** Center the depth range around the origin so the group turns in place. */
const DEPTH = 0.14;

/** The gather's clock, in seconds. It starts with the cluster fully open. */
const T = {
  gatherStart: 0,
  gatherEnd: 1.0, // the cards have become one stack, and the video has faded up through it
  grown: 1.8, // and it has grown to its resting size
};
/** One-screen snap stops: single card, unfolded cluster, turned cluster,
 *  gathering stack, video with text, final hold. */
const OPEN_SCREENS = 1;
const PLAY_SCREENS = 2;
const FLOAT_SCREENS = 1;
const HOLD_SCREENS = 1;
const SCREENS = 1 + OPEN_SCREENS + FLOAT_SCREENS + PLAY_SCREENS + HOLD_SCREENS;
/** the deck's swing, degrees, at the midpoint of the opening / the gather */
const GATHER_SWING = 22;
/** the stack the cards gather into is this much of a floating card */
const STACK_SCALE = 0.85;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

/** 0 → 1 across the gather */
const closing = (t: number) => span(t, T.gatherStart, T.gatherEnd);
/** a swing away and back: 0 → 1 → 0 */
const swing = (p: number) => Math.sin(Math.PI * easeInOutSine(p));
/** how gathered the cards are: 0 floating → 1 one stack */
const gathered = (t: number) => easeInOutCubic(closing(t));
/** how open the cluster is at `o` of the opening */
const burst = (o: number) => easeOutCubic(o);
/** the video fades up through the stack over the last part of the gather,
 *  and the cards fade out under it a touch later, so there is no cut */
const videoIn = (t: number) => easeInOutSine(span(closing(t), 0.55, 1));
const deckOut = (t: number) => 1 - easeInOutSine(span(closing(t), 0.7, 1));

/** phone or desktop layout, from the screen width */
function useLayout(): "desktop" | "phone" {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => (window.matchMedia("(min-width: 768px)").matches ? "desktop" : "phone"),
    () => "desktop",
  );
}

/** the screen, in pixels, kept current */
function useScreen() {
  const read = () => `${window.innerWidth}x${window.innerHeight}`;
  const key = useSyncExternalStore(
    (cb) => {
      window.addEventListener("resize", cb);
      return () => window.removeEventListener("resize", cb);
    },
    read,
    () => "1600x900",
  );
  const [w, h] = key.split("x").map(Number);
  return { w, h };
}

export function AboutTeaser() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const layout = useLayout();
  const screen = useScreen();

  // Fit the entire spread, including perspective, rather than an individual
  // card. Keep the same proportions on phones instead of squeezing offsets.
  const cardH = Math.min(0.30 * screen.h, 0.29 * screen.w * RATIO);
  const cardW = cardH / RATIO;
  const heroH = Math.min(0.69 * screen.h, 0.88 * screen.w * RATIO);
  const heroW = heroH / RATIO;
  const heroScale = heroH / cardH;

  // One scroll timeline owns the entire sequence, including the opening.
  // Each phase clamps at its endpoint so reverse scrolling is deterministic.
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const opening = useTransform(scrollYProgress, (p) =>
    reducedMotion ? 1 : clamp01((p * (SCREENS - 1)) / OPEN_SCREENS),
  );
  const floatProgress = useTransform(scrollYProgress, (p) =>
    reducedMotion ? 0 : clamp01((p * (SCREENS - 1) - OPEN_SCREENS) / FLOAT_SCREENS),
  );
  const time = useTransform(scrollYProgress, (p) =>
    reducedMotion ? T.grown : clamp01((p * (SCREENS - 1) - OPEN_SCREENS - FLOAT_SCREENS) / PLAY_SCREENS) * T.grown,
  );

  // the video only runs while the scene is on screen and the cards are
  // about to hand over to it — before that it is hidden and decoding it
  // would be work for nothing
  const onScreen = useInView(section, { amount: 0.1 });
  const [videoDue, setVideoDue] = useState(false);
  useMotionValueEvent(time, "change", (t) => setVideoDue(closing(t) >= 0.4));
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (onScreen && (videoDue || reducedMotion)) el.play().catch(() => {});
    else el.pause();
  }, [onScreen, videoDue, reducedMotion]);

  // After unfolding, another scroll screen reveals the opposite side
  // before the gather begins.
  // Turn the closed deck first, reveal its depth near edge-on, then spread
  // the cards as it faces us again. A single shared turn preserves alignment.
  const openingTurn = useTransform(opening, [0, 0.18, 0.38, 0.82, 1], [0, -78, -64, -12, -8]);
  const deckRotateY = useTransform([time, floatProgress, opening, openingTurn], ([t, p, o, turn]) => {
    return ((turn as number) + 52 * easeInOutSine(p as number) * burst(o as number)) * (1 - gathered(t as number))
      - GATHER_SWING * swing(closing(t as number));
  });
  const deckScale = useTransform([time, opening], ([t, o]) => {
    const size = 1 - (1 - STACK_SCALE) * gathered(t as number);
    return (STACK_SCALE + (1 - STACK_SCALE) * burst(o as number)) * size;
  });
  const deckOpacity = useTransform(time, deckOut);

  // the video: fades up through the stack, matching its swing and size,
  // then grows
  const videoRotateY = useTransform(time, (t) => -GATHER_SWING * swing(closing(t)));
  const videoScale = useTransform(time, (t) => {
    const stack = 1 - (1 - STACK_SCALE) * gathered(t);
    return stack + (heroScale - stack) * easeOutCubic(span(t, T.gatherEnd, T.grown));
  });
  const videoOpacity = useTransform(time, videoIn);
  // the call to action fades up as the video settles
  const ctaOpacity = useTransform(time, (t) => easeOutCubic(span(t, T.grown - 0.35, T.grown)));
  const ctaPointer = useTransform(time, (t) => (t >= T.grown - 0.1 ? "auto" : "none"));
  const phone = layout === "phone";

  return (
    <section
      ref={section}
      id="about"
      aria-label="About me"
      className="relative bg-black"
      style={{ height: `${SCREENS * 100}svh` }}
    >
      {/* the stops: one per screen, each a mandatory rest on the snapping
          homepage (inline: see globals.css); the stage below stays put */}
      {Array.from({ length: SCREENS }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute inset-x-0"
          style={{ top: `${i * 100}svh`, height: "100svh", scrollSnapAlign: "start", scrollSnapStop: "always" }}
        />
      ))}
      {/* the stage stays put while the section scrolls past; one card-sized
          box in the middle of it that the deck and the video share */}
      <div
        className="sticky top-0 grid place-items-center overflow-hidden"
        style={{
          height: "100svh",
          perspective: Math.max(800, cardW * 8),
          backgroundImage: `url('${TEXTURE}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <motion.div
          className="relative"
          style={{
            width: cardW,
            height: cardH,
            rotateY: deckRotateY,
            scale: deckScale,
            opacity: deckOpacity,
            transformStyle: "preserve-3d",
          }}
        >
          {CARDS.map((card, i) => (
            <Card
              key={card.src}
              card={card}
              index={i}
              depth={cardW * DEPTH}
              time={time}
              opening={opening}
            />
          ))}
        </motion.div>

        <motion.div
          className="absolute overflow-hidden bg-black"
          style={{
            width: cardW,
            height: cardH,
            rotateY: videoRotateY,
            scale: videoScale,
            opacity: videoOpacity,
            boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
            willChange: "transform, opacity",
          }}
        >
          <video
            ref={video}
            src={VIDEO}
            poster={POSTER}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
        </motion.div>

        {/* the call to action, placed against the resting video (measured
            off the mockup: three lines, left-aligned, its left edge a
            quarter of the video's width outside the video, its top 73% down
            it, running past the bottom) */}
        <motion.div
          className="absolute"
          style={{
            left: `calc(50% - ${heroW / 2 + heroW * (phone ? 0.06 : 0.25)}px)`,
            top: `calc(50% - ${heroH / 2 - heroH * 0.73}px)`,
            opacity: ctaOpacity,
            pointerEvents: ctaPointer,
            zIndex: CARDS.length + 2,
          }}
        >
          <Link
            href={CTA_HREF}
            className={`${inter.className} block uppercase text-white focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white focus-visible:outline-solid`}
            style={{ fontSize: heroH * 0.115, lineHeight: 0.95, letterSpacing: "-0.02em" }}
          >
            {CTA_LINES.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/** One photograph: floating in its place in the cluster, then gathered into
 *  the stack. */
function Card({
  card,
  index,
  depth,
  time,
  opening,
}: {
  card: (typeof CARDS)[number];
  index: number;
  /** pixels between adjacent parallel planes, when open */
  depth: number;
  time: MotionValue<number>;
  opening: MotionValue<number>;
}) {
  // A small stagger, but every card finishes gathering before the handover.
  const lag = index * 0.012;
  const remaining = (t: number) => 1 - easeInOutCubic(span(t, lag, T.gatherEnd));
  const spread = (t: number, o: number) => easeOutCubic(span(o, 0.28 + lag, 1)) * remaining(t);
  const x = useTransform([time, opening], ([t, o]) => `${card.x * 100 * spread(t as number, o as number)}%`);
  const y = useTransform([time, opening], ([t, o]) => `${card.y * 100 * spread(t as number, o as number)}%`);
  const z = useTransform([time, opening], ([t, o]) =>
    (index - (CARDS.length - 1) / 2) * depth * easeInOutSine(span(o as number, 0.12, 0.72)) * remaining(t as number),
  );

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden bg-black"
      style={{
        zIndex: index + 1,
        x,
        y,
        z,
        borderRadius: 3,
        boxShadow: "0 8px 18px rgba(0,0,0,0.22)",
        backfaceVisibility: "hidden",
        // its own layer, so the scroll only moves it, never repaints it
        willChange: "transform",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- one fixed size, moved with transforms */}
      <img
        src={card.src}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        // fetched and decoded with the page, so the deck never opens on an
        // image that is still arriving
        loading="eager"
        decoding="async"
      />
    </motion.div>
  );
}
