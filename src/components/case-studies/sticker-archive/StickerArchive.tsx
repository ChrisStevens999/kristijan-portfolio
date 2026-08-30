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
 * A tall (~560vh) scroll section with a sticky 100vh stage. Bumped up from
 * 320vh when rotation was increased to a near-full 340° revolution —
 * without more scroll distance, the same physical scroll motion would spin
 * the pole ~1.9x faster than before, reading as a quick spin rather than
 * the slow/heavy/controlled turn the reference has. This isn't a literal
 * degrees-per-pixel match to the old pace (that would need ~900vh, too
 * long for a portfolio page) — it's a middle ground that still gives each
 * hero sticker's moment enough scroll distance to actually look at it.
 * Scroll progress drives the cylinder group's rotation/position directly
 * (not autoplay); a tight spring removes raw scroll jitter without adding
 * perceptible lag. The exit nav returns to the category. Reduced motion
 * freezes the composition and drops the tall scroll region.
 *
 * The editorial HUD (StickerArchiveHUD — collection counter, "scroll to
 * explore", etc.) and the click-to-inspect StickerViewer are deliberately
 * NOT rendered right now: this pass is judging only black background + pole
 * + real cylindrical wrapping + rotation + vertical travel, matching the
 * reference video. Click-to-inspect needs a raycast-to-UV bridge against the
 * atlas (individual stickers are no longer separate objects) — add that,
 * and re-add `<StickerArchiveHUD total={STICKER_COUNT} />`, once this core
 * motion is approved.
 *
 * INTEGRATION PASS (entrance/exit): the outer section's height and the
 * sticky stage's height both use `svh` (small viewport height — the
 * mobile-safe, address-bar-visible basis), not a `vh`/`svh` mix. They used
 * to differ (section in `vh`, sticky stage in `svh`) — harmless on desktop
 * where the two units are identical, but on a mobile browser `vh` and `svh`
 * can disagree by the height of the address bar, which throws off exactly
 * where `position: sticky` actually releases relative to where
 * `useScroll`'s `"end end"` offset computes progress = 1 (that offset
 * measures the section's real rendered height, whichever unit produced it —
 * a taller `560vh` than the sticky stage's own `100svh` means progress can
 * reach 1 (rotation/vertical-travel fully settled, per SlapSticker/
 * StickerScene) before the sticky stage has actually finished releasing, or
 * the reverse — either way, a visible jump/early-release right at the
 * boundary NextProjectNav sits behind). Matching units removes that
 * mismatch at its source instead of patching the symptom. No other
 * structural change was needed for a clean hand-off to NextProjectNav
 * (below): it's already a plain sibling in normal document flow — nothing
 * positions it to overlap the sticky stage early, and the sticky
 * release point and useScroll's progress=1 point are the SAME scrollY by
 * construction once the units agree, so "sticker archive finishes, THEN
 * normal scroll reveals the next section" falls out of the existing
 * structure rather than needing new transition code.
 */
export function StickerArchive({ category }: { category: Category }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // PASS 2 (timing-only): tightened further — the previous spring
  // (280/38/1, damping ratio ~1.13) was still soft enough to read as a
  // faint accelerate/decelerate lag whenever scroll speed changed between
  // sections, undermining "one continuous physical movement." Higher
  // stiffness + lower mass shortens the follow lag to well under a frame
  // at normal scroll speeds while the damping ratio (~1.5, still
  // overdamped) keeps it free of any spring overshoot/bounce — the result
  // reads as near-linear/1:1 with scroll, "only very light smoothing," not
  // a perceptibly separate rotation/vertical-travel formula (both already
  // are exactly linear in this value, see StickerScene.tsx) reading as
  // heavy and steady rather than springy.
  const smoothed = useSpring(scrollYProgress, {
    stiffness: 500,
    damping: 55,
    mass: 0.5,
  });

  // Reduced motion: freeze at a static angle/position, no scroll binding.
  const frozen = useMotionValue(0.4);
  const progress = reduce ? frozen : smoothed;

  return (
    <main className="bg-black text-off-white">
      <section
        ref={sectionRef}
        className="relative"
        style={{ height: reduce ? "100svh" : "560svh" }}
      >
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black">
          <StickerScene progress={progress} />
        </div>
      </section>

      <NextProjectNav mode="back-to-category" category={category} />
    </main>
  );
}
