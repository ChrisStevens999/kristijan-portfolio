"use client";

import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { useState } from "react";

/** Mount a little before `appliedAt` so there's no visible pop right as the approach begins. */
const PRE_MOUNT_MARGIN = 0.02;

/**
 * Segmented rendering is real DOM weight (6–14 slice nodes per sticker,
 * each with its own transform chain) — mounting all 25 stickers' full slice
 * sets from the very first frame, most of which won't be applied for a long
 * time yet, is exactly the "absurd number of DOM nodes" this page needs to
 * avoid. A sticker mounts once scroll progress gets close to its own
 * `appliedAt` and stays mounted forever after (attachment is permanent, and
 * un/remounting on every scroll-direction change would be its own perf
 * problem) — so at any moment only stickers that have begun applying, or
 * are already attached, cost anything.
 */
export function useShouldMountSticker(progress: MotionValue<number>, appliedAt: number): boolean {
  const [mounted, setMounted] = useState(() => progress.get() >= appliedAt - PRE_MOUNT_MARGIN);

  useMotionValueEvent(progress, "change", (v) => {
    if (!mounted && v >= appliedAt - PRE_MOUNT_MARGIN) setMounted(true);
  });

  return mounted;
}
