import Image from "next/image";

import { TagDesignsHero } from "@/components/sections/TagDesignsHero";
import { NextProjectNav } from "@/components/ui/NextProjectNav";
import {
  tagDesignsArchive,
  tagDesignsGallery,
  tagDesignsStatement,
} from "@/content/projects/tag-designs";
import type { Category } from "@/content/types";
import type { HeroImage } from "@/lib/hero-images";

/**
 * Structure follows the supplied full-page mockup exactly (hero → statement
 * → 3-col application gallery → 5-col archive). Statement and archive are
 * pre-baked, approved exports rendered as-is — not reconstructed in code.
 * Only the application gallery is built from individual photos; see
 * @/content/projects/tag-designs for how each was matched to the mockup.
 */
export function TagDesignsCaseStudy({
  category,
  heroImages,
}: {
  category: Category;
  heroImages: HeroImage[];
}) {
  return (
    <main className="flex flex-col bg-black text-off-white">
      <TagDesignsHero images={heroImages} />

      <Image
        src={tagDesignsStatement.src}
        alt={tagDesignsStatement.alt}
        sizes="100vw"
        quality={95}
        className="block h-auto w-full"
      />

      <section className="grid grid-cols-1 sm:grid-cols-3">
        {tagDesignsGallery.map((item, i) => (
          <div key={i} className="relative aspect-[4/5]">
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(min-width: 640px) 34vw, 100vw"
              quality={90}
              className="object-cover"
            />
          </div>
        ))}
      </section>

      <Image
        src={tagDesignsArchive.src}
        alt={tagDesignsArchive.alt}
        sizes="100vw"
        quality={95}
        className="block h-auto w-full"
      />

      <NextProjectNav mode="back-to-category" category={category} />
    </main>
  );
}
