"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

import { optimizedImageUrl } from "@/lib/optimizedImageUrl";
import { skateCampaigns, skateDecks, type SkateDeck } from "@/content/projects/skateboard-designs";

/**
 * Geometry, all expressed against ONE length — the deck canvas height
 * (--deck-h) — so the composition scales as a unit. Ratios measured off the
 * approved reference (16:9 wall): canvas height ≈ 36.4% of the wall width,
 * deck-to-deck pitch ≈ 13.5% of it, bars at 20% / 75% of the deck's height.
 * The cutouts are 834x1871 with the deck in the middle ~58% of the width,
 * so the stable hit area is that narrow column while the image (and its
 * baked shadow) overhangs it on both sides without catching the pointer.
 */
const CANVAS_W = 834;
const CANVAS_H = 1871;
/** Every deck is normalised to the same height (--deck-h) from its measured bbox; real decks are ~0.268 wide per unit of height. */
const HIT_WIDTH = 0.268; // × --deck-h
const PITCH = 0.371; // × --deck-h (desktop/tablet)
const BAR_POSITIONS = [0.2, 0.75];
const BAR_HEIGHT = "max(12px, calc(var(--deck-h) * 0.042))";

/** Hover feel — restrained, per the brief (6–10px, 1.025–1.04, ≤3°). */
const LIFT_PX = 8;
const HOVER_SCALE = 1.032;
const MAX_TILT_DEG = 3;
/** Settles in ≈300ms with no visible bounce (slightly under critical damping). */
const LIFT_SPRING = { type: "spring", stiffness: 260, damping: 27, mass: 1 } as const;
/** Pointer tracking: soft and damped, never twitchy. */
const TILT_SPRING = { stiffness: 140, damping: 22, mass: 0.7 } as const;

/** Inline SVG fractal-noise tiles (stitched, so they repeat seamlessly) for the wall's concrete. */
function noiseTile(size: number, baseFrequency: number, octaves: number) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='${octaves}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const MOTTLE_TILE = noiseTile(900, 0.006, 3);
const GRAIN_TILE = noiseTile(260, 0.9, 3);

function scrollToCampaign(id: string, reduceMotion: boolean) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

/** Link, button or plain figure depending on whether the deck has a real destination — same box, same children. */
function DeckShell({
  deck,
  reduceMotion,
  className,
  style,
  handlers,
  children,
}: {
  deck: SkateDeck;
  reduceMotion: boolean;
  className: string;
  style: CSSProperties;
  handlers: {
    onPointerEnter: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerLeave: () => void;
    onFocus: (e: React.FocusEvent<HTMLElement>) => void;
    onBlur: () => void;
  };
  children: ReactNode;
}) {
  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-off-white focus-visible:outline-solid";
  if (deck.destination.kind === "project") {
    return (
      <Link
        href={deck.destination.href}
        aria-label={`${deck.title} — explore project`}
        className={`${className} ${focusRing}`}
        style={style}
        {...handlers}
      >
        {children}
      </Link>
    );
  }
  if (deck.destination.kind === "campaign") {
    const { campaignId } = deck.destination;
    return (
      <button
        type="button"
        aria-label={`${deck.alt} — see campaign`}
        onClick={() => scrollToCampaign(campaignId, reduceMotion)}
        className={`${className} ${focusRing} cursor-pointer`}
        style={style}
        {...handlers}
      >
        {children}
      </button>
    );
  }
  // No destination exists for this deck yet: not a control, but still
  // focusable so keyboard users get the same emphasis as hover.
  return (
    <div role="img" aria-label={deck.alt} tabIndex={0} className={`${className} ${focusRing}`} style={style} {...handlers}>
      {children}
    </div>
  );
}

