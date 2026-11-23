"use client";

import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

import { SKATE_TV_ID } from "@/content/projects/skateboard-designs";
import { TEXTURES, textureStyle } from "@/lib/textures";

// WebGL — client-only, and only fetched once the section is near
const TvScene = dynamic(() => import("./TvScene").then((m) => m.TvScene), { ssr: false });

/** the share of the section's scroll the camera move takes; the rest holds on the screen */
const MOVE = 0.8;

/**
 * Below the deck wall: the retro TV playing the campaign, on the black page
 * texture. The section is a tall scroll track with one pinned screen: the
 * TV arrives showing its stickered side, and scrolling brings the camera
 * round to the front and in on the screen, then holds there to watch the
 * clip before the page moves on. Scrolling back reverses it.
 *
 * Reduced motion: no track and no camera move (one screen tall, the TV
 * facing the visitor). The height is set in CSS so the server and the
 * browser agree on it.
 *
 * The 3D scene (and its ~3 MB of model and clip) only loads as the section
 * approaches, draws only while it is on screen, and fades in once the TV is
 * up.
 */
export function TvSection() {
  const section = useRef<HTMLElement>(null);
  const near = useInView(section, { margin: "100% 0px", once: true });
  const onScreen = useInView(section);
  const reducedMotion = Boolean(useReducedMotion());
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  // from the section's top reaching mid-screen (the TV is half in view,
  // side on) to its last screen being pinned
  const { scrollYProgress } = useScroll({ target: section, offset: ["start 0.5", "end end"] });
  const move = useTransform(scrollYProgress, [0, MOVE], [0, 1], { clamp: true });
  const cue = useTransform(scrollYProgress, [0.02, 0.2], [1, 0], { clamp: true });

  return (
    <section
      ref={section}
      id={SKATE_TV_ID}
      aria-label="The campaign, playing on a stickered retro TV"
      className="relative h-[260svh] w-full motion-reduce:h-[100svh]"
      style={textureStyle(TEXTURES.black)}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, ease: "easeOut" }}
        >
          {near ? <TvScene running={onScreen} progress={move} reducedMotion={reducedMotion} onReady={onReady} /> : null}
        </motion.div>

        <AnimatePresence>
          {!ready && (
            <motion.p
              key="loading"
              className="pointer-events-none absolute inset-0 grid place-items-center font-accent text-[0.65rem] tracking-[0.3em] text-off-white/70 uppercase"
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              role="status"
            >
              Tuning in
            </motion.p>
          )}
        </AnimatePresence>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-6 transition-opacity duration-700 motion-reduce:hidden sm:bottom-8"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <motion.p
            className="font-sans text-center text-[9px] tracking-[0.16em] text-off-white/70 uppercase sm:text-[10px]"
            style={{ opacity: cue }}
          >
            Keep scrolling to tune in ↓
          </motion.p>
        </div>
      </div>
    </section>
  );
}
