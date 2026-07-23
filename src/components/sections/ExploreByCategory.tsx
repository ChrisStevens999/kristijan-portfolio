import { getAllCategories } from "@/lib/content";
import { CategoryCard } from "@/components/ui/CategoryCard";

/**
 * 04_CONTENT_ARCHITECTURE.md: categories function as chapters, not filters.
 * Four exhibition covers in a balanced 2x2 grid on the supplied textured
 * background — no titles, borders or UI chrome beyond the imagery itself.
 */
export function ExploreByCategory() {
  const categories = getAllCategories();

  if (categories.length === 0) return null;

  return (
    <section
      id="explore-by-category"
      className="relative flex min-h-screen w-full items-center justify-center px-6 py-16 lg:px-8 lg:py-10"
      style={{
        backgroundImage: "url('/textures/textured-page.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/*
        Mobile/tablet: simple equal-width 2x2 grid. Desktop (lg+): each
        card is large (see CategoryCard), but the four sit close together
        as one tight, centered block with a small equal gap — matching the
        approved mockup's composition, not spread into separated columns.
      */}
      <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-4 sm:gap-6 lg:w-auto lg:max-w-none lg:grid-cols-[auto_auto] lg:grid-rows-[auto_auto] lg:justify-center lg:content-center lg:gap-3">
        {categories.map((category) => (
          <CategoryCard key={category.slug} category={category} />
        ))}
      </div>
    </section>
  );
}
