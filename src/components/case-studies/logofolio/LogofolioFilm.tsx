"use client";

import { useEffect, useRef } from "react";

/**
 * One brand's film as a logo that starts to move. The video's first frame
 * is the logo, so it sits as a still (poster = that same frame) until its
 * screen is mostly in view, holds there a beat longer, then plays and
 * loops. Leaving the screen pauses it and rewinds to the logo, so every
 * arrival opens the same way. Visitors who prefer reduced motion keep the
 * still.
 *
 * Not `autoPlay`: playback is driven from here, after hydration, with the
 * element muted — the only way a browser allows play() without a gesture.
 */
export function LogofolioFilm({
  src,
  poster,
  alt,
  holdMs = 700,
}: {
  src: string;
  poster: string;
  alt: string;
  /** How long the logo holds after arriving before the first cut, in ms. */
  holdMs?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let hold: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(hold);
        if (entry.isIntersecting) {
          hold = window.setTimeout(() => {
            video.muted = true;
            video.play().catch(() => {
              /* blocked autoplay: the logo simply stays still */
            });
          }, holdMs);
        } else {
          video.pause();
          video.currentTime = 0;
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(video);

    return () => {
      window.clearTimeout(hold);
      observer.disconnect();
    };
  }, [holdMs]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-label={alt}
      className="block h-auto w-full"
    />
  );
}
