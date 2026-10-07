"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { animate, motion, useMotionValue, type MotionValue } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { SkateDeck } from "@/content/projects/skateboard-designs";

import { CAMERA_DISTANCE, DECK_WIDTH, DeckLights, dressDeck, FOV, loadModel, loadPrint, setOpacity, type DressedDeck } from "./deckModel";

/**
 * The close-up: a picked deck leaves the wall and flies to the middle of
 * the screen, large, in its own layer over everything else — which blurs
 * and darkens behind it. Drag turns it around (it also turns slowly on its
 * own once it has arrived). Double-click and it kickflips back to its place
 * on the rail: one full flip around its length, popped towards you on the
 * way; the × and Escape put it back plainly.
 *
 * Its own canvas covers the viewport with the same camera as the wall's, so
 * the deck starts exactly where the wall drew it (the wall hides its copy
 * meanwhile) and lands back there. World units here are viewport heights.
 */

export type InspectRequest = {
  deck: SkateDeck;
  index: number;
  /** the deck's box on screen when picked (viewport px): where it flies from, and back to */
  from: DOMRect;
};

/** the close-up deck: this tall (× viewport height), unless the width says less */
const CLOSE_UP_HEIGHT = 0.82;
const CLOSE_UP_MAX_WIDTH = 0.84; // × viewport width
const OPEN_SPRING = { type: "spring", stiffness: 110, damping: 21, mass: 1 } as const;
const CLOSE_SPRING = { type: "spring", stiffness: 150, damping: 26, mass: 1 } as const;
const TURN_SPRING = { type: "spring", stiffness: 120, damping: 24, mass: 1 } as const;
/** the kickflip home: one turn around the deck's length while it flies, popped towards the viewer mid-way */
const TAU = Math.PI * 2;
const FLIP_S = 0.85;
const FLIP_EASE = [0.45, 0, 0.2, 1] as const;
const POP_Z = 0.16; // × viewport height, towards the camera
const POP_Y = 0.05; // × viewport height, the hop
/** drag: radians per pixel */
const DRAG_YAW = 0.009;
const DRAG_PITCH = 0.006;
const MAX_PITCH = 1.0;
/** inertia after a flick, and the slow turn on its own once idle */
const INERTIA_DAMPING = 4;
const IDLE_TURN = 0.25; // rad/s
const IDLE_AFTER_MS = 1800;
const CLICK_SLOP = 6; // px: less movement than this is a click, not a drag
const DOUBLE_MS = 400;
const DOUBLE_PX = 28;

type Drag = {
  active: boolean;
  moved: number;
  lastX: number;
  lastY: number;
  lastT: number;
  /** yaw velocity, rad/s, carried on after the pointer lets go */
  vx: number;
  idleUntil: number;
  /** the last click, for spotting a double */
  clickT: number;
  clickX: number;
  clickY: number;
};

function Flight({
  req,
  closing,
  flip,
  reducedMotion,
  yaw,
  pitch,
  drag,
  onSettled,
}: {
  req: InspectRequest;
  closing: boolean;
  /** go home with a kickflip rather than plainly */
  flip: boolean;
  reducedMotion: boolean;
  yaw: MotionValue<number>;
  pitch: MotionValue<number>;
  drag: React.RefObject<Drag>;
  onSettled: (req: InspectRequest) => void;
}) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const group = useRef<THREE.Group>(null);
  const [dressed, setDressed] = useState<DressedDeck | null>(null);
  const progress = useMotionValue(0);

  useEffect(() => {
    let live = true;
    const anisotropy = gl.capabilities.getMaxAnisotropy();
    Promise.all([loadModel(), loadPrint(req.deck.print, anisotropy)]).then(([gltf, print]: [GLTF, THREE.Texture]) => {
      if (!live) return;
      const d = dressDeck(gltf, req.deck, print, anisotropy);
      setOpacity(d.materials, 1); // the wall already showed it: no fade
      setDressed(d);
    });
    return () => {
      live = false;
    };
  }, [gl, req.deck]);

  // out to the middle on mount…
  useEffect(() => {
    if (reducedMotion) {
      progress.set(1);
      return;
    }
    const c = animate(progress, 1, OPEN_SPRING);
    return () => c.stop();
  }, [progress, reducedMotion]);

  // …and back to the rail, face on, when closing: plainly, or with a kickflip
  useEffect(() => {
    if (!closing) return;
    const done = () => onSettled(req);
    if (reducedMotion) {
      done();
      return;
    }
    const home = Math.round(yaw.get() / TAU) * TAU; // the nearest face-on turn
    const controls = flip
      ? [
          animate(progress, 0, { duration: FLIP_S, ease: FLIP_EASE, onComplete: done }),
          animate(yaw, home + TAU, { duration: FLIP_S, ease: FLIP_EASE }),
          animate(pitch, 0, { duration: FLIP_S, ease: "easeOut" }),
        ]
      : [
          animate(progress, 0, { ...CLOSE_SPRING, onComplete: done }),
          animate(yaw, home, TURN_SPRING),
          animate(pitch, 0, TURN_SPRING),
        ];
    return () => controls.forEach((c) => c.stop());
  }, [closing, flip, reducedMotion, progress, yaw, pitch, onSettled, req]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const p = progress.get();
    const d = drag.current;
    if (!closing && d && !d.active) turnFrame(d, yaw, dt, !reducedMotion && p > 0.9);
    flyFrame(g, req, size, p, yaw.get(), pitch.get(), closing && flip ? 1 : 0);
  });

  return <group ref={group}>{dressed ? <primitive object={dressed.object} /> : null}</group>;
}

