import Image from "next/image";
import type { ReactNode } from "react";

import type { SequenceImagePanel, SequencePanel } from "@/content/types";

function Panel({ panel }: { panel: SequenceImagePanel }) {
  if (panel.fullViewport) {
    const mobilePosition = panel.mobileObjectPosition ?? panel.desktopObjectPosition ?? "50% 50%";
    const desktopPosition = panel.desktopObjectPosition ?? "50% 50%";
    return (
      <div className="relative h-[100svh] w-full lg:h-screen">
        {/* Two stacked images (shown/hidden by breakpoint) rather than a
            dynamic Tailwind arbitrary-value class — object-position values
            come from content data, and Tailwind can't generate a utility
            class for a value it can't see statically in source. */}
        <Image
          src={panel.src}
          alt={panel.alt}
          fill
          priority={panel.priority}
          sizes="100vw"
          quality={95}
          style={{ objectPosition: mobilePosition }}
          className="object-cover lg:hidden"
        />
        <Image
          src={panel.src}
          alt={panel.alt}
          fill
          priority={panel.priority}
          sizes="100vw"
          quality={95}
          style={{ objectPosition: desktopPosition }}
          className="hidden object-cover lg:block"
        />
      </div>
    );
  }

  return (
    <Image
      src={panel.src}
      alt={panel.alt}
      sizes="100vw"
      quality={95}
      priority={panel.priority}
      className="block h-auto w-full"
    />
  );
}

/**
 * Renders a flat, ordered SequencePanel array as one seamless vertical
 * composition — no gap, no padding, no max-width wrapper. Shared by every
 * image-sequence case study (BoyzClub, Damaged Goods) reconstructing a
 * supplied tall reference board, so the rendering logic exists once.
 */
export function PanelSequence({
  panels,
  exitNav,
}: {
  panels: SequencePanel[];
  exitNav?: ReactNode;
}) {
  const enabledPanels = panels.filter(
    (panel): panel is SequenceImagePanel => panel.enabled,
  );

  return (
    <main className="flex flex-col bg-black text-off-white">
      <div className="flex flex-col">
        {enabledPanels.map((panel) => (
          <Panel key={panel.id} panel={panel} />
        ))}
      </div>

      {exitNav}
    </main>
  );
}
