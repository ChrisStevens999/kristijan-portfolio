"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";

// WebGL — client-only.
const StatueScene = dynamic(() => import("./StatueScene").then((m) => m.StatueScene), { ssr: false });

/**
 * Lab demo: one 3D object on pure black. It opens in the dark, close on
 * the visor as it flickers on in red; then the lights come up and the
 * camera pulls back to the whole statue. The pointer is the light: the
 * statue is lit from wherever the pointer is and turns to follow it. With
 * no pointer (phones, or an idle mouse) the light wanders by itself.
 */
export function StatueShowcase() {
  const reducedMotion = Boolean(useReducedMotion());
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const [revealed, setRevealed] = useState(false);
  const onRevealed = useCallback(() => setRevealed(true), []);
  return (
    <main className="relative h-[100svh] w-full overflow-hidden bg-[#000] text-off-white">
      <h1 className="sr-only">3D statue showcase</h1>
      <div className="absolute inset-0 touch-none">
        <StatueScene reducedMotion={reducedMotion} onReady={onReady} onRevealed={onRevealed} />
      </div>

      {/* the model is a few MB — say so while it arrives, instead of a blank black page */}
      <AnimatePresence>
        {!ready && (
          <motion.p
            className="pointer-events-none absolute inset-0 grid place-items-center font-accent text-[0.65rem] uppercase tracking-[0.3em] text-off-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.35, 1, 0.35] }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            role="status"
          >
            Loading model
          </motion.p>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-24 font-accent text-[0.65rem] uppercase tracking-[0.25em] text-off-white/45 sm:px-8">
        <span>Lab / 3D experiment</span>
        <Link href="/" className="pointer-events-auto text-right leading-tight transition-colors hover:text-off-white">
          Chris
          <br />
          Stevens
        </Link>
      </div>
      <p
        className="pointer-events-none absolute inset-x-0 bottom-6 text-center font-accent text-[0.65rem] uppercase tracking-[0.25em] text-off-white/45 transition-opacity duration-700"
        // appears once the opening (visor flicker, then the zoom-out) has played
        style={{ opacity: revealed ? 1 : 0 }}
      >
        Move the light
      </p>
    </main>
  );
}
