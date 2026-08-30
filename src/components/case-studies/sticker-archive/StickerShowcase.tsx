import Image from "next/image";

import phonePocket from "../../../../assets/projects/Sticker Illustrations/1.png";
import headphones from "../../../../assets/projects/Sticker Illustrations/3.png";
import skateboard from "../../../../assets/projects/Sticker Illustrations/4.png";
import blackGrid from "../../../../assets/projects/Sticker Illustrations/image.png";
import redGrid from "../../../../assets/projects/Sticker Illustrations/S3.png";

/**
 * Static editorial showcase that follows the interactive pole animation —
 * "the red Illustration section" referenced throughout the pole's exit-
 * boundary work (StickerArchive.tsx). One continuous vertical artboard, NOT
 * a card grid/masonry/carousel: a red title panel, three full-bleed
 * lifestyle photos, then two full-bleed flattened sticker-sheet grids —
 * every image edge-to-edge, no gaps, no rounded corners, no shadows,
 * matching the approved reference mockup exactly (see git history for the
 * pole work this follows). No scroll-linked or entrance animation here —
 * the pole's own exit already handles the transition into this section
 * (a plain document-flow hand-off, nothing added on top of it), and a
 * static magazine spread doesn't animate its own images in.
 *
 * The two sticker-sheet grids (redGrid/blackGrid) are pre-composited flat
 * images, not a live CSS grid built from the individual sticker PNGs —
 * they're already the exact art-directed arrangement from the reference
 * (specific sizes/rotations/overlaps per sticker, more than a uniform grid
 * of the same 25 files could reproduce), so used as-is rather than
 * reconstructed.
 */
export function StickerShowcase() {
  return (
    <div className="w-full">
      {/* 1. Red intro panel — live text (not a flattened image) so size/
          spacing stay adjustable. Sized down and given more vertical room
          than the first pass, per feedback: smaller text, more breathing
          room around it. */}
      <div className="bg-red flex w-full items-center justify-center px-6 py-32 sm:py-40 lg:py-48">
        <h2 className="font-sans max-w-[36rem] text-center text-xl leading-snug tracking-wide text-off-white uppercase sm:text-2xl lg:text-3xl">
          A Selection of Sticker Designs Created Over the Years
        </h2>
      </div>

      {/* 2. Phone-in-pocket lifestyle photo. */}
      <Image
        src={phonePocket}
        alt="A die-cut sticker applied to a phone, tucked into a denim jacket pocket"
        sizes="100vw"
        className="h-auto w-full"
      />

      {/* 3. Black-and-white skateboard photo. */}
      <Image
        src={skateboard}
        alt="A skateboard deck covered in stickers, held under one arm"
        sizes="100vw"
        className="h-auto w-full"
      />

      {/* 4. Headphone lifestyle photo. */}
      <Image
        src={headphones}
        alt="A sticker applied to a pair of over-ear headphones, worn outdoors"
        sizes="100vw"
        className="h-auto w-full"
      />

      {/* 5. Red-background sticker sheet. */}
      <Image
        src={redGrid}
        alt="A grid of die-cut sticker designs on a red background"
        sizes="100vw"
        className="h-auto w-full"
      />

      {/* 6. Black-background sticker sheet. */}
      <Image
        src={blackGrid}
        alt="A grid of die-cut sticker designs on a black background"
        sizes="100vw"
        className="h-auto w-full"
      />
    </div>
  );
}
