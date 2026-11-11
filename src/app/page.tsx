import { Intro } from "@/components/sections/Intro";
import { SelectedWorks } from "@/components/sections/SelectedWorks";
import { AboutBook } from "@/components/sections/AboutBook";
import { ExploreByCategory } from "@/components/sections/ExploreByCategory";
import { SITE_NAME } from "@/lib/site";

export default function Home() {
  return (
    <main data-scroll-snap className="flex min-h-screen flex-1 flex-col bg-black text-off-white">
      {/* the page's title for screen readers: its visible opening is the
          Intro, whose words are part of the artwork */}
      <h1 className="sr-only">{SITE_NAME}: portfolio</h1>
      <Intro />
      <SelectedWorks />
      <AboutBook scrollCue />
      <ExploreByCategory />
      {/* Contact is its own page, /contact, rather than a section here. */}
    </main>
  );
}

