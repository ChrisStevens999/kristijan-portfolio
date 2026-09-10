"use client";

import dynamic from "next/dynamic";

import { NextProjectNav } from "@/components/ui/NextProjectNav";
import type { Category } from "@/content/types";

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
 * Not scroll-driven. This now IS the Sticker Archive project page
 * (/projects/sticker-archive) — it replaced the earlier scroll-driven pole
 * (../sticker-archive/StickerArchive.tsx, kept in the tree but no longer
 * routed). The archive's static showcase section (red intro panel,
 * lifestyle photos, sticker sheets) is reused below the stage, so
 * scrolling past the looping animation lands on the same editorial
 * artboard, followed by the back-to-category nav when rendered as a
 * project page.
 */
export function StickerPoleDemo({ category }: { category?: Category }) {
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
      {category ? <NextProjectNav mode="back-to-category" category={category} /> : null}
    </main>
  );
}
