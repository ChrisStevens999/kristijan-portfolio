"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image, { type StaticImageData } from "next/image";
import { useEffect, useState } from "react";

import heroPhoto from "../../../assets/Intro/1.png";
import finalePhoto from "../../../assets/Intro/5.png";

const SESSION_KEY = "intro-played";

/**
 * Texture surfaces are plain CSS backgrounds served from /public, bypassing
 * next/image entirely. Cover fit was chosen over tiled repeat: the repeat
 * tile is sized to the source's native 1920x1080 (at 1x), which would show
 * a visible seam on any viewport wider or taller than that (e.g. a 2560x1440
 * monitor) — cover scales cleanly from the 3840x2160 source at every size
 * with no seam risk.
 */
function textureStyle(url: string): React.CSSProperties {
  return {
    backgroundImage: `url('${url}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}

/**
 * 05_COMPONENT_LIBRARY.md: full screen, cinematic, plays once.
 * Frames 1 and 5 are the provided photographic/illustrative assets.
 * Frames 2-4 reproduce the copy from assets/Intro/2-4.png as live HTML
 * text rather than baked-in images, per the Decision Log
 * ("Typography remains HTML rather than being embedded inside imagery").
 * Text-frame backgrounds are the supplied paper textures, per
 * 11_VISUAL_ASSETS.md's Background Surface Mapping — never flat colors.
 */
type Frame =
  | { kind: "image"; src: StaticImageData; alt: string; hold: number }
  | {
      kind: "text";
      lines: string[];
      hold: number;
      texture: string;
      className: string;
    };

const FRAMES: Frame[] = [
  { kind: "image", src: heroPhoto, alt: "", hold: 2600 },
  {
    kind: "text",
    lines: ["Christian Stevkovski"],
    hold: 1900,
    texture: "/textures/black-page.png",
    className: "text-off-white",
  },
  {
    kind: "text",
    lines: ["Brand Design", "Creative Direction"],
    hold: 1900,
    texture: "/textures/black-page.png",
    className: "text-red",
  },
  {
    kind: "text",
    lines: ["Creating What", "People Remember"],
    hold: 2100,
    texture: "/textures/red-page.png",
    className: "text-off-white",
  },
  { kind: "image", src: finalePhoto, alt: "", hold: 2600 },
];

function IntroFrame({ frame }: { frame: Frame }) {
  if (frame.kind === "image") {
    return (
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        animate={{ scale: 1.045 }}
        transition={{ duration: frame.hold / 1000 + 1, ease: "linear" }}
      >
        <Image
          src={frame.src}
          alt={frame.alt}
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          quality={95}
          className="object-cover"
        />
      </motion.div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center px-6">
      <div className="absolute inset-0" style={textureStyle(frame.texture)} />
      <div className="relative text-center">
        {frame.lines.map((line, i) => {
          const multiLine = frame.lines.length > 1;
          return (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 * i, ease: "easeOut" }}
              className={`font-intro text-4xl sm:text-6xl lg:text-8xl xl:text-9xl ${multiLine ? "leading-none" : "leading-tight"} ${multiLine && i > 0 ? "mt-1 sm:mt-2 lg:mt-3 xl:mt-4" : ""} ${frame.className}`}
            >
              {line}
            </motion.p>
          );
        })}
      </div>
    </div>
  );
}

function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const exiting = index >= FRAMES.length;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (exiting) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), FRAMES[index].hold);
    return () => clearTimeout(timer);
  }, [index, exiting]);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      aria-hidden="true"
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.9, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (exiting) onComplete();
      }}
    >
      <AnimatePresence>
        {!exiting && (
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <IntroFrame frame={FRAMES[index]} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Session-scoped gate: plays once per browser session, and is skipped
 * outright when the visitor prefers reduced motion (no visible skip
 * button — 05_COMPONENT_LIBRARY.md only requires one "if accessibility
 * requires it").
 */
export function Intro() {
  const [shouldPlay, setShouldPlay] = useState<boolean | null>(null);

  useEffect(() => {
    const alreadyPlayed = sessionStorage.getItem(SESSION_KEY) === "1";
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    sessionStorage.setItem(SESSION_KEY, "1");
    // sessionStorage/matchMedia don't exist during SSR, so this can't be
    // derived at render time — it must sync from the browser after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShouldPlay(!(alreadyPlayed || reducedMotion));
  }, []);

  if (!shouldPlay) return null;

  return <IntroSequence onComplete={() => setShouldPlay(false)} />;
}
