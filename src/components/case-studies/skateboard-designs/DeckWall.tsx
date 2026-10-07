"use client";

import { motionValue, useInView, useReducedMotion, type MotionValue } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

import wall from "../../../../assets/projects/skateboarding/wall-rails.webp";
import { skateCampaigns, skateDecks, type SkateDeck } from "@/content/projects/skateboard-designs";

import type { DeckLayout, DeckSlot } from "./DeckScene";

const DeckScene = dynamic(() => import("./DeckScene").then((m) => m.DeckScene), { ssr: false });

/**
 * Geometry. The wall is the supplied plate (assets/.../wall-rails.webp,
 * 2000 x 1116: lit concrete, ceiling spotlights, two steel rails). The decks
 * hang across both rails, six on one equal pitch centred on the rails, with
 * the top rail a fifth of the way down each deck and the bottom rail about
 * three quarters — the way the earlier mock-up mounted them. Everything live
 * (the 3D decks, their lamps, hit areas and labels) is placed in the plate's
 * fractions, so it all sits on the rails at every size.
 */
const PLATE_W = 2000;
const PLATE_H = 1116;
const PLATE_ASPECT = PLATE_W / PLATE_H;
const RAILS = [400, 792]; // rail centres, plate px
const DECK_HEIGHT_PX = (RAILS[1] - RAILS[0]) / 0.54;
const DECK_TOP = (RAILS[0] - 0.19 * DECK_HEIGHT_PX) / PLATE_H; // × stage height
const DECK_HEIGHT = DECK_HEIGHT_PX / PLATE_H; // × stage height
const DECK_PITCH = 280 / PLATE_W; // × stage width
const DECK_CENTRE_0 = (997.5 - 2.5 * 280) / PLATE_W; // × stage width (the six centred on the rails)
/** The deck model is 0.214 wide per 0.797 of length. */
const HIT_WIDTH = 0.2686; // × --deck-h

const LAYOUT: DeckLayout = {
  aspect: PLATE_ASPECT,
  centre0: DECK_CENTRE_0,
  pitch: DECK_PITCH,
  top: DECK_TOP,
  height: DECK_HEIGHT,
};

/** Tilt after the pointer, degrees (the scene springs it). */
const MAX_TILT_DEG = 6;

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

/** A deck's column, in plate fractions: where its lamp, hit area and label go. */
function columnStyle(index: number): CSSProperties {
  return {
    left: `${(DECK_CENTRE_0 + DECK_PITCH * index) * 100}%`,
    top: `${DECK_TOP * 100}%`,
    width: `${DECK_PITCH * 100}%`,
    transform: "translateX(-50%)",
  };
}

/**
 * SPOTLIGHT — the wall carries the dim resting ceiling lights; this is the
 * deck's own lamp switching ON with hover/focus (always on for phones,
 * which have no hover): the beam from the ceiling and the pool it throws
 * on the wall. Drawn UNDER the 3D decks.
 */
