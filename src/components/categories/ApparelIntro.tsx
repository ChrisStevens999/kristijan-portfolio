"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { ApparelHero } from "./ApparelHero";
import { APPAREL_HERO_LAYERS } from "./apparelHeroLayers";

/** The cover's intro runs ~3 s (background, letters, angel); hold a beat. */
const PLAY_MS = 4300;
const FADE_S = 0.7;
/** Never wait longer than this for the scene's images before playing. */
const LOAD_CAP_MS = 4000;

/**
 * True once heavy page content may mount. While the intro plays, the page
 * underneath holds back anything that would stall the main thread (WebGL
 * scene setup, big image decodes) — otherwise that work lands mid-animation
 * as a visible stutter (measured: 90–160 ms freezes while the letters were
 * moving). It opens the moment the fade to black starts: the fade itself
 * runs on the compositor, so the setup is hidden by it, and the content is
 * up by the time the black lifts. Defaults to true, so components work
 * unchanged outside an intro.
 */
const IntroSettledContext = createContext(true);
export const useIntroSettled = () => useContext(IntroSettledContext);

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.src = src;
    // decode() resolves once the image is ready to paint without a hitch
    img.decode().then(resolve, () => resolve());
  });
}

/**
 * Entering the Apparel work: the animated cover plays full screen, then
 * fades to black and the page's content fades in underneath.
 *
 *  - The scene only starts once its three layers are downloaded and decoded
 *    (black until then), so it never plays over half-loaded images.
 *  - `preload`: files the page underneath will need (3D model, textures…);
 *    fetched quietly once the scene is up so they are cached by the time the
 *    page mounts them.
 *  - Skippable — any click, key, wheel or touch goes straight to the fade.
 *  - Reduced-motion visitors get the content immediately.
 */
export function ApparelIntro({ children, preload }: { children: ReactNode; preload?: string[] }) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false); // scene images decoded
  const [playing, setPlaying] = useState(true);
  const showIntro = playing && !reduced;

  // 1. get the scene's layers ready
  useEffect(() => {
    if (!showIntro) return;
    let cancelled = false;
    const go = () => !cancelled && setReady(true);
    const cap = setTimeout(go, LOAD_CAP_MS);
    Promise.all(APPAREL_HERO_LAYERS.map(preloadImage)).then(go);
    return () => {
      cancelled = true;
      clearTimeout(cap);
    };
  }, [showIntro]);

  // 2. play; warm the cache for the page underneath; then fade
  useEffect(() => {
    if (!showIntro || !ready) return;
    preload?.forEach((url) => {
      fetch(url, { priority: "low" } as RequestInit).catch(() => {});
    });
    const end = setTimeout(() => setPlaying(false), PLAY_MS);
    return () => clearTimeout(end);
  }, [showIntro, ready, preload]);

  // no scrolling the page underneath while it plays; any input skips
  useEffect(() => {
    if (!showIntro) return;
    const skip = (e: Event) => {
      if (e.type === "wheel" || e.type === "touchmove") e.preventDefault();
      setPlaying(false);
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
              {ready && <ApparelHero fit="screen" />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the page itself, hidden until the intro has gone to black */}
      <motion.div
        initial={false}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: showIntro || reduced ? 0 : FADE_S }}
      >
        <IntroSettledContext.Provider value={!showIntro}>{children}</IntroSettledContext.Provider>
      </motion.div>
    </>
  );
}
