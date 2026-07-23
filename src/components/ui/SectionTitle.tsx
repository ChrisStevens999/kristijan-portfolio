"use client";

import { motion } from "framer-motion";

/**
 * 05_COMPONENT_LIBRARY.md "SECTION TITLE": introduces a new chapter, large
 * editorial typography, plenty of whitespace, never competes with imagery.
 *
 * Uses the same texture-background + centered-title language as the Intro's
 * text frames, so a section opens with continuity rather than a jarring
 * style change. Unlike the Intro, this uses Integral CF (--font-sans), not
 * Aku Kamu — 12_TYPOGRAPHY.md restricts Aku Kamu to the Intro only.
 */
export function SectionTitle({
  title,
  kicker,
  texture,
}: {
  title: string;
  kicker?: string;
  texture: string;
}) {
  return (
    <div
      className="relative flex h-[70vh] w-full items-center justify-center px-6 sm:h-screen"
      style={{
        backgroundImage: `url('${texture}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <motion.div
        className="relative text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {kicker ? (
          // Absolutely positioned so adjusting its offset never moves the
          // title — the two are only linked visually, not in layout flow.
          <p
            className="font-accent absolute inset-x-0 bottom-full translate-y-[4px] text-[19.5px] leading-none tracking-[0.3em] text-off-white uppercase sm:translate-y-[40px] sm:text-[22.75px]"
          >
            {kicker}
          </p>
        ) : null}
        <h2 className="font-sans text-4xl leading-tight text-off-white sm:text-6xl lg:text-8xl xl:text-9xl">
          {title}
        </h2>
      </motion.div>
    </div>
  );
}
