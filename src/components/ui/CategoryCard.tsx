import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/content/types";

/**
 * 05_COMPONENT_LIBRARY.md "CATEGORY CARD": chapter cover, not a thumbnail.
 * Equal dimensions, live HTML title (always visible, not hover-only), entire
 * card clickable, dark overlay, gentle zoom on hover, no text beneath the
 * image.
 *
 * Per-category title line-breaks, color and size are a one-off visual
 * treatment matching the approved Explore by Category mockup — this is
 * presentation, not content, so it lives here rather than in
 * content/categories. A category without an entry below falls back to its
 * plain title on one line so new categories don't require a redesign.
 *
 * Color is a fixed art-direction choice per the mockup, not derived from
 * image brightness/contrast — each category's title is a single solid
 * color, never mixed within one title.
 */
const TITLE_LINES: Record<string, string[]> = {
  "brand-direction": ["Brand", "Direction"],
  "apparel-design": ["Apparel", "Design"],
  illustration: ["Illustration"],
  "creative-exploration": ["Creative", "Exploration"],
};

const TITLE_COLOR: Record<string, "red" | "white"> = {
  "brand-direction": "red",
  "apparel-design": "white",
  illustration: "white",
  "creative-exploration": "red",
};

// Desktop sizes are in cqw (% of the card's own width — the card is a size
// container), because the card now scales with the screen's height: the
// title keeps the same proportion to its card at any size (13cqw is the old
// 48px on the old 366px-wide card).
const DEFAULT_TITLE_SIZE = "text-3xl sm:text-4xl lg:text-[13cqw]";
/**
 * "Illustration" is a single 12-letter word kept on one line (not split
 * like the two-line titles), so it needs a touch less size to fit the
 * same card width comfortably while keeping the same visual weight.
 */
const TITLE_SIZE: Record<string, string> = {
  illustration: "text-2xl sm:text-3xl lg:text-[9.8cqw]",
};

export function CategoryCard({ category }: { category: Category }) {
  const lines = TITLE_LINES[category.slug] ?? [category.title];
  const color = TITLE_COLOR[category.slug] ?? "white";
  const size = TITLE_SIZE[category.slug] ?? DEFAULT_TITLE_SIZE;

  return (
    <Link
      href={category.href ?? `/categories/${category.slug}`}
      // Always the covers' own 3:4 shape (they are 1200x1600), so the artwork
      // is never cropped. Desktop: each card is as tall as half the screen
      // allows (section padding 5rem + grid gap 0.75rem), so the 2x2 block
      // fits one screen; the width follows from the shape.
      className="group relative block aspect-[3/4] w-full overflow-hidden [container-type:inline-size] lg:h-[clamp(300px,calc((100svh-5.75rem)/2),720px)] lg:w-auto"
    >
      <Image
        src={category.cover.src}
        alt={category.cover.alt}
        fill
        sizes="(min-width: 640px) 45vw, 90vw"
        quality={95}
        className="object-cover transition-transform duration-300 ease-out md:group-hover:scale-[1.03]"
      />

      {/* Dark overlay so the always-visible title reads on any cover; a touch deeper on hover. */}
      <div className="absolute inset-0 bg-black/40 transition-colors duration-300 md:group-hover:bg-black/55" />

      <div className="absolute inset-0 flex items-center justify-center px-4">
        <p
          className={`font-intro text-center leading-[0.95] [text-shadow:0_2px_6px_rgba(0,0,0,0.6)] ${size} ${color === "red" ? "text-red" : "text-off-white"}`}
        >
          {lines.map((line) => (
            <span key={line} className="block whitespace-nowrap">
              {line}
            </span>
          ))}
        </p>
      </div>
    </Link>
  );
}
