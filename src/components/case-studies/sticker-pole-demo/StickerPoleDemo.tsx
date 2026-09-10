"use client";

import dynamic from "next/dynamic";

import { StickerShowcase } from "../sticker-archive/StickerShowcase";
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
 * (../sticker-archive) is untouched — its static showcase section (red
 * intro panel, lifestyle photos, sticker sheets) is simply reused below
 * the stage, so scrolling past the looping animation lands on the same
 * editorial artboard the archive has.
 */
export function StickerPoleDemo() {
  return (
    <main className="bg-[#000000]">
      <section className="flex h-[100svh] items-center justify-center">
        <div
          className="relative overflow-hidden bg-[#000000]"
          style={{
            aspectRatio: `${STAGE_ASPECT}`,
            height: `min(100svh, calc(100vw / ${STAGE_ASPECT}))`,
          }}
        >
          <DemoScene />
        </div>
      </section>
      <StickerShowcase />
    </main>
  );
}