/** Where the deck is on its flight (p: 0 on the rail, 1 in the middle)
 *  and how it is turned; `pop` adds the kickflip's hop towards the viewer.
 *  three.js objects are mutable by design; kept out of the component. */
function flyFrame(
  g: THREE.Group,
  req: InspectRequest,
  size: { width: number; height: number },
  p: number,
  yaw: number,
  pitch: number,
  pop: number,
) {
  const aspect = size.width / size.height;
  const { from } = req;
  const fromX = ((from.left + from.width / 2) / size.width - 0.5) * aspect;
  const fromY = 0.5 - (from.top + from.height / 2) / size.height;
  const fromH = from.height / size.height;
  const toH = Math.min(CLOSE_UP_HEIGHT, (CLOSE_UP_MAX_WIDTH * aspect) / DECK_WIDTH);
  const hop = pop * Math.sin(Math.PI * p);
  g.position.set(fromX * (1 - p), fromY * (1 - p) + POP_Y * hop, POP_Z * hop);
  g.scale.setScalar(fromH + (toH - fromH) * p);
  g.rotation.set(pitch, yaw, 0, "YXZ");
}

/** The deck turning without a pointer on it: a flick carries on and dies
 *  away; then, left alone, it turns slowly by itself. (The drag record is
 *  mutable by design.) */
function turnFrame(d: Drag, yaw: MotionValue<number>, rawDt: number, mayIdle: boolean) {
  // a backgrounded tab resumes where it left off instead of jumping round
  const dt = Math.min(rawDt, 0.05);
  if (Math.abs(d.vx) > 0.01) {
    yaw.set(yaw.get() + d.vx * dt);
    d.vx *= Math.exp(-INERTIA_DAMPING * dt);
  } else if (mayIdle && performance.now() > d.idleUntil) {
    yaw.set(yaw.get() + IDLE_TURN * dt);
  }
}

/** The pointer letting go: a drag ends, a click is noted, a double-click
 *  is reported. (The drag record is mutable by design.) */
function release(d: Drag, x: number, y: number): "double" | null {
  d.active = false;
  const now = performance.now();
  d.idleUntil = now + IDLE_AFTER_MS;
  if (now - d.lastT > 80) d.vx = 0; // held still before letting go: no flick
  if (d.moved >= CLICK_SLOP) return null;
  if (now - d.clickT < DOUBLE_MS && Math.hypot(x - d.clickX, y - d.clickY) < DOUBLE_PX) {
    d.clickT = 0;
    return "double";
  }
  d.clickT = now;
  d.clickX = x;
  d.clickY = y;
  return null;
}

const noopSubscribe = () => () => {};

