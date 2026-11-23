"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

import { SKATE_TV_ID } from "@/content/projects/skateboard-designs";
import { TEXTURES, textureStyle } from "@/lib/textures";

// WebGL — client-only, and only fetched once the section is near
const TvScene = dynamic(() => import("./TvScene").then((m) => m.TvScene), { ssr: false });

/**
 * Below the deck wall: the retro TV playing the campaign, one screen tall
 * on the black page texture. The 3D scene (and its ~3 MB of model and clip)
 * only loads as the section approaches, draws only while it is on screen,
 * and fades in once the TV is up.
 */
export function TvSection() {
  const section = useRef<HTMLElement>(null);
  const near = useInView(section, { margin: "100% 0px", once: true });
  const onScreen = useInView(section);
  const reducedMotion = Boolean(useReducedMotion());
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const [touched, setTouched] = useState(false);

  return (
    <section
      ref={section}
      id={SKATE_TV_ID}
      aria-label="The campaign, playing on a stickered retro TV"
      className="relative h-[100svh] w-full overflow-hidden"
      style={textureStyle(TEXTURES.black)}
      onPointerDown={() => setTouched(true)}
    >
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.8, ease: "easeOut" }}
      >
        {near ? <TvScene running={onScreen} reducedMotion={reducedMotion} onReady={onReady} /> : null}
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

      <p
        className="font-sans pointer-events-none absolute inset-x-0 bottom-6 text-center text-[9px] tracking-[0.16em] text-off-white/70 uppercase transition-opacity duration-700 sm:bottom-8 sm:text-[10px]"
        style={{ opacity: ready && !touched ? 1 : 0 }}
      >
        Drag to turn it around
      </p>
    </section>
  );
}
