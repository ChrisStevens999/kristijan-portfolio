import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/content/types";

/**
 * 05_COMPONENT_LIBRARY.md "CATEGORY CARD": chapter cover, not a thumbnail.
 * Equal dimensions, live HTML title, entire card clickable, dark overlay,
 * gentle zoom on hover, no text beneath the image.
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

const DEFAULT_TITLE_SIZE = "text-3xl sm:text-4xl lg:text-5xl";
/**
 * "Illustration" is a single 12-letter word kept on one line (not split
 * like the two-line titles), so it needs a touch less size to fit the
 * same card width comfortably while keeping the same visual weight.
 */
const TITLE_SIZE: Record<string, string> = {
  illustration: "text-2xl sm:text-3xl lg:text-4xl",
};

export function CategoryCard({ category }: { category: Category }) {
  const lines = TITLE_LINES[category.slug] ?? [category.title];
  const color = TITLE_COLOR[category.slug] ?? "white";
  const size = TITLE_SIZE[category.slug] ?? DEFAULT_TITLE_SIZE;

  return (
    <Link
      href={category.href ?? `/categories/${category.slug}`}
      className="group relative block aspect-[3/4] w-full overflow-hidden lg:aspect-auto lg:h-[clamp(380px,34vh,500px)] lg:w-[clamp(300px,21vw,450px)]"
    >
      <Image
        src={category.cover.src}
        alt={category.cover.alt}
        fill
        sizes="(min-width: 640px) 45vw, 90vw"
        quality={95}
        className="object-cover transition-transform duration-300 ease-out md:group-hover:scale-[1.03]"
      />

      {/* Dark overlay: always on for mobile (titles stay visible), hover-only on desktop. */}
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100" />

      <div className="absolute inset-0 flex items-center justify-center px-4 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
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
