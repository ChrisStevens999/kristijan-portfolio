"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

import { optimizedImageUrl } from "@/lib/optimizedImageUrl";

import wallPlate from "../../../../assets/projects/skateboarding/wall-plate.jpg";
import { skateCampaigns, skateDecks, type SkateDeck } from "@/content/projects/skateboard-designs";

/**
 * Geometry. The wall is the approved mock-up's own wall — a clean plate
 * (assets/.../wall-plate.jpg, built by scripts/build-skate-wall-plate.js:
 * the real concrete, ceiling spotlights and steel rails with the baked-in
 * decks, heading and labels removed). Everything live is positioned in that
 * plate's coordinates (3840 x 2036) so the decks hang on its rails exactly
 * where the mock-up's did: same height, centres on one equal pitch fitted
 * to the mock-up's six (its own spacing wandered by ~50px).
 */
const PLATE_W = 3840;
const PLATE_H = 2036;
const PLATE_ASPECT = PLATE_W / PLATE_H;
const DECK_TOP = 428 / PLATE_H; // × stage height
const DECK_HEIGHT = 1393 / PLATE_H; // × stage height
const DECK_CENTRE_0 = 664 / PLATE_W; // × stage width (keep in step with the plate script's screws)
const DECK_PITCH = 513.4 / PLATE_W; // × stage width
const CANVAS_W = 834;
const CANVAS_H = 1871;
/** Every deck is normalised to the same height from its measured bbox; real decks are ~0.268 wide per unit of height. */
const HIT_WIDTH = 0.268; // × --deck-h

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
      className="absolute flex snap-center justify-center"
      style={{
        left: `${(DECK_CENTRE_0 + DECK_PITCH * index) * 100}%`,
        top: `${DECK_TOP * 100}%`,
        width: `${DECK_PITCH * 100}%`,
        transform: "translateX(-50%)",
        zIndex: active ? 20 : 1,
      }}
    >
      {/* SPOTLIGHT — the wall plate carries the dim resting ceiling lights;
          this is the deck's own lamp switching ON with hover/focus (always
          on for phones, which have no hover). Three parts: the beam from
          the ceiling, the pool it throws on the wall, and (inside the deck,
          below) a sheen masked to the deck's own shape. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-1/2 -z-10 -translate-x-1/2 transition-opacity duration-500 ease-out max-md:opacity-100 ${lit ? "opacity-100" : "opacity-0"}`}
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
        aria-hidden
        className={`pointer-events-none absolute left-1/2 -z-10 w-[240%] -translate-x-1/2 transition-opacity duration-500 ease-out max-md:opacity-100 ${lit ? "opacity-100" : "opacity-0"}`}
        style={{
          top: 0,
          height: "calc(var(--deck-h) * 0.95)",
          background:
            "radial-gradient(ellipse 50% 40% at 50% 40%, rgba(205,222,255,0.34), rgba(205,222,255,0.1) 50%, rgba(205,222,255,0) 100%)",
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
              // the cutout canvas is ~1.8x the deck column, and tall windows widen the stage
              sizes="(max-width: 767px) 80vw, 28vw"
              loading="eager"
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

/**
 * The skate-shop wall: the mock-up's real wall plate, with everything that
 * was baked into it re-drawn live on top — heading, six independent deck
 * cutouts (own shadows, own spotlights), labels. No deck exists in the
 * background, so nothing static shows behind a moving one.
 *
 * The stage keeps the plate's aspect ratio and the decks are placed in
 * plate percentages, so they sit on the rails at every size.
 *  - md and up: as wide as the viewport, or a little wider on tall windows
 *    (up to 116vw — the plate has ~7% of bare wall either side of the rails
 *    to give) so the wall fills the height; centred, sides cropped.
 *  - phones: the stage is sized by height and becomes a horizontal
 *    scroll-snap strip — one deck centred, its neighbours peeking in. The
 *    page itself never overflows sideways and scrolls vertically as normal.
 */
export function DeckWall() {
  const reduceMotion = !!useReducedMotion();

  return (
    <section
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
            src={wallPlate}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="(max-width: 767px) 140svh, 116vw"
            quality={95}
            draggable={false}
            className="object-cover select-none"
          />
          {/* the plate's bottom edge melts into the section's own dark */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[10%]"
            style={{ background: "linear-gradient(180deg, rgba(4,6,10,0), #04060a)" }}
          />
          <ul className="absolute inset-0">
            {skateDecks.map((deck, index) => (
              <Deck key={deck.id} deck={deck} index={index} />
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
