import type { Metadata } from "next";

import { AboutBook } from "@/components/sections/AboutBook";

export const metadata: Metadata = { title: "About" };

/**
 * About: the little black book (BlackBook), on its own page and already
 * open on the first spread. The homepage carries the same book, closed, as
 * a stop between Selected Work and the categories.
 */
export default function AboutPage() {
  return (
    <main className="bg-[#000] text-off-white">
      <AboutBook startOpen heading="h1" />
    </main>
  );
}
