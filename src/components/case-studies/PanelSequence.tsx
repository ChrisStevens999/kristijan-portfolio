import Image from "next/image";
import type { ReactNode } from "react";

import type {
  SequenceImagePanel,
  SequencePanel,
  SequenceRowPanel,
  SequenceVideoPanel,
} from "@/content/types";

function VideoPanel({ panel, framed }: { panel: SequenceVideoPanel; framed: boolean }) {
  // Framed mode shows every panel whole (natural aspect ratio, no crop) —
  // the full-bleed cover treatment only applies to the edge-to-edge layout.
  const fullBleed = (panel.fullViewport ?? true) && !framed;
  const objectPosition =
    panel.mobileObjectPosition ?? panel.desktopObjectPosition ?? "50% 50%";

  // Autoplay requires muted; playsInline stops iOS from going fullscreen.
  // No controls — this is a moving panel, not a player.
  if (fullBleed) {
    return (
      <div className="relative h-[100svh] w-full lg:h-screen">
        <video
          src={panel.src}
          poster={panel.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={panel.alt}
          style={{ objectPosition }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <video
      src={panel.src}
      poster={panel.poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={panel.alt}
      className="block h-auto w-full"
    />
  );
}

function Panel({ panel, framed }: { panel: SequenceImagePanel; framed: boolean }) {
  // Framed mode shows the image whole; only the edge-to-edge layout crops
  // full-viewport panels to fill the screen height.
  if (panel.fullViewport && !framed) {
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

/** A tight row of separate images, each cropped to the same aspect ratio, no gap — see SequenceRowPanel. */
function RowPanel({ panel }: { panel: SequenceRowPanel }) {
  const aspectRatio = panel.aspectRatio ?? 1;
  return (
    <div className="flex w-full">
      {panel.items.map((item, index) => (
        <div key={index} className="relative w-full" style={{ aspectRatio }}>
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes="33vw"
            quality={95}
            className="object-cover"
          />
        </div>
      ))}
    </div>
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
  framed = false,
}: {
  panels: SequencePanel[];
  exitNav?: ReactNode;
  /**
   * Center the sequence in a fixed-max-width column so the black background
   * shows as bars either side — the "mockup preview" framing. Bars only
   * appear once the viewport is wider than the column, so mobile stays
   * edge-to-edge. Off by default (Damaged Goods stays full-bleed).
   */
  framed?: boolean;
}) {
  const enabledPanels = panels.filter(
    (panel): panel is SequenceImagePanel | SequenceVideoPanel | SequenceRowPanel => panel.enabled,
  );

  return (
    // Framed mode paints true #000000 so the side bars read as pure black,
    // not the theme's near-black `bg-black` (#080808).
    <main
      className={`flex flex-col text-off-white ${framed ? "bg-[#000000]" : "bg-black"}`}
    >
      <div
        className={
          framed
            ? "mx-auto flex w-full max-w-5xl flex-col"
            : "flex flex-col"
        }
      >
        {enabledPanels.map((panel) => {
          if ("kind" in panel && panel.kind === "video") {
            return <VideoPanel key={panel.id} panel={panel} framed={framed} />;
          }
          if ("kind" in panel && panel.kind === "row") {
            return <RowPanel key={panel.id} panel={panel} />;
          }
          return <Panel key={panel.id} panel={panel as SequenceImagePanel} framed={framed} />;
        })}
      </div>

      {exitNav}
    </main>
  );
}
