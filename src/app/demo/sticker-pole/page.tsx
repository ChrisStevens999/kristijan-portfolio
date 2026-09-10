import type { Metadata } from "next";

import { StickerPoleDemo } from "@/components/case-studies/sticker-pole-demo/StickerPoleDemo";

export const metadata: Metadata = {
  title: "Sticker Pole — demo",
  robots: { index: false, follow: false },
};

/** Standalone demo route — not a project, not listed anywhere. */
export default function StickerPoleDemoPage() {
  return <StickerPoleDemo />;
}
