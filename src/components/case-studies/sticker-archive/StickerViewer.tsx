"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

import type { StickerDatum } from "@/content/projects/sticker-archive";

/** "Miami Vice tiger sticker" → "Miami Vice tiger" */
function displayName(alt: string) {
  return alt.replace(/\s*sticker$/i, "");
}

/**
 * Fullscreen detail viewer for a single sticker — opens on click, shows the
 * die-cut artwork large on black with its archive metadata, and steps through
 * the collection with the arrows / ← → keys. Closes on ✕, Esc, or backdrop
 * click. Body scroll is locked while open so the pole doesn't rotate behind it.
 */
export function StickerViewer({
  stickers,
  index,
  onClose,
  onNavigate,
}: {
  stickers: StickerDatum[];
  index: number | null;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const open = index !== null;
  const total = stickers.length;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNavigate(((index as number) + 1) % total);
      else if (e.key === "ArrowLeft")
        onNavigate(((index as number) - 1 + total) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, index, total, onClose, onNavigate]);

  const sticker = open ? stickers[index as number] : null;
  const number = open ? String((index as number) + 1).padStart(3, "0") : "";
  const totalLabel = String(total).padStart(3, "0");

  return (
    <AnimatePresence>
      {open && sticker ? (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/92 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${displayName(sticker.alt)}, ${number} of ${totalLabel}`}
        >
          {/* Number, top-left */}
          <div className="pointer-events-none absolute left-6 top-6 font-sans text-3xl font-bold tabular-nums text-off-white sm:left-10 sm:top-10 sm:text-5xl">
            {number}
            <span className="ml-2 align-top font-accent text-xs tracking-[0.28em] text-off-white/40">
              / {totalLabel}
            </span>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center border border-off-white/25 font-accent text-off-white/80 transition hover:border-off-white hover:text-off-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-off-white sm:right-9 sm:top-9"
            aria-label="Close viewer"
          >
            ✕
          </button>

          {/* Prev / Next */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(((index as number) - 1 + total) % total);
            }}
            className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-2xl text-off-white/60 transition hover:text-off-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-off-white sm:left-6"
            aria-label="Previous sticker"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(((index as number) + 1) % total);
            }}
            className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-2xl text-off-white/60 transition hover:text-off-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-off-white sm:right-6"
            aria-label="Next sticker"
          >
            ›
          </button>

          {/* Artwork — key on index so it re-animates on navigate */}
          <motion.div
            key={index}
            className="relative h-[62vh] w-[82vw] max-w-3xl sm:h-[70vh]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={sticker.src}
              alt={sticker.alt}
              fill
              sizes="82vw"
              quality={95}
              className="object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            />
          </motion.div>

          {/* Caption, bottom */}
          <div
            className="pointer-events-none absolute bottom-8 left-0 right-0 flex flex-col items-center gap-1 px-6 text-center sm:bottom-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-sans text-xl font-bold uppercase text-off-white sm:text-2xl">
              {displayName(sticker.alt)}
            </p>
            <p className="font-accent text-[0.62rem] tracking-[0.28em] text-off-white/50 uppercase sm:text-xs">
              {sticker.group ? `${sticker.group} · ` : ""}Selected graphic work · 2024 — 2026
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
