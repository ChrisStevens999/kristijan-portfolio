"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTime,
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
 *   1. on arrival one small card faces us, and the deck swings away and back,
 *      the cards fanning out to their places as it comes round — on its own
 *      clock, once per visit;
 *   2. the cluster floats, as in the clip: the deck drifts and each card
 *      breathes a little, layered so none cuts through another;
 *   3. scrolling gathers them: they glide into one stack in the middle with
 *      a gentle swing, and the video fades up through the stack as it forms;
 *   4. the video grows to its resting size and loops, with "Click to find
 *      out about me" over its lower left corner (the only text here; Inter
 *      Bold, see 12_TYPOGRAPHY.md);
 *   5. two more stops hold on that frame before the next section.
 *
 * The gather is a function of one clock driven by the scroll through this
 * several-screens-tall section with a sticky stage, so it plays forward and
 * back with the visitor; the opening and the float run on their own.
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
 * The cards, bottom to top. Each one's resting place in the cluster as a
 * fraction of the card's own width / height from the middle, with its tilt —
 * art-directed from the reference clip's spread. They overlap, as in the
 * clip, but are layered cleanly: each sits DEPTH further forward than the
 * one under it, and the tilts are kept small enough that no card's plane
 * ever cuts through its neighbour's.
 * public/about/cards/<n>.webp, built by scripts/build-about-cards.mjs.
 */
const CARDS: { src: string; x: number; y: number; rotate: number; tilt: number }[] = [
  { src: "/about/cards/7.webp", x: -0.8, y: -0.06, rotate: -4, tilt: 6 },
  { src: "/about/cards/8.webp", x: 0.82, y: -0.08, rotate: 5, tilt: -6 },
  { src: "/about/cards/9.webp", x: 0.12, y: -0.46, rotate: -3, tilt: 3 },
  { src: "/about/cards/10.webp", x: -0.14, y: 0.44, rotate: 3, tilt: -3 },
  { src: "/about/cards/5.webp", x: -0.36, y: -0.4, rotate: 5, tilt: 4 },
  { src: "/about/cards/6.webp", x: 0.4, y: 0.38, rotate: -6, tilt: -4 },
  { src: "/about/cards/3.webp", x: -0.62, y: 0.22, rotate: -7, tilt: 5 },
  { src: "/about/cards/4.webp", x: 0.6, y: 0.24, rotate: 7, tilt: -5 },
  { src: "/about/cards/11.webp", x: -0.42, y: -0.16, rotate: -8, tilt: 4 },
  { src: "/about/cards/2.webp", x: 0.44, y: -0.2, rotate: 6, tilt: -4 },
];
/** the depth between one card and the next, as a fraction of a card's
 *  width — more than the deepest point a tilted, leaning card reaches */
const DEPTH = 0.09;

/** The gather's clock, in seconds. It starts with the cluster fully open. */
const T = {
  gatherStart: 0,
  gatherEnd: 1.0, // the cards have become one stack, and the video has faded up through it
  grown: 1.8, // and it has grown to its resting size
};
/** The section's stops, one screen each, every one a mandatory rest (like
 *  the Selected Work images): the floating cluster; then this many gestures
 *  of gathering, the last of which lands on the formed video; then this many
 *  more holding on the video and the line, so nobody scrolls past it. */
