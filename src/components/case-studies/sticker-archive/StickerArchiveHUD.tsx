/**
 * Editorial HUD framing the archive — pinned to the four corners, kept
 * secondary to the artwork (accent font, low-contrast, wide tracking). The
 * collection counter reflects the real number of stickers in the data, so it
 * stays correct as the archive grows.
 */
export function StickerArchiveHUD({ total }: { total: number }) {
  const totalLabel = String(total).padStart(3, "0");

  return (
    <div className="pointer-events-none absolute inset-0 z-[500] font-accent text-off-white/50 uppercase">
      <div className="absolute left-6 top-6 sm:left-10 sm:top-10">
        <span className="font-sans block text-sm font-bold tracking-[0.02em] text-off-white sm:text-base">
          Sticker Archive
        </span>
        <span className="mt-1 block text-[0.62rem] tracking-[0.28em] sm:text-xs">
          Underground graphic work
        </span>
      </div>

      <div className="absolute right-6 top-6 text-right text-[0.62rem] tracking-[0.28em] sm:right-10 sm:top-10 sm:text-xs">
        Collection
        <br />
        <span className="text-off-white tabular-nums">001 — {totalLabel}</span>
      </div>

      <div className="absolute bottom-14 left-6 text-[0.62rem] tracking-[0.28em] sm:bottom-10 sm:left-10 sm:text-xs">
        Selected graphic work
        <br />
        <span className="text-off-white tabular-nums">2024 — 2026</span>
      </div>

      <div className="absolute bottom-14 right-6 hidden text-right text-[0.62rem] tracking-[0.28em] sm:bottom-10 sm:right-10 sm:block sm:text-xs">
        Scroll to explore ↓
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[0.58rem] tracking-[0.34em] text-off-white/30 sm:hidden">
        Scroll to rotate
      </div>
    </div>
  );
}
