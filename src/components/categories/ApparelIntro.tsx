"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import { ApparelHero } from "./ApparelHero";

/** The cover's intro runs ~3 s (background, letters, angel); hold a beat. */
const PLAY_MS = 4300;
const FADE_S = 0.7;

/**
 * Entering the Apparel category: the animated cover plays full screen, then
 * fades to black and the category's content fades in underneath.
 *
 * Skippable — any click, key, wheel or touch goes straight to the fade.
 * Reduced-motion visitors get the content immediately.
 */
export function ApparelIntro({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const showIntro = playing && !reduced;

  useEffect(() => {
    if (!showIntro) return;
    const done = () => setPlaying(false);
    const timer = setTimeout(done, PLAY_MS);
    // no scrolling the page underneath while it plays; any input skips
    const skip = (e: Event) => {
      if (e.type === "wheel" || e.type === "touchmove") e.preventDefault();
      done();
    };
    const opts = { passive: false } as const;
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("touchmove", skip, opts);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [showIntro]);

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="apparel-intro"
            className="fixed inset-0 z-[100] bg-[#000]"
            role="presentation"
            aria-hidden
            // fade the scene to black, then drop the black
            exit={{ opacity: 0, transition: { duration: 0.35, delay: FADE_S } }}
          >
            <motion.div className="absolute inset-0" exit={{ opacity: 0, transition: { duration: FADE_S, ease: "easeIn" } }}>
              <ApparelHero fit="screen" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the category itself, hidden until the intro has gone to black */}
      <motion.div
        initial={false}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: showIntro || reduced ? 0 : FADE_S }}
      >
        {children}
      </motion.div>
    </>
  );
}
