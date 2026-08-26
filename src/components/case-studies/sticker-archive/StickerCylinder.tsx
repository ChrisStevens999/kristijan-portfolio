"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";

import {
  CYLINDER_TURNS,
  STICKER_BASE_RADIUS,
  type StickerDatum,
} from "@/content/projects/sticker-archive";
import { StickerSurfaceItem } from "./StickerSurfaceItem";
import { useShouldMountSticker } from "./useShouldMountSticker";

/* Galvanized-steel look, all CSS so it stays swappable for a real texture
   later. Rounded-surface shading (bright silver central face, darker curved
   sides) + a soft sheen + spangle/grain/mottle noise + brushed streaks +
   grime. Brighter and less "chrome bar" than a UI gradient on purpose —
   industrial street-metal, not polished/digital — while staying understated
   so the stickers stay dominant. Unchanged this pass — the sticker physics
   are the priority, not texture polish. */
const SHADE =
  "linear-gradient(90deg,#1c1e21 0%,#3a3e44 6%,#6b7079 15%,#9aa0a8 26%,#c3c8cf 38%," +
  "#dfe2e6 48%,#cfd3d8 54%,#a2a8b0 66%,#6f747c 78%,#3f4348 90%,#1c1e21 100%)";
const SPEC =
  "linear-gradient(90deg,transparent 35%,rgba(255,255,255,0.16) 47%,rgba(255,255,255,0.03) 52%,transparent 62%)";
const SPANGLE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480'%3E%3Cfilter id='s'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.014' numOctaves='2' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.55' intercept='0'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23s)'/%3E%3C/svg%3E\")";
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";
const MOTTLE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='360'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.035' numOctaves='3' seed='11' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23m)'/%3E%3C/svg%3E\")";
const DIRT =
  "repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0 1px,rgba(0,0,0,0.06) 1px 3px)," +
  "linear-gradient(90deg,transparent 12%,rgba(0,0,0,0.14) 14%,transparent 17%)," +
  "linear-gradient(90deg,transparent 34%,rgba(0,0,0,0.09) 36%,transparent 39%)," +
  "linear-gradient(90deg,transparent 58%,rgba(0,0,0,0.12) 60%,transparent 64%)," +
  "linear-gradient(90deg,transparent 78%,rgba(0,0,0,0.09) 80%,transparent 83%)," +
  "linear-gradient(90deg,transparent 88%,rgba(0,0,0,0.1) 90%,transparent 93%)," +
  "linear-gradient(180deg,transparent 55%,rgba(0,0,0,0.2) 100%)";
const VIGNETTE =
  "linear-gradient(180deg,#000 0%,rgba(0,0,0,0) 17%,rgba(0,0,0,0) 83%,#000 100%)";

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

const DEG2RAD = Math.PI / 180;

/**
 * Small deterministic surface features (scratch/smudge marks, no images)
 * that ride the exact same angle→x/rotateY/opacity transform as the
 * stickers. On their own they'd be nearly invisible — their job is to sweep
 * around the pole as it turns, giving the eye something irregular to track
 * so the *cylinder itself* visibly rotates rather than reading as a static
 * backdrop with stickers orbiting in front of it.
 */
const SURFACE_MARKS = Array.from({ length: 12 }, (_, i) => ({
  angle: (i * 137.50776 + 52) % 360,
  vertical: (i * 0.618034) % 1,
  size: 22 + (i % 4) * 16,
  scratch: i % 3 === 0,
}));

function SurfaceMark({
  mark,
  progress,
  radius,
  sweep,
  band,
}: {
  mark: (typeof SURFACE_MARKS)[number];
  progress: MotionValue<number>;
  radius: number;
  sweep: number;
  band: number;
}) {
  const baseAngle = mark.angle * DEG2RAD;
  const angle = useTransform(progress, (p) => baseAngle + p * sweep);
  const depth = useTransform(angle, (a) => Math.cos(a));
  const x = useTransform(angle, (a) => radius * Math.sin(a));
  const opacity = useTransform(depth, (d) => Math.max(0, d) * (mark.scratch ? 0.24 : 0.15));
  const y = (mark.vertical - 0.5) * band;
  const h = mark.scratch ? 2 : mark.size * 0.6;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
      style={{
        x,
        y,
        opacity,
        width: mark.size,
        height: h,
        marginLeft: -mark.size / 2,
        marginTop: -h / 2,
        background: mark.scratch
          ? "rgba(0,0,0,0.55)"
          : "radial-gradient(circle, rgba(0,0,0,0.42), transparent 70%)",
      }}
    />
  );
}