export function DeckInspect({
  request,
  onClose,
  onSettled,
  onCampaign,
  reducedMotion,
}: {
  /** the deck to show; null asks the open one to fly back */
  request: InspectRequest | null;
  onClose: () => void;
  /** that deck is back on its rail: the wall may draw it again */
  onSettled: (index: number) => void;
  onCampaign: (campaignId: string) => void;
  reducedMotion: boolean;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  // the open deck outlives its request by the flight back
  const [current, setCurrent] = useState<InspectRequest | null>(null);
  const [seen, setSeen] = useState<InspectRequest | null>(null);
  const [flip, setFlip] = useState(false);
  if (request !== seen) {
    setSeen(request);
    if (request) {
      setCurrent(request);
      setFlip(false);
    }
  }
  const closing = current !== null && request === null;

  const yaw = useMotionValue(0);
  const pitch = useMotionValue(0);
  const drag = useRef<Drag>({
    active: false,
    moved: 0,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    vx: 0,
    idleUntil: 0,
    clickT: 0,
    clickX: 0,
    clickY: 0,
  });
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!current || closing) return;
    yaw.set(0);
    pitch.set(0);
    drag.current.vx = 0;
    drag.current.clickT = 0;
    drag.current.idleUntil = performance.now() + IDLE_AFTER_MS;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // no page scrolling under the close-up — blocked at the input level
    // rather than with overflow:hidden, which would drop the scrollbar and
    // change the page width
    const block = (e: Event) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if ([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("keydown", blockKeys);
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("keydown", blockKeys);
    };
  }, [current, closing, onClose, yaw, pitch]);

  // a flight home has landed: only if nothing newer took its place meanwhile
  const settled = useCallback(
    (req: InspectRequest) => {
      onSettled(req.index);
      setCurrent((c) => (c === req ? null : c));
    },
    [onSettled],
  );

  const flipBack = () => {
    if (closing) return;
    setFlip(true);
    onClose();
  };

  // The whole layer is the drag surface; a double-click (two taps without
  // real movement) kickflips the deck home. Controls (×, the action) are
  // left alone.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (closing || (e.target as Element).closest("a,button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const d = drag.current;
    d.active = true;
    d.moved = 0;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.lastT = performance.now();
    d.vx = 0;
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT) / 1000;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.lastT = now;
    d.moved += Math.abs(dx) + Math.abs(dy);
    if (reducedMotion) return;
    yaw.set(yaw.get() + dx * DRAG_YAW);
    pitch.set(Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.get() + dy * DRAG_PITCH)));
    d.vx = (dx * DRAG_YAW) / dt;
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    if (release(drag.current, e.clientX, e.clientY) === "double") flipBack();
  };

  if (!mounted || !current) return null;

  const { deck, index } = current;
  const number = String(index + 1).padStart(2, "0");
  const fade = reducedMotion ? 0 : 0.4;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${deck.title} deck, in 3D`}
      className="fixed inset-0 z-[100] select-none [touch-action:none]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* everything behind blurs and darkens: the wall, its lamps, the other
          decks — and comes back into focus as the deck lands */}
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0 : closing ? (flip ? FLIP_S : 0.6) : fade, ease: closing ? "easeIn" : "easeOut" }}
      />

      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, CAMERA_DISTANCE], fov: FOV, near: 0.1, far: 10 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          style={{ background: "transparent", pointerEvents: "none" }}
        >
          <DeckLights />
          <Flight
            key={current.deck.id}
            req={current}
            closing={closing}
            flip={flip}
            reducedMotion={reducedMotion}
            yaw={yaw}
            pitch={pitch}
            drag={drag}
            onSettled={settled}
          />
        </Canvas>
      </div>

      {/* name and, where it has one, the deck's destination */}
      <motion.div
        className="font-sans pointer-events-none absolute top-5 left-5 text-[11px] leading-tight tracking-[0.14em] text-off-white uppercase sm:top-8 sm:left-10 sm:text-xs"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: closing ? 0 : 1, y: closing ? 8 : 0 }}
        transition={{ duration: fade, delay: closing ? 0 : 0.25, ease: "easeOut" }}
      >
        <span className="block text-off-white/60">{number}</span>
        <span className="mt-1 block text-base font-medium sm:text-lg" style={{ color: deck.accent }}>
          {deck.title}
        </span>
        {deck.destination.kind === "project" ? (
          <Link
            href={deck.destination.href}
            className="pointer-events-auto mt-3 inline-block text-[10px] tracking-[0.16em] text-off-white/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-off-white focus-visible:outline-solid sm:text-[11px]"
          >
            Explore project ↗
          </Link>
        ) : deck.destination.kind === "campaign" ? (
          <button
            type="button"
            onClick={() => onCampaign((deck.destination as { campaignId: string }).campaignId)}
            className="pointer-events-auto mt-3 inline-block cursor-pointer text-[10px] tracking-[0.16em] text-off-white/85 uppercase hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-off-white focus-visible:outline-solid sm:text-[11px]"
          >
            See campaign ↓
          </button>
        ) : null}
      </motion.div>

      <motion.p
        className="font-sans pointer-events-none absolute inset-x-0 bottom-6 text-center text-[9px] tracking-[0.16em] text-off-white/60 uppercase sm:bottom-8 sm:text-[10px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: fade, delay: closing ? 0 : 0.6 }}
      >
        Drag to turn it around · double-click to kickflip it back
      </motion.p>

      <motion.button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Put the deck back"
        className="absolute top-5 right-5 grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: fade }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </motion.button>
    </div>,
    document.body,
  );
}
