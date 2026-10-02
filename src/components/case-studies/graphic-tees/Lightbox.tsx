"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type OpenPhoto = {
  photo: { src: string; alt: string };
  /** where the clicked card was on screen — the photo grows out of it */
  from: DOMRect;
  /** natural width / height of the photo */
  aspect: number;
  /** the card's already-loaded image, shown instantly under the sharp copy */
  placeholder: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** Centred target box: as large as fits 86% of the viewport height / 90% of
 *  the width, at the photo's own aspect (so the whole photo shows). */
function target(aspect: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let h = vh * 0.86;
  let w = h * aspect;
  if (w > vw * 0.9) {
    w = vw * 0.9;
    h = w / aspect;
  }
  return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
}

const noopSubscribe = () => () => {};

/**
 * Click-to-enlarge for the real-world gallery: the photo flies from its card
 * to the centre of the screen; behind it everything darkens a little and
 * the gallery, paused, blurs. Click anywhere or press Escape to close.
 *
 * Portalled to <body> so the transformed / overflow-hidden gallery columns
 * can't clip or offset the fixed overlay.
 */
export function Lightbox({
  open,
  onClose,
  reducedMotion,
}: {
  open: OpenPhoto | null;
  onClose: () => void;
  reducedMotion: boolean;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // no page scrolling under the open photo — blocked at the input level
    // rather than with overflow:hidden, which would drop the scrollbar,
    // change the page width and make the gallery re-measure
    const block = (e: Event) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if ([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("keydown", blockKeys);
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("keydown", blockKeys);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const duration = reducedMotion ? 0 : 0.55;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key={open.photo.src + open.from.top}
          role="dialog"
          aria-modal="true"
          aria-label={open.photo.alt}
          className="fixed inset-0 z-[100] cursor-zoom-out"
          onClick={onClose}
        >
          {/* darken + blur whatever is behind (the gallery is paused meanwhile) */}
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: "easeOut" }}
          />

          <motion.div
            className="fixed overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            initial={{
              left: open.from.left,
              top: open.from.top,
              width: open.from.width,
              height: open.from.height,
              borderRadius: open.from.height * 0.018,
            }}
            animate={{ ...target(open.aspect), borderRadius: 10 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: reducedMotion ? 0 : 0.25 } }}
            transition={{ duration, ease: EASE }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- the card's already-decoded image, so the photo is never blank mid-flight */}
            <img src={open.placeholder} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <Image
              src={open.photo.src}
              alt={open.photo.alt}
              fill
              sizes={`${Math.ceil(target(open.aspect).width)}px`}
              quality={90}
              className="object-cover"
            />
          </motion.div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close photo"
            className="fixed right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
