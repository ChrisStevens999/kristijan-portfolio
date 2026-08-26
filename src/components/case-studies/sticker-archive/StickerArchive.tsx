"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import {
  useScroll,
  useSpring,
  useReducedMotion,
  useMotionValue,
} from "framer-motion";

import { NextProjectNav } from "@/components/ui/NextProjectNav";
import type { Category } from "@/content/types";

// WebGL/canvas — client-only, no SSR.
const StickerScene = dynamic(() => import("./StickerScene").then((m) => m.StickerScene), {
  ssr: false,
});

/**
 * Interactive sticker archive — a real three.js cylinder (StickerScene) that
 * rotates and travels vertically as ONE rigid object as the page scrolls;
 * stickers are fixed to its surface, not independently animated.
 *
 * A tall (~320vh) scroll section with a sticky 100vh stage. Scroll progress
 * drives the cylinder group's rotation/position directly (not autoplay); a
 * weighted spring adds inertia without bounce. The exit nav returns to the
 * category. Reduced motion freezes the composition and drops the tall
 * scroll region.
 *
 * The editorial HUD (StickerArchiveHUD — collection counter, "scroll to
 * explore", etc.) and the click-to-inspect StickerViewer are deliberately
 * NOT rendered right now: this pass is judging only black background + pole
 * + real cylindrical wrapping + rotation + vertical travel, matching the
 * reference video. Click-to-inspect needs a raycast-to-UV bridge against the
 * atlas (individual stickers are no longer separate objects) — add that,
 * and re-add `<StickerArchiveHUD total={STICKER_COUNT} />`, once this core
 * motion is approved.
 */
export function StickerArchive({ category }: { category: Category }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Weighted, slightly-lagged follow. High damping / no overshoot keeps it
  // premium rather than springy.
  const smoothed = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 26,
    mass: 1,
  });

  // Reduced motion: freeze at a static angle/position, no scroll binding.
  const frozen = useMotionValue(0.4);
  const progress = reduce ? frozen : smoothed;

  return (
    <main className="bg-black text-off-white">
      <section
        ref={sectionRef}
        className="relative"
        style={{ height: reduce ? "100vh" : "320vh" }}
      >
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black">
          <StickerScene progress={progress} />
        </div>
      </section>

      <NextProjectNav mode="back-to-category" category={category} />
    </main>
  );
}