function Deck({ deck, index }: { deck: SkateDeck; index: number }) {
  const reduceMotion = !!useReducedMotion();
  const deckAreaRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, TILT_SPRING);
  const rotateY = useSpring(tiltY, TILT_SPRING);

  const rest = () => {
    setActive(false);
    tiltX.set(0);
    tiltY.set(0);
  };

  const handlers = {
    // Touch never "hovers": on phones the labels are always visible and a
    // tap just follows the link, so nothing sticks in a lifted state.
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "touch") setActive(true);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (reduceMotion || e.pointerType === "touch") return;
      const rect = deckAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Measured against the STABLE deck column (not the moving image), so
      // the tilt can't feed back into itself.
      const px = Math.max(-0.5, Math.min(0.5, (e.clientX - rect.left) / rect.width - 0.5));
      const py = Math.max(-0.5, Math.min(0.5, (e.clientY - rect.top) / rect.height - 0.5));
      tiltY.set(px * 2 * MAX_TILT_DEG);
      tiltX.set(-py * 2 * MAX_TILT_DEG);
    },
    onPointerLeave: rest,
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(":focus-visible")) setActive(true);
    },
    onBlur: rest,
  };

  const number = String(index + 1).padStart(2, "0");
  const action =
    deck.destination.kind === "project"
      ? "Explore project ↗"
      : deck.destination.kind === "campaign"
        ? "See campaign ↓"
        : null;
  const lifted = active && !reduceMotion;
  const lit = active;

  // Map the deck's measured bbox onto the column box: scale by height,
  // pin the bbox top to the box top, centre the bbox horizontally.
  const { x1, x2, y1, y2 } = deck.bbox;
  const bboxH = y2 - y1 + 1;
  const cutoutStyle: CSSProperties = {
    height: `${(CANVAS_H / bboxH) * 100}%`,
    width: "auto",
    top: `${(-y1 / bboxH) * 100}%`,
    left: "50%",
    transform: `translateX(${(-((x1 + x2 + 1) / 2) / CANVAS_W) * 100}%)`,
  };
  const maskUrl = optimizedImageUrl(deck.src.src, 640);

  return (
    <li
      className="relative flex shrink-0 snap-center justify-center"
      style={{ width: "var(--pitch)", zIndex: active ? 20 : 1 }}
    >
      {/* SPOTLIGHT — off (a faint glow) at rest, switched on by hover/focus;
          always on for phones, which have no hover. Three parts: the beam
          falling from above the row, the pool it throws on the wall, and
          (inside the deck, below) a sheen masked to the deck's own shape. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-1/2 -z-10 -translate-x-1/2 transition-opacity duration-500 ease-out max-md:opacity-100 ${lit ? "opacity-100" : "opacity-[0.1]"}`}
        style={{
          width: "calc(var(--deck-h) * 0.66)",
          top: "calc(var(--deck-h) * -0.24)",
          height: "calc(var(--deck-h) * 1)",
          // Blur lives on this OUTER box and the cone shape on the inner one:
          // a filter is applied before clip-path, so blurring the clipped
          // element itself would leave the cone hard-edged.
          filter: "blur(16px)",
        }}
      >
        <span
          className="absolute inset-0"
          style={{
            clipPath: "polygon(45% 0, 55% 0, 92% 100%, 8% 100%)",
            background:
              "linear-gradient(180deg, rgba(225,235,255,0.85) 0%, rgba(208,224,255,0.34) 28%, rgba(208,224,255,0.12) 62%, rgba(208,224,255,0) 100%)",
          }}
        />
      </span>
      <span
        aria-hidden
        className={`pointer-events-none absolute left-1/2 -z-10 w-[240%] -translate-x-1/2 transition-opacity duration-500 ease-out max-md:opacity-100 ${lit ? "opacity-100" : "opacity-[0.18]"}`}
        style={{
          top: 0,
          height: "calc(var(--deck-h) * 0.95)",
          background:
            "radial-gradient(ellipse 50% 40% at 50% 40%, rgba(205,222,255,0.34), rgba(205,222,255,0.1) 50%, rgba(205,222,255,0) 100%)",
        }}
      />
      {/* Rail brackets: a clamp plate behind the deck at each rail, its
          bolted ears showing either side — like the reference's mounts. */}
      {BAR_POSITIONS.map((at) => (
        <span
          key={at}
          aria-hidden
          className="pointer-events-none absolute left-1/2 -z-10 -translate-x-1/2 rounded-[3px]"
          style={{
            top: `calc(var(--deck-h) * ${at} - (${BAR_HEIGHT}) * 0.3)`,
            height: `calc((${BAR_HEIGHT}) * 1.6)`,
            width: `calc(var(--deck-h) * ${HIT_WIDTH} * 1.17)`,
            background: "linear-gradient(180deg, #4a525e 0%, #262c35 30%, #151a20 75%, #0b0e12 100%)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.14) inset, 0 6px 10px rgba(0,0,0,0.6)",
          }}
        />
      ))}
      <DeckShell
        deck={deck}
        reduceMotion={reduceMotion}
        className="relative block text-center"
        style={{ width: `calc(var(--deck-h) * ${HIT_WIDTH})` }}
        handlers={handlers}
      >
        {/* Stable hit column; everything that moves lives INSIDE it. */}
        <div ref={deckAreaRef} className="relative" style={{ height: "var(--deck-h)" }}>
          {/* Contact shadow: grows and drops as the deck leaves the wall. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-[4%] top-[2%] bottom-[1%] rounded-[999px] bg-black blur-xl"
            initial={false}
            animate={{ opacity: lifted ? 0.7 : 0.45, y: lifted ? 22 : 8, scaleX: lifted ? 1.12 : 1 }}
            transition={LIFT_SPRING}
          />
          {/* The moving layer IS the deck's box (column wide, --deck-h tall);
              the cutout inside is scaled and offset from its measured bbox so
              the deck itself fills that box exactly — identical size and
              spacing for all six, whatever padding each PNG was exported with. */}
          <motion.div
            className="pointer-events-none absolute inset-0 will-change-transform"
            style={{ rotateX, rotateY, transformPerspective: 900 }}
            initial={false}
            animate={{ y: lifted ? -LIFT_PX : 0, scale: lifted ? HOVER_SCALE : 1 }}
            transition={LIFT_SPRING}
          >
            <Image
              src={deck.src}
              alt=""
              sizes="(max-width: 767px) 70vw, 18vw"
              quality={95}
              draggable={false}
              className="absolute max-w-none select-none"
              style={cutoutStyle}
            />
            <span
              aria-hidden
              className={`absolute transition-opacity duration-500 ease-out max-md:opacity-100 ${lit ? "opacity-100" : "opacity-0"}`}
              style={{
                ...cutoutStyle,
                aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                background:
                  "radial-gradient(ellipse 60% 34% at 50% 4%, rgba(255,255,255,0.5), rgba(255,255,255,0.14) 55%, rgba(255,255,255,0) 100%)",
                mixBlendMode: "screen",
                maskImage: `url("${maskUrl}")`,
                WebkitMaskImage: `url("${maskUrl}")`,
                maskSize: "100% 100%",
                WebkitMaskSize: "100% 100%",
              }}
            />
          </motion.div>
        </div>

        {/* Label: fixed-height box, layers cross-fade — nothing reflows.
            Number at rest, the deck's name on hover/focus (always the name
            on phones), plus an action line where a destination exists. */}
        <div className="font-sans relative mt-4 h-10 text-[11px] leading-tight tracking-[0.14em] uppercase sm:text-xs">
          <span
            className={`absolute inset-x-[-60%] top-0 text-off-white/75 transition-opacity duration-300 max-md:opacity-0 ${active ? "md:opacity-0" : ""}`}
          >
            {number}
          </span>
          <span
            className={`absolute inset-x-[-60%] top-0 transition-opacity duration-300 ${active ? "" : "md:opacity-0"}`}
          >
            <span className="block font-medium" style={{ color: deck.accent }}>
              {deck.title}
            </span>
            {action ? (
              <span className="mt-1 block text-[9px] tracking-[0.16em] text-off-white/85 sm:text-[10px]">{action}</span>
            ) : null}
          </span>
        </div>
      </DeckShell>
    </li>
  );
}

