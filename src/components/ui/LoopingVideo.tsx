"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * A muted, looping film panel — a moving photograph, not a player. Visitors
 * who ask for reduced motion get it paused on its first frame (or poster)
 * with the native controls, so they can still choose to watch it.
 * playsInline stops iOS from going fullscreen.
 *
 * The film itself (several MB) is only fetched once the panel comes within
 * a screen of the viewport — an autoplaying <video> otherwise downloads the
 * whole file with the page, two films deep on a case study — and it pauses
 * again while scrolled far away.
 */
const NEAR = "100% 0px";

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
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: NEAR });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // play while near, pause while away (reduced motion never autoplays)
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !near) return;
    el.play().catch(() => {});
    return () => el.pause();
  }, [near, reduced]);

  return (
    <video
      ref={ref}
      src={near || reduced ? src : undefined}
      poster={poster}
      controls={Boolean(reduced)}
      muted
      loop
      playsInline
      preload={reduced ? "metadata" : "auto"}
      aria-label={alt}
      style={style}
      className={className}
    />
  );
}
