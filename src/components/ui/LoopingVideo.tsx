"use client";

import { useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";

/**
 * A muted, looping film panel — a moving photograph, not a player. Visitors
 * who ask for reduced motion get it paused on its first frame (or poster)
 * with the native controls, so they can still choose to watch it.
 * playsInline stops iOS from going fullscreen.
 */
export function LoopingVideo({
  src,
  poster,
  alt,
  className,
  style,
}: {
  src: string;
  poster?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  return (
    <video
      src={src}
      poster={poster}
      autoPlay={!reduced}
      controls={Boolean(reduced)}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={alt}
      style={style}
      className={className}
    />
  );
}