/** Gates a sticker's whole slice set behind useShouldMountSticker — see that hook for why. */
function MountedSticker({
  data,
  index,
  progress,
  radius,
  band,
  verticalDrift,
  sweep,
  sizeScale,
  onSelect,
}: {
  data: StickerDatum;
  index: number;
  progress: MotionValue<number>;
  radius: number;
  band: number;
  verticalDrift: number;
  sweep: number;
  sizeScale: number;
  onSelect: (index: number) => void;
}) {
  const shouldMount = useShouldMountSticker(progress, data.appliedAt);
  if (!shouldMount) return null;

  return (
    <StickerSurfaceItem
      data={data}
      progress={progress}
      radius={radius}
      band={band}
      verticalDrift={verticalDrift}
      sweep={sweep}
      sizeScale={sizeScale}
      onSelect={() => onSelect(index)}
    />
  );
}

export function StickerCylinder({
  stickers,
  progress,
  onSelect,
}: {
  stickers: StickerDatum[];
  progress: MotionValue<number>;
  onSelect: (index: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ width: 1280, height: 800 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = stage.width < 640;

  // ~37vw on desktop (a large, close physical object), wider on phones, capped for ultrawide.
  const cylinderWidth = clamp(340, stage.width * (isMobile ? 0.8 : 0.37), 860);
  const radius = cylinderWidth / 2;
  const sizeScale = radius / STICKER_BASE_RADIUS;
  const band = stage.height * 1.3;
  // Subtle global vertical progression only — rotation stays the dominant
  // motion, attached stickers keep their exact relative surface coordinate
  // (this is a shared offset every sticker rides identically, not
  // independent per-sticker drift).
  const verticalDrift = stage.height * 0.18;
  const sweep = CYLINDER_TURNS * Math.PI * 2;

  // Mobile: thin the set to every other sticker so fewer are on screen at
  // once. Keep each sticker's original index so the viewer numbers/
  // navigates the full collection even when mobile shows a thinned subset.
  const shown = stickers
    .map((data, index) => ({ data, index }))
    .filter((_, i) => !isMobile || i % 2 === 0);

  const layer = "pointer-events-none absolute inset-0";

  return (
    <div ref={stageRef} className="absolute inset-0 overflow-hidden">
      {/* The galvanized pole — taller than the viewport so it bleeds past the
          top and bottom edges and feels physically massive. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: cylinderWidth, height: "162vh" }}
      >
        <div className={layer} style={{ background: SHADE }} />
        <div className={layer} style={{ backgroundImage: MOTTLE, backgroundSize: "340px 340px", mixBlendMode: "multiply", opacity: 0.22 }} />
        <div className={layer} style={{ backgroundImage: SPANGLE, backgroundSize: "460px 460px", mixBlendMode: "soft-light", opacity: 0.45 }} />
        <div className={layer} style={{ backgroundImage: GRAIN, backgroundSize: "180px 180px", mixBlendMode: "overlay", opacity: 0.14 }} />
        <div className={layer} style={{ background: DIRT }} />
        <div className={layer} style={{ background: SPEC, mixBlendMode: "screen", opacity: 0.6 }} />
        <div className={layer} style={{ background: VIGNETTE }} />
        <div className="absolute inset-x-0 h-0.5" style={{ top: "20%", background: "linear-gradient(180deg,rgba(255,255,255,0.16),rgba(0,0,0,0.42))" }} />
        <div className="absolute inset-x-0 h-0.5" style={{ top: "78%", background: "linear-gradient(180deg,rgba(255,255,255,0.09),rgba(0,0,0,0.5))" }} />
        <div className="absolute inset-x-0" style={{ top: "46.5%", height: 3, background: "linear-gradient(180deg,rgba(0,0,0,0.32) 0%,rgba(0,0,0,0.12) 35%,rgba(255,255,255,0.1) 60%,rgba(0,0,0,0.22) 100%)" }} />

        {!isMobile
          ? SURFACE_MARKS.map((mark, i) => (
              <SurfaceMark key={i} mark={mark} progress={progress} radius={radius} sweep={sweep} band={band} />
            ))
          : null}
      </div>

      {/* Sticker surface, clipped to the pole silhouette so stickers wrap off
          the visible edge — behind the physical cylinder, not fading in open
          space — rather than floating past it. */}
      <div
        className="absolute left-1/2 top-0 h-full -translate-x-1/2 overflow-hidden"
        style={{ width: cylinderWidth }}
      >
        <div className="absolute inset-0">
          {shown.map(({ data, index }) => (
            <MountedSticker
              key={data.alt + index}
              data={data}
              index={index}
              progress={progress}
              radius={radius}
              band={band}
              verticalDrift={verticalDrift}
              sweep={sweep}
              sizeScale={sizeScale}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
