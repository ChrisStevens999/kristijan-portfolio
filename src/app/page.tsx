import { Intro } from "@/components/sections/Intro";
import { SelectedWorks } from "@/components/sections/SelectedWorks";
import { ExploreByCategory } from "@/components/sections/ExploreByCategory";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-black text-off-white">
      <Intro />
      <SelectedWorks />
      <ExploreByCategory />
      {/*
        Remaining homepage sections are composed here in order, per
        04_CONTENT_ARCHITECTURE.md — none are built yet:

        <About />   // id="about"  ->  /#about
        <Contact /> // id="contact" -> /#contact
      */}
    </main>
  );
}
