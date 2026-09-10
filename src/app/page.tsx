import { Intro } from "@/components/sections/Intro";
import { SelectedWorks } from "@/components/sections/SelectedWorks";
import { ExploreByCategory } from "@/components/sections/ExploreByCategory";

export default function Home() {
  return (
    <main data-scroll-snap className="flex min-h-screen flex-1 flex-col bg-black text-off-white">
      <Intro />
      <SelectedWorks />
      <ExploreByCategory />
      {/*
        The About section (bio, car reveal, free-time page) was removed from
        the homepage by request. Remaining planned section, per
        04_CONTENT_ARCHITECTURE.md, not built yet:

        <Contact /> // id="contact" -> /#contact
      */}
    </main>
  );
}

