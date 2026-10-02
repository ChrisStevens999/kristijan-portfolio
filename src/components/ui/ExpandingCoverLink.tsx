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
  className,
  children,
}: {
  href: string;
  /** full-resolution still, shown in the expanding overlay */
  image: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const [from, setFrom] = useState<{ rect: DOMRect; placeholder: string } | null>(null);
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
          // the tile's image is already decoded — show it at once, the
          // full-resolution still fades in over it
          setFrom({ rect: el.getBoundingClientRect(), placeholder: el.querySelector("img")?.currentSrc ?? image });
        }}
      >
        {children}
      </a>

      {from &&
        createPortal(
          <div className="fixed inset-0 z-[100]" aria-hidden>
            <motion.div
              className="absolute overflow-hidden"
              initial={{ left: from.rect.left, top: from.rect.top, width: from.rect.width, height: from.rect.height }}
              animate={{ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }}
              transition={{ duration: 0.85, ease: EXPO }}
              onAnimationComplete={() => setBlack(true)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- already-decoded tile image */}
              <img src={from.placeholder} alt="" className="absolute inset-0 h-full w-full object-cover" />
              {/* eslint-disable-next-line @next/next/no-img-element -- full-res still for the full-screen frame */}
              <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
