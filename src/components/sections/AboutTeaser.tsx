"use client";

import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useEffect, useRef, useSyncExternalStore } from "react";

/** The call to action's face (12_TYPOGRAPHY.md). */
const inter = Inter({ weight: "700", subsets: ["latin"], display: "swap" });

/**
 * About — the homepage stop between Selected Works and Explore by Category
 * (04_CONTENT_ARCHITECTURE.md). No text: a deck of ten black-and-white
 * photographs plays the supplied reference clip's motion as the visitor
 * scrolls through the section, then collides into the portrait video.
 *
 * Shape of the reference (5 s):
 *   1. one small card in the middle, facing us;
 *   2. the deck swings away through edge-on and back, fanning into a tilted
 *      cluster as it comes round;
 *   3. the cluster holds with a slow drift;
 *   4. the cards gather as the deck swings away through edge-on again —
 *   5. — and what comes back round is the video, which grows and loops,
 *      with "Click to find out about me" over its lower left corner (the
 *      only text here; Inter Bold, see 12_TYPOGRAPHY.md).
 *
 * Everything is a function of one clock (the reference's seconds), and the
 * clock is driven by the scroll through this several-screens-tall section
 * with a sticky stage: the scene plays forward and back with the visitor,
 * never on its own. Reduced motion shows the end.
 */

/** built by scripts/build-about-video.mjs from assets/about/Animation.mp4 */
const VIDEO = "/about/web-animation.mp4";
const POSTER = "/about/web-animation-poster.webp";
/** the clip's own frame: 1080 x 1399 — the cards share it */
const FRAME_W = 1080;
const FRAME_H = 1399;

/**
 * The cards, bottom to top. Each one's resting place in the cluster as a
 * fraction of the card's own width / height from the middle, with its tilt —
 * art-directed from the reference clip's spread.
 * public/about/cards/<n>.webp, built by scripts/build-about-cards.mjs.
 */
const CARDS: { src: string; x: number; y: number; rotate: number; tilt: number }[] = [
  { src: "/about/cards/7.webp", x: -0.8, y: -0.06, rotate: -4, tilt: 16 },
  { src: "/about/cards/8.webp", x: 0.82, y: -0.08, rotate: 5, tilt: -16 },
  { src: "/about/cards/9.webp", x: 0.12, y: -0.46, rotate: -3, tilt: 6 },
  { src: "/about/cards/10.webp", x: -0.14, y: 0.44, rotate: 3, tilt: -6 },
  { src: "/about/cards/5.webp", x: -0.36, y: -0.4, rotate: 5, tilt: 10 },
  { src: "/about/cards/6.webp", x: 0.4, y: 0.38, rotate: -6, tilt: -10 },
  { src: "/about/cards/3.webp", x: -0.62, y: 0.22, rotate: -7, tilt: 12 },
  { src: "/about/cards/4.webp", x: 0.6, y: 0.24, rotate: 7, tilt: -12 },
  { src: "/about/cards/11.webp", x: -0.42, y: -0.16, rotate: -8, tilt: 8 },
  { src: "/about/cards/2.webp", x: 0.44, y: -0.2, rotate: 6, tilt: -8 },
];

/** A cluster card: 48% of the screen height, never wider than half the
 *  screen (the cluster fans to about twice a card's width). */
const CARD_HEIGHT = `min(48svh, calc(52vw * ${FRAME_H} / ${FRAME_W}))`;

/** The call to action over the resting video (measured off the mockup:
 *  three lines, left-aligned, its left edge a quarter of the video's width
 *  outside the video, its top 73% down it, running past the bottom). */
const CTA_LINES = ["Click to", "find out", "about me"];
const CTA_HREF = "/about";

/** The stage's surface: the supplied black paper (11_VISUAL_ASSETS.md),
 *  as on the Intro and the section titles. */
const TEXTURE = "/textures/black-page.png";

/** The clock, in seconds. */
const T = {
  burstStart: 0.35, // the single card holds first
  burstEnd: 1.25, // the deck has swung round, fanned open
  holdEnd: 3.9, // the cluster starts to gather
  collapseEnd: 4.9, // the deck has swung round again: one small card — the video
  grown: 5.7, // which has grown to its resting size
};
/** how much scrolling the scene takes: this many screens for the animation,
 *  then one more where it holds on the video and the line. Every screen is
 *  a snap stop of its own (like the Selected Work images), so each gesture
 *  plays a third of the scene, the next lands on the hold, and it takes one
 *  more to leave — nobody scrolls past the line. */
const PLAY_SCREENS = 3;
const HOLD_SCREENS = 1;
const SCREENS = PLAY_SCREENS + HOLD_SCREENS;
/** the deck's swing, degrees, at the edge-on midpoint */
const EDGE = 88;
/** the single card at the start and end is this much of a cluster card */
const START_SCALE = 0.5;
/** the resting video is this much taller than a cluster card */
const HERO_SCALE = 1.4;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x: number) => x * x * x;
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

/** 0 → 1 across the opening swing, 0 → 1 across the closing one */
const opening = (t: number) => span(t, T.burstStart, T.burstEnd);
const closing = (t: number) => span(t, T.holdEnd, T.collapseEnd);
/** a swing away through edge-on and back: 0° → ±EDGE → 0° */
const swing = (p: number) => Math.sin(Math.PI * easeInOutSine(p));
const burst = (t: number) => easeOutCubic(opening(t));
const collapse = (t: number) => easeInCubic(closing(t));
/** how far the cards sit from the middle: 0 → 1 → 0 */
const spread = (t: number) => burst(t) * (1 - collapse(t));
/** the slow drift while the cluster holds */
const drift = (t: number) => 4 * Math.sin((t - T.burstEnd) * 0.9);
/** the deck's size: a small card, the full cluster, a small card again */
const deckSize = (t: number) => (START_SCALE + (1 - START_SCALE) * burst(t)) * (1 - (1 - START_SCALE) * collapse(t));

