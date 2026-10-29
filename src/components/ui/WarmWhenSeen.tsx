"use client";

import { useEffect, useRef } from "react";
import { preload } from "react-dom";

/**
 * Fetches files a link's destination will need — at low priority, and only
 * once the link itself is on screen. Placed inside the link (an empty,
 * invisible marker), so a page doesn't spend its first load on images for
 * a page the visitor may never open: the homepage used to fetch the
 * Apparel intro's ~1 MB of layers up front, slowing everything it needed.
 */
export function WarmWhenSeen({ hrefs }: { hrefs: string[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      for (const href of hrefs) preload(href, { as: "image", fetchPriority: "low" });
      io.disconnect();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hrefs]);
  return <span ref={ref} aria-hidden className="pointer-events-none absolute inset-0" />;
}
