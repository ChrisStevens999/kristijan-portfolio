"use client";

import dynamic from "next/dynamic";

import { STAGE_ASPECT } from "./demoConfig";

// WebGL/canvas — client-only, no SSR (same as the approved archive).
const DemoScene = dynamic(() => import("./DemoScene").then((m) => m.DemoScene), { ssr: false });

/**
 * Autoplaying "sticker pole" demo — a separate copy of the Sticker Archive
 * concept rebuilt to match the supplied reference video (see demoConfig.ts
 * for the measured numbers). Presented exactly like that post: a fixed
 * 620:774 portrait stage, as tall as the viewport allows, centred on pure
 * black — so the composition (pole width, landing zone, entry paths) reads
 * the same on any screen instead of stretching with the browser window.
 *
 * Not scroll-driven and not wired into any project/category listing; it
 * lives at /demo/sticker-pole only. The approved Sticker Archive
 * (../sticker-archive) is untouched.
 */
export function StickerPoleDemo() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#000000]">
      <div
        className="relative overflow-hidden bg-[#000000]"
        style={{
          aspectRatio: `${STAGE_ASPECT}`,
          height: `min(100svh, calc(100vw / ${STAGE_ASPECT}))`,
        }}
      >
        <DemoScene />
      </div>
    </main>
  );
}