/** On phones the card nearly fills the width, so the cluster is pulled in. */
function useSpread() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => (window.matchMedia("(min-width: 768px)").matches ? 1 : 0.55),
    () => 1,
  );
}

export function AboutTeaser() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const spreadScale = useSpread();

  // the clock: the scroll through the section, as the reference's seconds.
  // The scene is over by the start of the hold screen and stays there.
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const time = useTransform(scrollYProgress, (p) =>
    reducedMotion ? T.grown : clamp01((p * SCREENS) / PLAY_SCREENS) * T.grown,
  );

  // the video only runs while the scene is on screen
  const onScreen = useInView(section, { amount: 0.1 });
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (onScreen) el.play().catch(() => {});
    else el.pause();
  }, [onScreen]);

  // the deck as a whole: swings round, drifts, swings round again
  const deckRotateY = useTransform(time, (t) => {
    const hold = burst(t) * (1 - collapse(t));
    return EDGE * swing(opening(t)) + drift(t) * hold - EDGE * swing(closing(t));
  });
  const deckScale = useTransform(time, deckSize);
  // the cards are the deck until the closing swing is edge-on …
  const deckVisible = useTransform(time, (t) => (closing(t) < 0.5 ? 1 : 0));

  // … and the video is the deck from there: it finishes the same swing at
  // the same size, then grows
  const videoRotateY = useTransform(time, (t) => -EDGE * swing(closing(t)));
  const videoScale = useTransform(time, (t) => deckSize(t) + (HERO_SCALE - START_SCALE) * easeOutCubic(span(t, T.collapseEnd, T.grown)));
  const videoVisible = useTransform(time, (t) => (closing(t) >= 0.5 ? 1 : 0));
  // the call to action fades up as the video settles
  const ctaOpacity = useTransform(time, (t) => easeOutCubic(span(t, T.grown - 0.35, T.grown)));
  const ctaPointer = useTransform(time, (t) => (t >= T.grown - 0.1 ? "auto" : "none"));

  // the resting video's box, for placing the call to action against it
  const heroH = `calc(${CARD_HEIGHT} * ${HERO_SCALE})`;
  const heroW = `calc(${heroH} * ${FRAME_W} / ${FRAME_H})`;
  const phone = spreadScale < 1;

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
          perspective: "1600px",
          transformStyle: "preserve-3d",
          backgroundImage: `url('${TEXTURE}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <motion.div
          className="relative"
          style={{
            aspectRatio: `${FRAME_W} / ${FRAME_H}`,
            height: CARD_HEIGHT,
            rotateY: deckRotateY,
            scale: deckScale,
            opacity: deckVisible,
            transformStyle: "preserve-3d",
          }}
        >
          {CARDS.map((card, i) => (
            <Card key={card.src} card={card} index={i} time={time} spreadScale={spreadScale} />
          ))}
        </motion.div>

        <motion.div
          className="absolute overflow-hidden bg-black"
          style={{
            aspectRatio: `${FRAME_W} / ${FRAME_H}`,
            height: CARD_HEIGHT,
            rotateY: videoRotateY,
            scale: videoScale,
            opacity: videoVisible,
            boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
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

        {/* the call to action, placed against the resting video */}
        <motion.div
          className="absolute"
          style={{
            left: `calc(50% - ${heroW} / 2 - ${heroW} * ${phone ? 0.06 : 0.25})`,
            top: `calc(50% - ${heroH} / 2 + ${heroH} * 0.73)`,
            opacity: ctaOpacity,
            pointerEvents: ctaPointer,
            zIndex: CARDS.length + 2,
          }}
        >
          <Link
            href={CTA_HREF}
            className={`${inter.className} block uppercase text-white focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white focus-visible:outline-solid`}
            style={{
              fontSize: `calc(${heroH} * 0.115)`,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
            }}
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

/** One photograph: from the middle of the stack to its place in the cluster and back. */
function Card({
  card,
  index,
  time,
  spreadScale,
}: {
  card: (typeof CARDS)[number];
  index: number;
  time: MotionValue<number>;
  spreadScale: number;
}) {
  // the inner cards set off a touch later, the outer ones lead
  const lag = 0.04 * (CARDS.length - 1 - index);
  const x = useTransform(time, (t) => `${card.x * spreadScale * 100 * spread(t - lag)}%`);
  const y = useTransform(time, (t) => `${card.y * spreadScale * 100 * spread(t - lag)}%`);
  const rotate = useTransform(time, (t) => card.rotate * spread(t - lag));
  const rotateY = useTransform(time, (t) => card.tilt * spread(t - lag));
  // the cluster sits in front of the deck's plane a little, card by card
  const z = useTransform(time, (t) => `${index * 6 * spread(t - lag)}px`);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden bg-black"
      style={{ zIndex: index + 1, x, y, z, rotate, rotateY, boxShadow: "0 30px 60px rgba(0,0,0,0.55)", backfaceVisibility: "hidden" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- one fixed size, moved with transforms */}
      <img src={card.src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
    </motion.div>
  );
}