const PLAY_SCREENS = 2;
const HOLD_SCREENS = 2;
const SCREENS = 1 + PLAY_SCREENS + HOLD_SCREENS;
/** the deck's swing, degrees, at the midpoint of the opening / the gather */
const OPEN_SWING = 70;
const GATHER_SWING = 22;
/** the opening swing takes this long */
const OPEN_S = 1.1;
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
/** the float, on a real clock (seconds): the deck's slow drift, degrees */
const drift = (c: number) => 4 * Math.sin(c * 0.45);
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

  // sizes, in pixels: a cluster card 48% of the screen height, never wider
  // than half the screen (the cluster fans to about twice a card's width);
  // the resting video 69% of the screen height (the mockup), never wider
  // than 88% of the screen. On phones the cluster is pulled in.
  const cardH = Math.min(0.48 * screen.h, 0.52 * screen.w * RATIO);
  const cardW = cardH / RATIO;
  const heroH = Math.min(0.69 * screen.h, 0.88 * screen.w * RATIO);
  const heroW = heroH / RATIO;
  const heroScale = heroH / cardH;
  const spreadScale = layout === "desktop" ? 1 : 0.55;

  // the gather's clock: the scroll through the section. The gather plays
  // over the PLAY_SCREENS gestures after the first stop and then stays put.
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const time = useTransform(scrollYProgress, (p) =>
    reducedMotion ? T.grown : clamp01((p * (SCREENS - 1)) / PLAY_SCREENS) * T.grown,
  );
  // the float's clock: real seconds, still under reduced motion
  const wall = useTime();
  const clock = useTransform(wall, (ms) => (reducedMotion ? 0 : ms / 1000));

  // the opening: on arrival at the first stop the deck swings from one small
  // card out into the floating cluster, on its own clock, once; it rewinds
  // when the whole section has left the screen
  const firstStop = useRef<HTMLDivElement>(null);
  const arrived = useInView(firstStop, { amount: 0.6 });
  const sectionNear = useInView(section, { amount: 0.02 });
  const opening = useMotionValue(0);
  useEffect(() => {
    if (reducedMotion) {
      opening.set(1);
      return;
    }
    if (!sectionNear) {
      opening.set(0);
      return;
    }
    if (arrived && opening.get() < 1) {
      const controls = animate(opening, 1, { duration: OPEN_S, delay: 0.25, ease: "easeInOut" });
      return () => controls.stop();
    }
  }, [arrived, sectionNear, reducedMotion, opening]);

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

  // the deck as a whole: swings open on arrival, drifts while it floats,
  // swings gently as it gathers, fades out under the video
  const deckRotateY = useTransform([time, clock, opening], ([t, c, o]) => {
    const open = burst(o as number) * (1 - gathered(t as number));
    return OPEN_SWING * swing(o as number) + drift(c as number) * open - GATHER_SWING * swing(closing(t as number));
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
          ref={i === 0 ? firstStop : undefined}
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
          perspective: "1600px",
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
              spreadScale={spreadScale}
              time={time}
              clock={clock}
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
  spreadScale,
  time,
  clock,
  opening,
}: {
  card: (typeof CARDS)[number];
  index: number;
  /** pixels forward of the card beneath, when open */
  depth: number;
  spreadScale: number;
  time: MotionValue<number>;
  clock: MotionValue<number>;
  opening: MotionValue<number>;
}) {
  // the inner cards set off a touch later, the outer ones lead
  const lag = 0.03 * index;
  // each card breathes on its own phase: a slow rise and fall, a little
  // sway — the lean stays small so the layering (DEPTH) always holds
  const phase = index * 1.7;
  const bobY = (c: number) => 1.6 * Math.sin(c * 0.8 + phase);
  const sway = (c: number) => 0.9 * Math.sin(c * 0.6 + phase * 1.3);
  const lean = (c: number) => 1.2 * Math.sin(c * 0.5 + phase * 0.7);

  // how far out this card sits: opened by the arrival, closed by the scroll
  const out = (t: number, o: number) => burst(o) * (1 - gathered(t - lag));
  const x = useTransform([time, opening], ([t, o]) => `${card.x * spreadScale * 100 * out(t as number, o as number)}%`);
  const y = useTransform([time, clock, opening], ([t, c, o]) => {
    const s = out(t as number, o as number);
    return `${(card.y * spreadScale * 100 + bobY(c as number)) * s}%`;
  });
  const rotate = useTransform([time, clock, opening], ([t, c, o]) => (card.rotate + sway(c as number)) * out(t as number, o as number));
  const rotateY = useTransform([time, clock, opening], ([t, c, o]) => (card.tilt + lean(c as number)) * out(t as number, o as number));
  // each card a step in front of the one beneath, so none cuts through another
  const z = useTransform([time, opening], ([t, o]) => `${index * depth * out(t as number, o as number)}px`);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden bg-black"
      style={{
        zIndex: index + 1,
        x,
        y,
        z,
        rotate,
        rotateY,
        boxShadow: "0 24px 48px rgba(0,0,0,0.55)",
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