/** One steel rail: CSS only — a chunky bevelled bar (lit top edge, dark underside), hard drop shadow on the wall, capped and bolted at both ends. */
function MountingBar({ at }: { at: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        top: `calc(var(--track-pad) + var(--deck-h) * ${at})`,
        left: "calc(var(--deck-h) * -0.06)",
        right: "calc(var(--deck-h) * -0.06)",
        height: BAR_HEIGHT,
      }}
    >
      <div
        className="absolute inset-0 rounded-[2px]"
        style={{
          background:
            "linear-gradient(180deg, #5a6370 0%, #3a424d 12%, #232931 40%, #161b21 70%, #0a0d11 100%)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.22) inset, 0 -1px 0 rgba(0,0,0,0.7) inset, 0 14px 20px rgba(0,0,0,0.7), 0 3px 4px rgba(0,0,0,0.85)",
        }}
      />
      {["left-0", "right-0"].map((side) => (
        <span
          key={side}
          className={`absolute -top-[22%] ${side} flex h-[144%] w-[2.2%] min-w-[14px] items-center justify-center rounded-[3px]`}
          style={{
            background: "linear-gradient(180deg, #4a525e 0%, #242a32 35%, #0e1216 100%)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.16) inset, 0 8px 12px rgba(0,0,0,0.65)",
          }}
        >
          <span
            className="aspect-square h-[38%] rounded-full"
            style={{ background: "radial-gradient(circle at 35% 30%, #939dab, #1a1f26 72%)" }}
          />
        </span>
      ))}
    </div>
  );
}

