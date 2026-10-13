"use client";

import { useEffect, type RefObject } from "react";

/**
 * Keyboard focus for a full-screen overlay (the gallery lightbox, the deck
 * close-up). Both are portalled to <body>, outside the page's <main>, so
 * while one is open the page behind is made `inert`: Tab can't wander into
 * links hidden under the overlay, and screen readers see only the dialog.
 * Focus moves to the close button on open, and back to whatever opened it
 * on close (if that element is still on the page — a gallery card may have
 * moved on).
 */
export function useModalFocus(active: boolean, closeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const pages = Array.from(document.querySelectorAll("main"));
    for (const page of pages) page.inert = true;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      for (const page of pages) page.inert = false;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [active, closeRef]);
}
