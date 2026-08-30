"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import {
  useScroll,
  useSpring,
  useReducedMotion,
  useMotionValue,
  useTransform,
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
 * mobile-safe, address-bar-visible basis), not a `vh`/`svh` mix, so
 * `position: sticky`'s real release point and useScroll's own measurement
 * of the section always agree on the same basis.
 *
 * EXIT BOUNDARY FIX: `scrollYProgress` still spans the section's ENTIRE
 * pinned-scroll distance (0 at the top, 1 at the true release point) — but
 * the pole's own 0→1 animation (see ANIMATION_TO_PIN_RATIO below) now only
 * consumes the FIRST 92% of that distance, remapped via `useTransform`
 * (clamped) into `rawAnimationProgress`. The remaining ~8% is a pure,
 * static, real-scroll-distance buffer: `rawAnimationProgress` — and
 * therefore the spring built from it, and therefore the pole's rotation/
 * position — is already sitting at its final p=1 pose and cannot change
 * further, for a genuine stretch of scroll BEFORE the sticky stage
 * actually releases. This is a single-source-of-truth guarantee (one
 * MotionValue, remapped once) rather than relying on two independently-
 * measured boundaries (the CSS sticky release vs. useScroll's own
 * measurement) landing on the exact same pixel — belt-and-suspenders on
 * top of the matching-units fix above, and immune to any residual spring
 * settling time during a fast scroll: by the time raw scroll reaches the
 * true release point, the animation has been fully at rest for a real,
 * substantial stretch of scroll distance, not just an instant.
 * NextProjectNav needed no changes: it's a plain sibling in normal
 * document flow, already confirmed to sit exactly at the section's own
 * bottom edge with no overlap — the fix here is entirely about WHEN the
 * pole finishes moving relative to WHEN the sticky stage can release, not
 * about how NextProjectNav is positioned.
 */
/** How much of the section's total pinned-scroll distance drives the pole's own 0→1 animation — the rest (below) is a pure post-animation hold before release. */
const ANIMATION_TO_PIN_RATIO = 0.92;
/** Existing pinned-scroll distance the approved animation/timing was tuned against (560svh section − 100svh sticky stage) — kept as an ABSOLUTE svh figure, not a ratio, so the animation's real-world pacing is byte-for-byte unchanged; only new scroll distance is added around it. */
const EXISTING_ANIMATION_PIN_SVH = 460;
/** Total pinned-scroll distance once the exit buffer is included: EXISTING_ANIMATION_PIN_SVH is exactly ANIMATION_TO_PIN_RATIO of this. */
const TOTAL_PIN_SVH = EXISTING_ANIMATION_PIN_SVH / ANIMATION_TO_PIN_RATIO;
/** Sticky stage height, svh. */
const STICKY_STAGE_SVH = 100;
/** Section height = sticky stage + total pinned-scroll distance (animation + exit buffer). ~600svh, up from 560svh — the extra ~40svh is pure hold, not part of the animation itself. */
const SECTION_HEIGHT_SVH = STICKY_STAGE_SVH + TOTAL_PIN_SVH;
export function StickerArchive({ category }: { category: Category }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // EXIT BOUNDARY FIX: remap the section's full [0,1] scroll range down to
  // just the first ANIMATION_TO_PIN_RATIO of it — clamped, so the output
  // holds at exactly 1 for the remaining tail instead of extrapolating
  // past it. See the doc comment above for why this exists.
  const rawAnimationProgress = useTransform(scrollYProgress, [0, ANIMATION_TO_PIN_RATIO], [0, 1], {
    clamp: true,
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
  const smoothed = useSpring(rawAnimationProgress, {
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
        style={{ height: reduce ? "100svh" : `${SECTION_HEIGHT_SVH}svh` }}
      >
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black">
          <StickerScene progress={progress} />
        </div>
      </section>

      <NextProjectNav mode="back-to-category" category={category} />
    </main>
  );
}
