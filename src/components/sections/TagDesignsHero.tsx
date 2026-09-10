"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { HERO_CHROME } from "@/content/tag-designs-hero";
import type { HeroImage } from "@/lib/hero-images";

/**
 * Timing measured off the reference clip (576x720 @ 30fps) by sampling the
 * frame-centre pixel every frame: the centre card changes on a steady
 * ~0.67s beat (24 arrivals over 16s), and each change is over within
 * 0.07–0.17s — a rest-then-snap rhythm, not a continuous glide. The stage
 * background cross-fades to the new hero's tone over ~0.4s around each
 * arrival (sampled at the frame edge the same way).
 */
const CYCLE_MS = 667;
const MOVE_S = 0.26;
const BG_FADE_S = 0.4;
// Fast decisive settle (expo-out) rather than a symmetric ease — the snap
// should feel weighted arriving, not identical in both directions.
const SNAP_EASE = [0.16, 1, 0.3, 1] as const;
/** How long to wait for every illustration to decode before revealing the stage regardless (slow network) — the queue is running underneath either way. */
const PRELOAD_TIMEOUT_MS = 4000;
const REVEAL_S = 0.6;

/**
 * One queue, one journey, travelling UPWARD: every illustration enters
 * below the frame, climbs through the same waypoints and leaves above —
 * in the reference the tier directly under the hero is always the next
 * hero (frames 1.0s → 1.5s: the portrait sits below the blue card, then IS
 * the centre, with the blue card now peeking above it). Positions/sizes
 * measured from the clip at 480x600: a symmetric hourglass, narrow peeks
 * at top and bottom, dominant 50%-wide 4:5 card at centre; every tier is
 * horizontally centred (no arc). `top` is % of the stage height, `width` %
 * of the stage width. Index 0 and 8 are off-screen (enter below, exit
 * above) — invisible, used only as animation start/end points.
 */
const WAYPOINTS = [
  { top: 96, width: 20, opacity: 0, zIndex: 5 }, // 0: enter, off-screen below
  { top: 65.8, width: 25, opacity: 1, zIndex: 10 }, // 1: bottom peek
  { top: 52.2, width: 31, opacity: 1, zIndex: 20 }, // 2: lower-mid
  { top: 38.3, width: 40, opacity: 1, zIndex: 30 }, // 3: lower tier (next up)
  { top: 23.8, width: 50, opacity: 1, zIndex: 40 }, // 4: CENTER — the hero
  { top: 20, width: 40, opacity: 1, zIndex: 30 }, // 5: upper tier
  { top: 15, width: 31, opacity: 1, zIndex: 20 }, // 6: upper-mid
  { top: 8.3, width: 25, opacity: 1, zIndex: 10 }, // 7: top peek
  { top: -22, width: 20, opacity: 0, zIndex: 5 }, // 8: exit, off-screen above
] as const;

const FIRST_WAYPOINT = 1;
const LAST_WAYPOINT = 7;
const EXIT_WAYPOINT = 8;
const CENTER_WAYPOINT = 4;
/** Every card's box is laid out at the CENTRE tier's width; other tiers are that box scaled down (transform), never re-laid-out. */
const BASE_WIDTH_PCT = WAYPOINTS[CENTER_WAYPOINT].width;

/** The reference's centre card is 240x300 at 480x600 — a plain 4:5 portrait; every tier shares it (object-cover crops the artwork to fit). */
const CARD_ASPECT = "4/5";

interface Traveler {
  id: number;
  imageIndex: number;
  position: number; // index into WAYPOINTS, always 1-7 while in state
  /** Laid down as part of the opening stack — renders straight at its tier, no entry flight. */
  preplaced: boolean;
}

interface StageSize {
  width: number;
  height: number;
}

/**
 * Transform-only motion: y in px (from the measured stage height) and a
 * uniform scale about the card's top-centre, so the visual top edge lands
 * exactly on the tier's `top` and the width shrinks symmetrically — the
 * same picture as animating top/width, but composited on the GPU instead
 * of re-laying-out seven large images every frame, which is what made the
 * previous version hitch on the snaps.
 */
