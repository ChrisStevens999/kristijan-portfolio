"use client";

import { useRef, useState } from "react";
import {
  useScroll,
  useSpring,
  useReducedMotion,
  useMotionValue,
} from "framer-motion";

import { NextProjectNav } from "@/components/ui/NextProjectNav";
import { stickers } from "@/content/projects/sticker-archive";
import type { Category } from "@/content/types";
import { StickerCylinder } from "./StickerCylinder";
import { StickerViewer } from "./StickerViewer";

/**
 * Interactive sticker archive — a sticker-covered galvanized pole that rotates
 * and drifts as the page scrolls.
 *
 * A tall (~320vh) scroll section with a sticky 100vh stage. Scroll progress
 * drives cylinder rotation directly (not autoplay); a weighted spring adds
 * inertia without bounce. The exit nav returns to the category. Reduced
 * motion freezes the composition and drops the tall scroll region.
 *
 * The editorial HUD (StickerArchiveHUD — collection counter, "scroll to
 * explore", etc.) is deliberately NOT rendered right now: this is a physics
 * pass judging only black background + pole + stickers + application +
 * cylindrical wrapping. Re-add `<StickerArchiveHUD total={STICKER_COUNT} />`
 * once that motion is approved.
 */
export function StickerArchive({ category }: { category: Category }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);

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

  // Reduced motion: freeze at a static angle, no scroll binding. Past every
  // sticker's appliedAt + APPLY_WINDOW (max 0.95 + 0.035) so a
  // reduced-motion visitor sees the complete, fully-applied pole rather than
  // the sparse early-accumulation state.
  const frozen = useMotionValue(0.995);
  const progress = reduce ? frozen : smoothed;

  return (
    <main className="bg-black text-off-white">
      <section
        ref={sectionRef}
        className="relative"
        style={{ height: reduce ? "100vh" : "320vh" }}
      >
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black">
          <StickerCylinder
            stickers={stickers}
            progress={progress}
            onSelect={setSelected}
          />
        </div>
      </section>

      <StickerViewer
        stickers={stickers}
        index={selected}
        onClose={() => setSelected(null)}
        onNavigate={setSelected}
      />

      <NextProjectNav mode="back-to-category" category={category} />
    </main>
  );
}
