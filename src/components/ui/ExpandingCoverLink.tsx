"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * A category cover that, when clicked, grows from its tile to fill the
 * screen, dips to black and only then navigates — the destination page
 * (e.g. the Apparel intro) picks up from that black.
 *
 * Modified clicks (new tab etc.) and reduced-motion visitors get a plain
 * link. The still image is a 16:9 scene cropped by the tile, so at full
 * screen the whole composition is revealed.
 */
export function ExpandingCoverLink({
  href,
  image,
  preload,
  className,
  children,
}: {
  href: string;
  /** full-resolution still, shown in the expanding overlay */
  image: string;
  /** images the destination's intro needs — fetched on click, so they are
   *  cached by the time the expansion and the dip to black are over */
  preload?: string[];
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const [from, setFrom] = useState<{
    clip: string;
    x: number;
    y: number;
    scale: number;
    placeholder: string;
  } | null>(null);
  const [black, setBlack] = useState(false);

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  return (
    <>
      <a
        ref={ref}
        href={href}
        className={className}
        onClick={(e) => {
          if (reduced || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          const el = ref.current!;
          const img = el.querySelector("img");
          const r = el.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          // The overlay image is laid out ONCE at full-screen size and only
          // transformed/clipped from there (no per-frame layout or image
          // rescale). Start it exactly over the tile's own cover-fit image:
          // same centre, scaled by the ratio of the two cover fits.
          const aspect = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 16 / 9;
          const cover = (w: number, h: number) => Math.max(w, h * aspect);
          preload?.forEach((src) => {
            new Image().src = src;
          });
          setFrom({
            clip: `inset(${Math.max(0, r.top)}px ${Math.max(0, vw - r.right)}px ${Math.max(0, vh - r.bottom)}px ${Math.max(0, r.left)}px)`,
            x: r.left + r.width / 2 - vw / 2,
            y: r.top + r.height / 2 - vh / 2,
            scale: cover(r.width, r.height) / cover(vw, vh),
            // the tile's image is already decoded — show it at once, the
            // full-resolution still loads over it
            placeholder: img?.currentSrc ?? image,
          });
        }}
      >
        {children}
      </a>

      {from &&
        createPortal(
          <div className="fixed inset-0 z-[100]" aria-hidden>
            {/* the window: opens from the tile's rectangle to the whole screen */}
            <motion.div
              className="absolute inset-0"
              initial={{ clipPath: from.clip }}
              animate={{ clipPath: "inset(0px 0px 0px 0px)" }}
              transition={{ duration: 0.85, ease: EXPO }}
              onAnimationComplete={() => setBlack(true)}
            >
              {/* the picture: glides from the tile's framing to the full-screen one */}
              <motion.div
                className="absolute inset-0 will-change-transform"
                initial={{ x: from.x, y: from.y, scale: from.scale }}
                animate={{ x: 0, y: 0, scale: 1 }}
                transition={{ duration: 0.85, ease: EXPO }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- already-decoded tile image */}
                <img src={from.placeholder} alt="" className="absolute inset-0 h-full w-full object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element -- full-res still for the full-screen frame */}
                <img src={image} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              </motion.div>
            </motion.div>
            <motion.div
              className="absolute inset-0 bg-[#000]"
              initial={{ opacity: 0 }}
              animate={{ opacity: black ? 1 : 0 }}
              transition={{ duration: 0.45, ease: "easeIn", delay: 0.25 }}
              onAnimationComplete={() => black && router.push(href)}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