function poseFor(position: number, stage: StageSize) {
  const wp = WAYPOINTS[position];
  return {
    y: (wp.top / 100) * stage.height,
    scale: wp.width / BASE_WIDTH_PCT,
    opacity: wp.opacity,
    zIndex: wp.zIndex,
  };
}

function Card({
  image,
  position,
  preplaced,
  stage,
  reduceMotion,
}: {
  image: HeroImage;
  position: number;
  preplaced: boolean;
  stage: StageSize;
  reduceMotion: boolean;
}) {
  const target = poseFor(position, stage);
  const instant = reduceMotion || preplaced;
  return (
    <motion.div
      // Square corners, no drop shadow: the reference's posters are flat
      // cut-outs stacked on a coloured ground, not floating cards.
      className="absolute left-1/2 top-0 overflow-hidden will-change-transform"
      style={{
        width: `${BASE_WIDTH_PCT}%`,
        aspectRatio: CARD_ASPECT,
        x: "-50%",
        transformOrigin: "top center",
      }}
      initial={instant ? false : poseFor(0, stage)}
      animate={target}
      exit={reduceMotion ? undefined : poseFor(EXIT_WAYPOINT, stage)}
      transition={reduceMotion ? { duration: 0 } : { duration: MOVE_S, ease: SNAP_EASE }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic, server-enumerated file list; can't be a static next/image import */}
      <img
        src={image.src}
        alt={image.alt}
        className="h-full w-full object-cover"
        style={{ objectPosition: image.objectPosition }}
        decoding="async"
      />
    </motion.div>
  );
}

/** One thin editorial row — three small uppercase cells, left / centre / right, like the reference's "FRIDAY · CURATED INSPIRATION · FOR YOU" header and its boxed footer strapline. */
function ChromeRow({ cells, boxed }: { cells: readonly [string, string, string]; boxed?: boolean }) {
  const cell = "font-sans text-[10px] uppercase tracking-[0.18em] text-off-white/90 sm:text-[11px]";
  if (boxed) {
    return (
      <div className="flex w-full gap-1.5 px-3 pb-3 sm:px-4 sm:pb-4">
        <div className={`${cell} flex-1 border border-off-white/60 px-2.5 py-1.5`}>{cells[0]}</div>
        <div className={`${cell} flex-[1.4] border border-off-white/60 px-2.5 py-1.5 text-center`}>{cells[1]}</div>
        <div className={`${cell} border border-off-white/60 px-2.5 py-1.5`}>{cells[2]}</div>
      </div>
    );
  }
  return (
    <div className="grid w-full grid-cols-3 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className={cell}>{cells[0]}</div>
      <div className={`${cell} text-center`}>{cells[1]}</div>
      <div className={`${cell} text-right`}>{cells[2]}</div>
    </div>
  );
}

/**
 * The opening stack: every visible tier already occupied, as if the queue
 * had been running for a while — the page never shows an empty ground or
 * a lone first card. Tiers are filled so that folder order still flows
 * bottom-to-top (image 0 at the top peek, about to leave; the next new
 * arrival continues the sequence from there).
 */
function openingStack(imageCount: number): Traveler[] {
  const tiers = LAST_WAYPOINT - FIRST_WAYPOINT + 1;
  return Array.from({ length: tiers }, (_, i) => ({
    id: i,
    imageIndex: (tiers - 1 - i) % imageCount,
    position: FIRST_WAYPOINT + i,
    preplaced: true,
  }));
}

/**
 * A single continuous conveyor: one queue of illustrations moving through a
 * fixed sequence of positions, all in lockstep. Every ~670ms the entire
 * queue advances one waypoint together — nothing swaps independently,
 * nothing flashes. Exactly one illustration occupies centre (the hero) at
 * any moment; everything else is the same artwork at an earlier or later
 * stage of the same journey (growing toward centre, shrinking away from
 * it). Illustrations enter strictly in folder order and wrap after the
 * last — a plain round-robin over `imageCounterRef`, so every image gets
 * its turn at centre exactly once per full lap before any repeats, none
 * are skipped, and the sequence is fully deterministic (never random).
 *
 * It's already running when you get there: the stack is pre-filled (see
 * openingStack), the beat starts on mount, and the stage is revealed with
 * a short fade only once every illustration has decoded — so what appears
 * is a full, moving stack of finished images, never cards popping in or
 * artwork loading in place.
 *
 * The whole section's background follows the hero: each illustration
 * carries its own muted tone (see HERO_IMAGE_META.bg) and the ground
 * cross-fades to it as that card lands at centre, exactly as the
 * reference clip tints its frame per poster.
 */
export function TagDesignsHero({ images }: { images: HeroImage[] }) {
  const prefersReducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(LAST_WAYPOINT - FIRST_WAYPOINT + 1);
  const imageCounterRef = useRef(LAST_WAYPOINT - FIRST_WAYPOINT + 1);

  const [travelers, setTravelers] = useState<Traveler[]>(() => openingStack(Math.max(1, images.length)));
  const [stage, setStage] = useState<StageSize>({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  // Stage size in px (for the transform-based poses) — kept in sync with
  // the viewport via ResizeObserver; positions are recomputed from the
  // same percentages, so the composition is identical at every size.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ width: el.clientWidth, height: el.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Decode every illustration up front, then reveal — with a cap so a slow
  // connection still gets the (running) stage rather than a blank ground.
  useEffect(() => {
    if (images.length === 0) return;
    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setReady(true);
    };
    const timeout = setTimeout(reveal, PRELOAD_TIMEOUT_MS);
    Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => img.decode().then(resolve, () => resolve());
            img.onerror = () => resolve();
            img.src = image.src;
          }),
      ),
    ).then(reveal);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [images]);

  useEffect(() => {
    if (images.length === 0 || prefersReducedMotion) return;

    function advance() {
      setTravelers((prev) => {
        const advanced = prev
          .map((t) => ({ ...t, position: t.position + 1, preplaced: false }))
          .filter((t) => t.position <= LAST_WAYPOINT);
        const newTraveler: Traveler = {
          id: idRef.current++,
          imageIndex: imageCounterRef.current % images.length,
          position: FIRST_WAYPOINT,
          preplaced: false,
        };
        imageCounterRef.current += 1;
        return [...advanced, newTraveler];
      });
    }

    const interval = setInterval(advance, CYCLE_MS);
    return () => clearInterval(interval);
  }, [images.length, prefersReducedMotion]);

  if (images.length === 0) return null;

  const hero = travelers.find((t) => t.position === CENTER_WAYPOINT);
  const groundColor = hero ? images[hero.imageIndex].bg : "#141414";

  return (
    <motion.section
      className="relative flex h-[100svh] w-full flex-col items-center justify-between overflow-hidden lg:h-screen"
      initial={false}
      animate={{ backgroundColor: groundColor }}
      transition={{ duration: prefersReducedMotion ? 0 : BG_FADE_S, ease: "easeInOut" }}
    >
      <ChromeRow cells={HERO_CHROME.header} />

      {/* The stage: the reference's own 4:5 frame, as tall as the room
          between the two chrome rows allows, centred. Card poses are
          derived from this box's measured size, so the composition holds
          at any viewport. */}
      <div className="relative min-h-0 w-full flex-1">
        <motion.div
          ref={stageRef}
          className="absolute top-1/2 left-1/2 aspect-[4/5] -translate-x-1/2 -translate-y-1/2"
          // Height-limited, but never wider than the viewport (narrow
          // phones): 4:5 means width = height / 1.25, so cap height at
          // 125vw and aspect-ratio derives the width.
          style={{ height: "min(100%, 125vw)" }}
          initial={false}
          animate={{ opacity: ready && stage.height > 0 ? 1 : 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : REVEAL_S, ease: "easeOut" }}
        >
          {stage.height > 0 && (
            <AnimatePresence>
              {travelers.map((t) => (
                <Card
                  key={t.id}
                  image={images[t.imageIndex]}
                  position={t.position}
                  preplaced={t.preplaced}
                  stage={stage}
                  reduceMotion={!!prefersReducedMotion}
                />
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      </div>

      <ChromeRow cells={HERO_CHROME.footer} boxed />
    </motion.section>
  );
}
