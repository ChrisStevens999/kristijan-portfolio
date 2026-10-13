import Link from "next/link";

import { textureStyle, TEXTURES } from "@/lib/textures";

export const metadata = { title: "Page not found" };

/** An unknown address: the site's own black page, and a way back in. */
export default function NotFound() {
  return (
    <main
      className="flex min-h-[100svh] flex-col items-center justify-center gap-6 px-6 text-center text-off-white"
      style={textureStyle(TEXTURES.black)}
    >
      <p className="font-accent text-xs tracking-[0.3em] text-off-white/70 uppercase">404</p>
      <h1 className="font-sans text-3xl leading-tight uppercase sm:text-5xl">Page not found</h1>
      <Link
        href="/"
        className="font-accent text-sm tracking-[0.3em] text-off-white uppercase underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white focus-visible:outline-solid"
      >
        ← Back to the start
      </Link>
    </main>
  );
}
