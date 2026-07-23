"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Minimal placeholder only (06_MOTION_GUIDELINES.md: fade, gentle movement).
 * Intentionally not tuned/polished yet — revisit once real pages exist.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
