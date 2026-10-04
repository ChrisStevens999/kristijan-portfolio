"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { APPAREL_HERO_SRC } from "./apparelHeroLayers";

/**
 * Animated Apparel cover (E:\GENERATIONAL LOCK IN\Apperal\WF\Cover 2), split
 * into three layers on the 3840x2160 artboard:
 *
 *   bg.jpg     — red-lit rubble (Cover 1-3)
 *   text.webp  — APPAREL, cut with the PSD's "apparel" layer mask; the parts
 *                hidden behind the angel are filled so the layers can drift
 *   angel.webp — the statue, cut with the PSD's "SC" layer mask
 *
 * Intro: the rubble surfaces out of black, the letters punch up one by one
 * out of their own baseline, then the angel rises through them. Idle: she
 * hovers, the light behind her breathes, red embers drift up, the letters
 * glitch now and then, and the three layers part with the pointer (depth
 * parallax) and with scroll.
 *
 * Kept cheap on purpose: everything that moves is a transform or an opacity
 * (no animated blurs, no blend modes, no per-frame filters), so it stays
 * smooth on modest GPUs.
 */
const W = 3840;
const H = 2160;
const TEXT = { l: 428, t: 223, w: 2984, h: 804 };
const ANGEL = { l: 1400, t: 367, w: 1047, h: 1793 };
/** letter boundaries inside text.webp (midpoints of the gaps) */
const LETTER_CUTS = [0, 454, 899, 1327, 1791, 2239, 2629, 2984];
const SRC = APPAREL_HERO_SRC;

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const EXPO = [0.16, 1, 0.3, 1] as const;

