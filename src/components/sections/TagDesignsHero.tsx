"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import type { HeroImage } from "@/lib/hero-images";

/**
 * Timing measured directly off the reference clip by sampling a fixed pixel
 * at frame-center every 50ms: color holds near-constant for ~450-550ms, then
 * snaps to the next value over ~150-200ms, repeating on a ~650-700ms beat.
 * This is a rest-then-snap rhythm, not a continuous glide — each waypoint is
 * a real stop, not a way station. That hold is what makes the center read as
 * "arrived" rather than "passing through," and its absence (the previous
 * build moved for 95% of every cycle) is what made the whole thing read as a
 * conveyor belt.
 */
const CYCLE_MS = 700;
const MOVE_S = 0.22;
// Fast decisive settle (expo-out) rather than a symmetric ease — the snap
// should feel weighted arriving, not identical in both directions.
const SNAP_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One queue, one journey. Every illustration travels through the exact same
 * 9 waypoints, in order — nothing changes independently, nothing swaps in
 * place. Positions/sizes measured directly from the reference clip (canvas
 * pixel analysis at 720x900): a symmetric hourglass, narrow at the top and
 * bottom peeks, dominant at center. Horizontal position was re-verified by
 * sampling the content centroid at multiple vertical bands across the whole
 * clip — it never moves off x-center, so there is no horizontal arc to the
 * path; it's vertical-only. Index 0 and 8 are off-screen (enter above, exit
 * below) — invisible, used only as animation start/end points.
 */
const WAYPOINTS = [
  { top: -18, width: 20, opacity: 0, zIndex: 5 }, // 0: enter, off-screen above
  { top: 8, width: 26, opacity: 1, zIndex: 10 }, // 1: top peek
  { top: 16, width: 30, opacity: 1, zIndex: 20 }, // 2: upper-mid
  { top: 19.6, width: 40, opacity: 1, zIndex: 30 }, // 3: upper tier
  { top: 26.7, width: 50, opacity: 1, zIndex: 40 }, // 4: CENTER — the hero
  { top: 43.6, width: 40, opacity: 1, zIndex: 30 }, // 5: lower tier
  { top: 56.4, width: 30, opacity: 1, zIndex: 20 }, // 6: lower-mid
  { top: 68.1, width: 26, opacity: 1, zIndex: 10 }, // 7: bottom peek
  { top: 90, width: 20, opacity: 0, zIndex: 5 }, // 8: exit, off-screen below
] as const;

const FIRST_WAYPOINT = 1;
const LAST_WAYPOINT = 7;
const EXIT_WAYPOINT = 8;

/** Each traveler's own card shape (measured from the reference's center card: 358x414px) — independent of the source illustration's aspect ratio, since object-cover crops to fill it. */
const CARD_ASPECT = "358/414";

interface Traveler {
  id: number;
  imageIndex: number;
  position: number; // index into WAYPOINTS, always 1-7 while in state
}

const CENTER_WAYPOINT = 4;

function Card({
  image,
  position,
  reduceMotion,
}: {
  image: HeroImage;
  position: number;
  reduceMotion: boolean;
}) {
  const target = WAYPOINTS[position];
  const isCenter = position === CENTER_WAYPOINT;
  const targetProps = {
    top: `${target.top}%`,
    width: `${target.width}%`,
    opacity: target.opacity,
    zIndex: target.zIndex,
    boxShadow: isCenter
      ? "0 24px 60px rgba(0,0,0,0.55)"
      : "0 6px 18px rgba(0,0,0,0.3)",
  };
  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-2xl"
      style={{ aspectRatio: CARD_ASPECT }}
      initial={
        reduceMotion
          ? targetProps
          : { top: `${WAYPOINTS[0].top}%`, width: `${WAYPOINTS[0].width}%`, opacity: 0 }
      }
      animate={targetProps}
      exit={
        reduceMotion
          ? undefined
          : { top: `${WAYPOINTS[EXIT_WAYPOINT].top}%`, width: `${WAYPOINTS[EXIT_WAYPOINT].width}%`, opacity: 0 }
      }
      transition={reduceMotion ? { duration: 0 } : { duration: MOVE_S, ease: SNAP_EASE }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic, server-enumerated file list; can't be a static next/image import */}
      <img
        src={image.src}
        alt={image.alt}
        className="h-full w-full object-cover"
        style={{ objectPosition: image.objectPosition }}
      />
    </motion.div>
  );
}

/**
 * A single continuous conveyor: one queue of illustrations moving through a
 * fixed sequence of positions, all in lockstep. Every ~700ms the entire
 * queue advances one waypoint together — nothing swaps independently,
 * nothing flashes. Exactly one illustration occupies center (the hero) at
 * any moment; everything else is the same artwork at an earlier or later
 * stage of the same journey (growing toward center, shrinking away from
 * it). Illustrations enter strictly in folder order (index 0, 1, 2, ...)
 * and wrap back to 0 after the last — a plain round-robin over
 * `imageCounterRef`, so every image gets its turn at center exactly once
 * per full lap before any repeats, none are skipped, and the sequence is
 * fully deterministic (never random). The stage starts empty and fills one
 * illustration at a time — every image, including the first, plays the
 * exact same off-screen-top-to-off-screen-bottom journey; none are
 * pre-placed mid-journey.
 */
export function TagDesignsHero({ images }: { images: HeroImage[] }) {
  const prefersReducedMotion = useReducedMotion();
  const idRef = useRef(0);
  const imageCounterRef = useRef(0);

  const [travelers, setTravelers] = useState<Traveler[]>([]);

  useEffect(() => {
    if (images.length === 0) return;

    function advance() {
      setTravelers((prev) => {
        const advanced = prev
          .map((t) => ({ ...t, position: t.position + 1 }))
          .filter((t) => t.position <= LAST_WAYPOINT);
        const newTraveler: Traveler = {
          id: idRef.current++,
          imageIndex: imageCounterRef.current % images.length,
          position: FIRST_WAYPOINT,
        };
        imageCounterRef.current += 1;
        return [...advanced, newTraveler];
      });
    }

    if (prefersReducedMotion) {
      // Skip the queue choreography entirely: freeze the first images (in
      // the same deterministic order) across the visible tiers, no motion.
      const slots = Math.min(images.length, LAST_WAYPOINT - FIRST_WAYPOINT + 1);
      setTravelers(
        Array.from({ length: slots }, (_, i) => ({
          id: i,
          imageIndex: i,
          position: FIRST_WAYPOINT + i,
        })),
      );
      return;
    }

    advance();
    const interval = setInterval(advance, CYCLE_MS);
    return () => clearInterval(interval);
  }, [images.length, prefersReducedMotion]);

  if (images.length === 0) return null;

  return (
    <section className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden bg-black px-6 lg:h-screen">
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[640px]">
        <AnimatePresence>
          {travelers.map((t) => (
            <Card
              key={t.id}
              image={images[t.imageIndex]}
              position={t.position}
              reduceMotion={!!prefersReducedMotion}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