function Lamp({ index, lit }: { index: number; lit: boolean }) {
  return (
    <li aria-hidden className="absolute flex justify-center" style={columnStyle(index)}>
      <span
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 transition-opacity duration-500 ease-out max-md:opacity-100 ${lit ? "opacity-100" : "opacity-0"}`}
        style={{
          width: "calc(var(--deck-h) * 0.66)",
          // from the very top of the wall (the ceiling) down onto the deck
          top: `calc(var(--deck-h) * ${-DECK_TOP / DECK_HEIGHT})`,
          height: `calc(var(--deck-h) * ${DECK_TOP / DECK_HEIGHT + 0.72})`,
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
        className={`pointer-events-none absolute left-1/2 w-[240%] -translate-x-1/2 transition-opacity duration-500 ease-out max-md:opacity-100 ${lit ? "opacity-100" : "opacity-0"}`}
        style={{
          top: 0,
          height: "calc(var(--deck-h) * 0.95)",
          background:
            "radial-gradient(ellipse 50% 40% at 50% 40%, rgba(205,222,255,0.34), rgba(205,222,255,0.1) 50%, rgba(205,222,255,0) 100%)",
        }}
      />
    </li>
  );
}

/**
 * A deck's hit area and label, OVER the 3D decks. The DOM owns the pointer:
 * hover/focus and the pointer's position in the column go to the scene
 * (which lifts and tilts the deck) and switch the lamp on.
 */
function Deck({
  deck,
  index,
  active,
  onActive,
  tiltX,
  tiltY,
}: {
  deck: SkateDeck;
  index: number;
  active: boolean;
  onActive: (on: boolean) => void;
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
}) {
  const reduceMotion = !!useReducedMotion();
  const deckAreaRef = useRef<HTMLDivElement>(null);

  const rest = () => {
    onActive(false);
    tiltX.set(0);
    tiltY.set(0);
  };

  const handlers = {
    // Touch never "hovers": on phones the labels are always visible and a
    // tap just follows the link, so nothing sticks in a lifted state.
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "touch") onActive(true);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (reduceMotion || e.pointerType === "touch") return;
      const rect = deckAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      // the side of the deck under the pointer comes towards the viewer
      const px = Math.max(-0.5, Math.min(0.5, (e.clientX - rect.left) / rect.width - 0.5));
      const py = Math.max(-0.5, Math.min(0.5, (e.clientY - rect.top) / rect.height - 0.5));
      tiltY.set(px * 2 * MAX_TILT_DEG);
      tiltX.set(-py * 2 * MAX_TILT_DEG);
    },
    onPointerLeave: rest,
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(":focus-visible")) onActive(true);
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

  return (
    <li className="absolute flex snap-center justify-center" style={{ ...columnStyle(index), zIndex: active ? 20 : 1 }}>
      <DeckShell
        deck={deck}
        reduceMotion={reduceMotion}
        className="relative block text-center"
        style={{ width: `calc(var(--deck-h) * ${HIT_WIDTH})` }}
        handlers={handlers}
      >
        {/* the hit column: the deck itself is drawn by the scene underneath */}
        <div ref={deckAreaRef} className="relative" style={{ height: "var(--deck-h)" }} />

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

/**
 * The skate-shop wall: the supplied wall plate, the six decks in 3D on its
 * rails (one canvas, DeckScene), each deck's lamp under them and its hit
 * area and label over them.
 *
 * The stage keeps the plate's aspect ratio and everything is placed in
 * plate percentages, so the decks sit on the rails at every size.
 *  - md and up: as wide as the viewport, or a little wider on tall windows
 *    (up to 116vw — the plate has ~7% of bare wall either side of the rails
 *    to give) so the wall fills the height; centred, sides cropped.
 *  - phones: the stage is sized by height and becomes a horizontal
 *    scroll-snap strip — one deck centred, its neighbours peeking in. The
 *    page itself never overflows sideways and scrolls vertically as normal.
 */
export function DeckWall() {
  const reduceMotion = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { margin: "20% 0px" });
  const [active, setActive] = useState<number | null>(null);
  // one pair of tilt values per deck: written by the DOM, read by the scene
  const tilts = useMemo(() => skateDecks.map(() => ({ x: motionValue(0), y: motionValue(0) })), []);
  const slots: DeckSlot[] = skateDecks.map((deck, i) => ({
    deck,
    active: active === i,
    tiltX: tilts[i].x,
    tiltY: tilts[i].y,
  }));

  return (
    <section
      ref={sectionRef}
      aria-labelledby="skateboard-designs-heading"
      className="relative isolate flex min-h-[100svh] w-full flex-col overflow-clip bg-[#04060a] [--stage-h:74svh] [--stage-w:calc(var(--stage-h)*var(--plate-aspect))] md:[--stage-h:calc(var(--stage-w)/var(--plate-aspect))] md:[--stage-w:clamp(100vw,calc((100svh-44px)*var(--plate-aspect)),116vw)]"
      style={
        {
          "--plate-aspect": PLATE_ASPECT,
          "--deck-h": `calc(var(--stage-h) * ${DECK_HEIGHT})`,
        } as CSSProperties
      }
    >
      {/* On phones this is the swipe strip; from md up it never scrolls. */}
      <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] max-md:snap-x max-md:snap-mandatory md:overflow-visible [&::-webkit-scrollbar]:hidden">
        {/* md+: centred by offset, and the section CLIPS (overflow: clip, not
            hidden) — a hidden-overflow box is still scrollable by focus or
            scrollIntoView, which would slide the whole wall sideways. */}
        <div
          className="relative md:left-1/2 md:-translate-x-1/2"
          style={{ width: "var(--stage-w)", height: "var(--stage-h)" }}
        >
          <Image
            src={wall}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="(max-width: 767px) 140svh, 116vw"
            quality={90}
            draggable={false}
            className="object-cover select-none"
          />
          {/* the plate's bottom edge melts into the section's own dark */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[10%]"
            style={{ background: "linear-gradient(180deg, rgba(4,6,10,0), #04060a)" }}
          />
          <ul aria-hidden className="absolute inset-0">
            {skateDecks.map((deck, i) => (
              <Lamp key={deck.id} index={i} lit={active === i} />
            ))}
          </ul>
          <div className="absolute inset-0">
            <DeckScene slots={slots} layout={LAYOUT} reducedMotion={reduceMotion} running={inView} />
          </div>
          <ul className="absolute inset-0">
            {skateDecks.map((deck, i) => (
              <Deck
                key={deck.id}
                deck={deck}
                index={i}
                active={active === i}
                onActive={(on) => setActive((cur) => (on ? i : cur === i ? null : cur))}
                tiltX={tilts[i].x}
                tiltY={tilts[i].y}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* Heading: drawn over the wall where the mock-up's sat, but outside
          the strip so it stays put while phones swipe the decks. */}
      <h1
        id="skateboard-designs-heading"
        className="font-sans pointer-events-none absolute inset-x-0 px-6 text-center text-3xl leading-none tracking-tight text-white uppercase sm:text-4xl lg:text-5xl"
        style={{ top: "calc(var(--stage-h) * 0.09)", transform: "translateY(-50%)" }}
      >
        Skateboard Designs
      </h1>

      <div className="flex-1" />

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