/** Embers: small red flecks drifting up through the scene, on a canvas. */
function Embers({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0;
    let h = 0;
    // one soft red dot, drawn once — stamping it is far cheaper than a
    // shadowBlur per particle per frame
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const sctx = sprite.getContext("2d")!;
    const glow = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, "rgba(255,90,70,1)");
    glow.addColorStop(0.25, "rgba(255,40,40,0.55)");
    glow.addColorStop(1, "rgba(255,26,26,0)");
    sctx.fillStyle = glow;
    sctx.fillRect(0, 0, 32, 32);
    const resize = () => {
      // embers are soft: 1.5x is plenty, and keeps the canvas small on 4K
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "lighter"; // reset by the resize above
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    type P = { x: number; y: number; r: number; vy: number; vx: number; a: number; life: number; t: number };
    const spawn = (anywhere: boolean): P => ({
      x: Math.random(),
      y: anywhere ? Math.random() : 1.05,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.02 + Math.random() * 0.05,
      vx: (Math.random() - 0.5) * 0.015,
      a: 0.25 + Math.random() * 0.55,
      life: 6 + Math.random() * 8,
      t: 0,
    });
    const parts = Array.from({ length: 70 }, () => spawn(true));
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.t += dt;
        p.y -= p.vy * dt;
        p.x += p.vx * dt + Math.sin((p.t + i) * 1.3) * 0.0004;
        if (p.t > p.life || p.y < -0.05) {
          parts[i] = spawn(false);
          continue;
        }
        const fade = Math.min(1, p.t / 1.2, (p.life - p.t) / 1.5);
        ctx.globalAlpha = p.a * fade;
        const d = p.r * 9;
        ctx.drawImage(sprite, p.x * w - d / 2, p.y * h - d / 2, d, d);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

/** One letter of APPAREL: a window onto text.webp, punched up from its baseline. */
function Letter({ i, reduced }: { i: number; reduced: boolean }) {
  const x0 = LETTER_CUTS[i];
  const x1 = LETTER_CUTS[i + 1];
  const style = {
    backgroundImage: `url(${SRC}text.webp)`,
    backgroundSize: `${(TEXT.w / (x1 - x0)) * 100}% 100%`,
    backgroundPosition: `${(x0 / (TEXT.w - (x1 - x0))) * 100}% 0`,
  };
  return (
    <div className="absolute top-0 h-full overflow-hidden" style={{ left: pct(x0, TEXT.w), width: pct(x1 - x0, TEXT.w) }}>
      <motion.div
        className="absolute inset-0"
        style={style}
        // transform only (no animated blur): stays on the compositor
        initial={reduced ? false : { y: "105%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.1, ease: EXPO, delay: 0.55 + i * 0.07 }}
      />
    </div>
  );
}

/**
 * Glitch: every few seconds, red and cyan copies of the word flash a hair
 * to either side for a beat. They sit BEHIND the letters, so only the
 * offset fringes show. Flat colour through the lettering as a mask — no
 * filters or blend modes — always mounted and toggled by opacity, and with
 * its own state so a flash never re-renders the rest of the scene.
 */
function GlitchGhosts({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let off: ReturnType<typeof setTimeout>;
    let next: ReturnType<typeof setTimeout>;
    const schedule = (wait: number) => {
      next = setTimeout(() => {
        setOn(true);
        off = setTimeout(() => setOn(false), 140);
        schedule(4500 + Math.random() * 4000);
      }, wait);
    };
    schedule(3200); // after the intro has landed
    return () => {
      clearTimeout(off);
      clearTimeout(next);
    };
  }, [enabled]);
  const mask = {
    maskImage: `url(${SRC}text.webp)`,
    WebkitMaskImage: `url(${SRC}text.webp)`,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
  };
  return (
    <>
      <div className="absolute inset-0" style={{ ...mask, background: "#ff2436", transform: "translateX(-0.6%)", opacity: on ? 0.9 : 0 }} />
      <div className="absolute inset-0" style={{ ...mask, background: "#19e6ff", transform: "translateX(0.6%)", opacity: on ? 0.75 : 0 }} />
    </>
  );
}

function useParallax(mx: MotionValue<number>, my: MotionValue<number>, depth: number) {
  const x = useTransform(mx, (v) => `${v * depth}%`);
  const y = useTransform(my, (v) => `${v * depth}%`);
  return { x, y };
}

/**
 * `fit="banner"`: a 16:9 block at the top of a page, with scroll effects.
 * `fit="screen"`: fills a fixed full-screen overlay (the category intro) —
 * covers landscape screens, letterboxes portrait ones so APPAREL stays whole.
 */
export function ApparelHero({ fit = "banner" }: { fit?: "banner" | "screen" }) {
  const screen = fit === "screen";
  const reduced = Boolean(useReducedMotion());
  const sectionRef = useRef<HTMLElement>(null);

  // pointer → -1..1, springy
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const mx = useSpring(px, { stiffness: 40, damping: 18 });
  const my = useSpring(py, { stiffness: 40, damping: 18 });
  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth) * 2 - 1);
      py.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [px, py, reduced]);

  const bgP = useParallax(mx, my, -0.6);
  const textP = useParallax(mx, my, -1.2);
  const angelP = useParallax(mx, my, 1.4);

  // scroll: the angel lifts away faster than the letters, the scene dims
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const still = reduced || screen;
  const angelLift = useTransform(scrollYProgress, [0, 1], ["0%", still ? "0%" : "-14%"]);
  const textLift = useTransform(scrollYProgress, [0, 1], ["0%", still ? "0%" : "-6%"]);
  const textScale = useTransform(scrollYProgress, [0, 1], [1, still ? 1 : 1.06]);
  const dim = useTransform(scrollYProgress, [0, 1], [0, screen ? 0 : 0.6]);

  return (
    <section
      ref={sectionRef}
      className={screen ? "absolute inset-0 overflow-hidden bg-[#000]" : "relative w-full overflow-hidden bg-[#000]"}
      style={screen ? undefined : { aspectRatio: `${W} / ${H}`, maxHeight: "100svh" }}
    >
      {!screen && <h1 className="sr-only">Apparel</h1>}
      {/* the artboard keeps 16:9 and fills the width; on very tall-short
          screens it is capped to the viewport and centred */}
      <div
        className={
          screen
            ? "absolute left-1/2 top-1/2 w-[max(100vw,177.78svh)] -translate-x-1/2 -translate-y-1/2 portrait:w-[100vw]"
            : "absolute left-1/2 top-0 h-full -translate-x-1/2"
        }
        style={{ aspectRatio: `${W} / ${H}` }}
        aria-hidden
      >
        {/* background — surfaces out of black with a slow push-in */}
        <motion.div className="absolute -inset-[2%]" style={bgP}>
          <motion.img
            src={`${SRC}bg.jpg`}
            alt=""
            className="h-full w-full object-cover"
            initial={reduced ? false : { opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.4, ease: EXPO }}
            draggable={false}
          />
        </motion.div>

        {/* breathing red light behind the angel */}
        <motion.div
          className="absolute"
          style={{
            left: "32%",
            top: "8%",
            width: "36%",
            height: "74%",
            // already soft — no blur filter or blend mode needed
            background:
              "radial-gradient(closest-side, rgba(200,24,40,0.36), rgba(200,24,40,0.14) 55%, rgba(200,24,40,0) 100%)",
          }}
          initial={reduced ? false : { opacity: 0 }}
          animate={reduced ? { opacity: 0.6 } : { opacity: [0.35, 0.8, 0.35] }}
          transition={reduced ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
        />

        {/* APPAREL */}
        <motion.div
          className="absolute"
          style={{
            left: pct(TEXT.l, W),
            top: pct(TEXT.t, H),
            width: pct(TEXT.w, W),
            height: pct(TEXT.h, H),
            x: textP.x,
            y: textLift,
            scale: textScale,
          }}
        >
          <motion.div className="absolute inset-0" style={{ y: textP.y }}>
            <GlitchGhosts enabled={!reduced} />
            {LETTER_CUTS.slice(0, -1).map((_, i) => (
              <Letter key={i} i={i} reduced={reduced} />
            ))}
          </motion.div>
        </motion.div>

        {/* the angel — rises through the letters, then hovers */}
        <motion.div
          className="absolute"
          style={{
            left: pct(ANGEL.l, W),
            top: pct(ANGEL.t, H),
            width: pct(ANGEL.w, W),
            height: pct(ANGEL.h, H),
            x: angelP.x,
            y: angelLift,
          }}
        >
          <motion.div className="h-full w-full" style={{ y: angelP.y }}>
            {/* rise (once) … */}
            <motion.div
              className="h-full w-full"
              initial={reduced ? false : { opacity: 0, y: "18%", scale: 1.04, filter: "brightness(2.2)" }}
              animate={{ opacity: 1, y: "0%", scale: 1, filter: "brightness(1)" }}
              transition={{
                opacity: { duration: 1.2, delay: 1.0 },
                y: { duration: 1.9, ease: EXPO, delay: 1.0 },
                scale: { duration: 1.9, ease: EXPO, delay: 1.0 },
                filter: { duration: 1.6, ease: "easeOut", delay: 1.0 },
              }}
            >
              {/* … then hover, forever */}
              <motion.img
                src={`${SRC}angel.webp`}
                alt=""
                className="h-full w-full select-none"
                draggable={false}
                animate={reduced ? undefined : { y: ["0%", "-1.2%", "0%"] }}
                transition={{ duration: 6, ease: "easeInOut", repeat: Infinity, delay: 2.9 }}
              />
            </motion.div>
          </motion.div>
        </motion.div>

        <Embers active={!reduced} />

        {/* film grain + vignette, and the dim that deepens on scroll */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.65)_100%)]" />
        <motion.div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dim }} />
      </div>
    </section>
  );
}
