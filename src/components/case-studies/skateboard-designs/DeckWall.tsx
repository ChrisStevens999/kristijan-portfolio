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
const CANVAS_ASPECT = 834 / 1871;
const HIT_WIDTH = 0.27; // × --deck-h
const PITCH = 0.371; // × --deck-h (desktop/tablet)
const BAR_POSITIONS = [0.2, 0.75];

/** Hover feel — restrained, per the brief (6–10px, 1.025–1.04, ≤3°). */
const LIFT_PX = 8;
const HOVER_SCALE = 1.032;
const MAX_TILT_DEG = 3;
/** Settles in ≈300ms with no visible bounce (slightly under critical damping). */
const LIFT_SPRING = { type: "spring", stiffness: 260, damping: 27, mass: 1 } as const;
/** Pointer tracking: soft and damped, never twitchy. */
const TILT_SPRING = { stiffness: 140, damping: 22, mass: 0.7 } as const;

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
        aria-label={`${deck.title ?? deck.alt} — explore project`}
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

  return (
    <li
      className="relative flex shrink-0 snap-center justify-center"
      style={{ width: "var(--pitch)", zIndex: active ? 20 : 1 }}
    >
      {/* Overhead light: a soft pool on the wall behind this deck. The
          ellipse is fully contained in its box, so it has no edge to clip. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 -z-10 w-[230%] -translate-x-1/2"
        style={{
          top: 0,
          height: "calc(var(--deck-h) * 0.95)",
          background:
            "radial-gradient(ellipse 50% 38% at 50% 38%, rgba(200,216,245,0.2), rgba(200,216,245,0.07) 50%, rgba(200,216,245,0) 100%)",
        }}
      />
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
            className="pointer-events-none absolute inset-x-[6%] top-[5%] bottom-[3%] rounded-[999px] bg-black blur-xl"
            initial={false}
            animate={{ opacity: lifted ? 0.7 : 0.45, y: lifted ? 22 : 8, scaleX: lifted ? 1.12 : 1 }}
            transition={LIFT_SPRING}
          />
          <motion.div
            className="pointer-events-none absolute top-0 left-1/2 h-full will-change-transform"
            style={{
              aspectRatio: `${CANVAS_ASPECT}`,
              x: "-50%",
              rotateX,
              rotateY,
              transformPerspective: 900,
            }}
            initial={false}
            animate={{ y: lifted ? -LIFT_PX : 0, scale: lifted ? HOVER_SCALE : 1 }}
            transition={LIFT_SPRING}
          >
            <Image
              src={deck.src}
              alt=""
              fill
              sizes="(max-width: 767px) 70vw, 18vw"
              quality={95}
              draggable={false}
              className="object-contain select-none"
            />
          </motion.div>
        </div>

        {/* Label: fixed-height box, layers cross-fade — nothing reflows. */}
        <div className="font-sans relative mt-3 h-9 text-[10px] leading-tight tracking-[0.14em] uppercase sm:text-[11px]">
          <span
            className={`absolute inset-x-[-60%] top-0 transition-opacity duration-300 ${
              action ? `max-md:opacity-0 ${active ? "md:opacity-0" : ""}` : ""
            } ${active ? "text-off-white" : "text-off-white/70"}`}
          >
            {number}
          </span>
          {action ? (
            <span
              className={`absolute inset-x-[-60%] top-0 transition-opacity duration-300 ${active ? "" : "md:opacity-0"}`}
            >
              <span className="block font-medium" style={{ color: deck.accent }}>
                {deck.title ?? number}
              </span>
              <span className="mt-1 block text-[8px] tracking-[0.16em] text-off-white/85 sm:text-[9px]">{action}</span>
            </span>
          ) : null}
        </div>
      </DeckShell>
    </li>
  );
}

/** One steel mounting bar: CSS only — brushed gradient, top highlight, drop shadow, bolted end caps. */
function MountingBar({ at }: { at: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        top: `calc(var(--track-pad) + var(--deck-h) * ${at})`,
        left: "calc(var(--deck-h) * -0.02)",
        right: "calc(var(--deck-h) * -0.02)",
        height: "max(10px, calc(var(--deck-h) * 0.034))",
      }}
    >
      <div
        className="absolute inset-0 rounded-[2px]"
        style={{
          background: "linear-gradient(180deg, #3a414b 0%, #1d2229 38%, #12161b 72%, #0a0d10 100%)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.10) inset, 0 10px 18px rgba(0,0,0,0.65), 0 2px 3px rgba(0,0,0,0.8)",
        }}
      />
      {["left-[0.6%]", "right-[0.6%]"].map((side) => (
        <span
          key={side}
          className={`absolute top-1/2 ${side} aspect-square h-[46%] -translate-y-1/2 rounded-full`}
          style={{ background: "radial-gradient(circle at 35% 30%, #6b7480, #161a1f 70%)" }}
        />
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
          "--deck-h": "min(36vw, 64svh)",
          "--pitch": `calc(var(--deck-h) * ${PITCH})`,
          "--track-pad": "28px",
        } as CSSProperties
      }
    >
      {/* Wall: texture pushed cold and dark, then a vignette. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          // The project's weathered-zinc photo, desaturated and pulled right
          // down: reads as a scuffed concrete shop wall once tinted cold.
          backgroundImage: `url("${optimizedImageUrl("/textures/metal-zinc.jpg", 1920)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1) brightness(0.36) contrast(1.35)",
        }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[#1d2f49] mix-blend-color opacity-60" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 65% at 50% 36%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.5) 78%, rgba(0,0,0,0.82) 100%)",
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
            className="relative mx-auto w-max max-md:px-[calc(50vw-var(--pitch)/2)] max-md:[--deck-h:min(128vw,58svh)] max-md:[--pitch:calc(var(--deck-h)*0.42)]"
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