/**
 * The skate-shop wall. Built in layers — textured wall, overhead light
 * cones, steel bars, six independent deck cutouts with their own shadows,
 * labels — never the flattened mock-up (which would leave a dead copy of
 * each deck behind the live one).
 *
 * Desktop/tablet: all six decks in one centred row, sized from --deck-h.
 * Mobile: the same track becomes a horizontal scroll-snap strip (one deck
 * centred, the next peeking in); vertical page scrolling is untouched and
 * nothing overflows the page horizontally.
 */
export function DeckWall() {
  const reduceMotion = !!useReducedMotion();

  return (
    <section
      aria-labelledby="skateboard-designs-heading"
      className="relative isolate flex min-h-[100svh] w-full flex-col overflow-hidden bg-[#07090d]"
      style={
        {
          "--deck-h": "min(35vw, 62svh)",
          "--pitch": `calc(var(--deck-h) * ${PITCH})`,
          "--track-pad": "32px",
        } as CSSProperties
      }
    >
      {/* Wall, like the reference: an even, cold blue-grey concrete — a
          navy base that's lighter where the ceiling lights wash the top,
          broad soft mottling, fine grain, then a vignette. Procedural (two
          tiny inline SVG noise tiles), so it's even edge to edge with no
          photo streaks, and costs no image request. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #1a2535 0%, #131c2a 38%, #0c131d 72%, #070b12 100%)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-80 mix-blend-soft-light"
        style={{ backgroundImage: `url("${MOTTLE_TILE}")`, backgroundSize: "900px 900px" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60 mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN_TILE}")`, backgroundSize: "260px 260px" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 42% at 50% -6%, rgba(160,185,225,0.2), rgba(160,185,225,0) 100%), radial-gradient(ellipse 85% 70% at 50% 40%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.42) 80%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      <h1
        id="skateboard-designs-heading"
        className="font-sans relative px-6 pt-[clamp(1.5rem,5svh,3.5rem)] text-center text-3xl leading-none tracking-tight text-white uppercase sm:text-4xl lg:text-5xl"
      >
        Skateboard Designs
      </h1>

      <div className="relative flex flex-1 items-center">
        {/* On phones this is the swipe strip; from md up it never scrolls. */}
        <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] max-md:snap-x max-md:snap-mandatory md:overflow-visible [&::-webkit-scrollbar]:hidden">
          <div
            // Phones: a bigger deck, a wider pitch, and side padding of half
            // a viewport minus half a pitch so the first and last decks can
            // snap to centre too.
            className="relative mx-auto w-max max-md:px-[calc(50vw-var(--pitch)/2)] max-md:[--deck-h:min(124vw,56svh)] max-md:[--pitch:calc(var(--deck-h)*0.42)]"
            style={{ paddingBlock: "var(--track-pad)" }}
          >
            {BAR_POSITIONS.map((at) => (
              <MountingBar key={at} at={at} />
            ))}

            <ul className="relative flex">
              {skateDecks.map((deck, index) => (
                <Deck key={deck.id} deck={deck} index={index} />
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="font-sans relative flex items-center justify-between gap-4 border-t border-off-white/15 px-4 py-3 text-[8px] tracking-[0.12em] whitespace-nowrap text-off-white uppercase sm:px-10 sm:text-[11px]">
        <p>Pick a board. Explore the artwork</p>
        <button
          type="button"
          onClick={() => scrollToCampaign(skateCampaigns[0].id, reduceMotion)}
          className="cursor-pointer whitespace-nowrap hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-off-white focus-visible:outline-solid"
        >
          Scroll for campaigns ↓
        </button>
      </div>
    </section>
  );
}
