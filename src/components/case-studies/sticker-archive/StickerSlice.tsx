"use client";

import { forwardRef } from "react";

/**
 * Pure presentational shell for one vertical strip of a sticker — no
 * animation logic of its own. StickerSurfaceItem computes ALL of one
 * sticker's slices' geometry in a single subscription and writes directly
 * to these refs' `style` every frame (see its doc comment for why: chaining
 * a dozen `useTransform`s per slice, times 6–14 slices, times up to 25
 * mounted stickers, was a measured multi-second scroll-lag performance
 * cliff — plain refs + one shared imperative update loop per sticker is not).
 *
 * `outerRef` gets position/size/clip/opacity/z-index; `innerRef` gets the
 * 3D rotate+scale transform; `shadeRef` gets the depth-darkening overlay
 * opacity. The crop itself (`left: -sliceIndex·sliceWidth` inside an
 * `overflow:hidden` box) is static, so it's set once via inline style here,
 * not touched per frame.
 */
export const StickerSlice = forwardRef<
  HTMLDivElement,
  {
    innerRef: (el: HTMLDivElement | null) => void;
    shadeRef: (el: HTMLDivElement | null) => void;
    sliceIndex: number;
    segments: number;
    sliceWidth: number;
    height: number;
    src: string;
  }
>(function StickerSlice(
  { innerRef, shadeRef, sliceIndex, segments, sliceWidth, height, src },
  outerRef,
) {
  return (
    <div
      ref={outerRef}
      className="pointer-events-none absolute left-1/2 top-1/2 overflow-hidden will-change-transform"
      style={{ width: sliceWidth, height, marginLeft: -sliceWidth / 2, marginTop: -height / 2 }}
    >
      <div ref={innerRef} className="relative h-full w-full will-change-transform">
        {/* eslint-disable-next-line @next/next/no-img-element -- manual crop-by-offset technique next/image can't do; same cached bitmap across all slices of this sticker */}
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: -sliceIndex * sliceWidth,
            top: 0,
            width: sliceWidth * segments,
            height,
            maxWidth: "none",
          }}
          className="pointer-events-none select-none"
        />
        <div
          ref={shadeRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black mix-blend-multiply"
        />
      </div>
    </div>
  );
});
