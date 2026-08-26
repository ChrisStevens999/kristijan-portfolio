"use client";

import { useEffect, useRef, useState } from "react";
import { useSpring, type MotionValue } from "framer-motion";

import type { StickerDatum } from "@/content/projects/sticker-archive";
import { INTERACT_ABOVE, OCCLUSION_EDGE } from "./cylinderConstants";
import { useStickerApply } from "./useStickerApply";
import { StickerSlice } from "./StickerSlice";

const DEG2RAD = Math.PI / 180;

function wrap(v: number, m: number) {
  return (((v + m / 2) % m) + m) % m - m / 2;
}

/**
 * Every sticker on the pole: the permanent-cylinder-anchor +
 * approach/contact/settle application behaviour, rendered as `data.segments`
 * independently-curving slices (6/10/14 by size tier) instead of one flat
 * plane, so it visibly bends around the pole instead of reading as a bent
 * card.
 *
 * Geometry is computed IMPERATIVELY, not via a `useTransform` chain per
 * slice: with up to 25 stickers × 6–14 slices mounted at once (150–250
 * elements), a dozen chained `useTransform`s each was a measured
 * multi-second scroll-response cliff — Framer's reactive graph overhead
 * scales with node count, and this page needs more repeated nodes than that
 * graph is built for. Instead, ONE set of subscriptions per sticker
 * (angle/blend/reveal/scaleMul/hover/yAttached) drives a single plain-JS
 * update function that writes every one of its slices' transform/opacity
 * directly via refs. Same math, same result, a small fraction of the
 * per-frame cost.
 */
export function StickerSurfaceItem({
  data,
  progress,
  radius,
  band,
  verticalDrift,
  sweep,
  sizeScale,
  onSelect,
}: {
  data: StickerDatum;
  progress: MotionValue<number>;
  radius: number;
  band: number;
  verticalDrift: number;
  /** Total rotation in radians across the full 0–1 scroll range (CYLINDER_TURNS · 2π). */
  sweep: number;
  sizeScale: number;
  onSelect?: () => void;
}) {
  const baseAngle = data.angle * DEG2RAD;
  const yBase = (data.vertical - 0.5) * band;

  const [, setHovered] = useState(false);
  const hover = useSpring(0, { stiffness: 300, damping: 28 });

  const { reveal, blend, scaleMul, settled, impact } = useStickerApply(progress, data.appliedAt);

  const width = data.size * sizeScale;
  const height = width * (data.src.height / data.src.width);
  const angularWidth = width / radius; // small-angle approximation, accurate enough at typical sticker/radius ratios
  const segments = data.segments;
  const sliceWidth = width / segments;
  const entryDx = data.entryDx * sizeScale;
  const entryDy = data.entryDy * sizeScale;

  const outerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hitRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function update() {
      const a = baseAngle + progress.get() * sweep;
      const b = blend.get();
      const r = reveal.get();
      const s = scaleMul.get();
      const h = hover.get();
      const imp = impact.get();
      const yAttached = wrap(yBase - progress.get() * verticalDrift, band);
      const doneSettling = settled.get() >= 1;
      // Brief shared rotation kick at the exact instant of contact — a rigid,
      // whole-sticker jolt (not per-slice) is enough to sell "slapped down"
      // and is cheap: one extra value reused by every slice's transform.
      const kickDeg = imp * 3.2;

      for (let i = 0; i < segments; i++) {
        const offset = ((i - (segments - 1) / 2) / segments) * angularWidth;
        const sliceAngle = a + offset;
        const depth = Math.cos(sliceAngle);
        const alpha = Math.atan2(Math.sin(sliceAngle), Math.cos(sliceAngle));
        const x = radius * Math.sin(sliceAngle);
        const rotateY = ((alpha * 180) / Math.PI) * b;

        const occlusion =
          depth >= OCCLUSION_EDGE ? 1 : depth <= -OCCLUSION_EDGE ? 0 : (depth + OCCLUSION_EDGE) / (2 * OCCLUSION_EDGE);
        const opacity = r * ((1 - b) * 1 + b * occlusion);
        const zIndex = b < 0.999 ? 900 : Math.round(100 + depth * 100 + h * 400);
        const vShade = (1 - b) * 1 + b * Math.max(0, depth);
        // Deeper edge falloff than before (0.58 -> 0.66) plus a real
        // curved-surface light model on the inner element (brightness lift
        // toward dead-front, not just multiply-darkening at the sides) —
        // together they sell a rounded, physically-curving surface instead
        // of a flat card with a vignette.
        const shadeOpacity = Math.max(0, Math.min(0.66, (1 - vShade) * 0.66));
        const brightness = 0.86 + Math.max(0, depth) * 0.24 + imp * 0.16;
        const scale = (0.94 + 0.06 * depth) * s;
        const finalX = x + entryDx * (1 - b);
        const finalY = yAttached + entryDy * (1 - b);

        const outer = outerRefs.current[i];
        if (outer) {
          outer.style.transform = `translate(${finalX}px, ${finalY}px)`;
          outer.style.opacity = String(opacity);
          outer.style.zIndex = String(zIndex);
        }
        const inner = innerRefs.current[i];
        if (inner) {
          inner.style.transform = `perspective(1000px) rotateZ(${kickDeg}deg) rotateY(${rotateY}deg) scale(${scale})`;
          inner.style.filter = `brightness(${brightness})`;
        }
        const shade = shadeRefs.current[i];
        if (shade) shade.style.opacity = String(shadeOpacity);
      }

      const centerDepth = Math.cos(a);
      const centerOcclusion =
        centerDepth >= OCCLUSION_EDGE
          ? 1
          : centerDepth <= -OCCLUSION_EDGE
            ? 0
            : (centerDepth + OCCLUSION_EDGE) / (2 * OCCLUSION_EDGE);
      const hitX = radius * Math.sin(a) + entryDx * (1 - b);
      const hitY = yAttached + entryDy * (1 - b);

      const hit = hitRef.current;
      if (hit) {
        const hitZ = b < 0.999 ? 900 : Math.round(100 + centerDepth * 100 + h * 400);
        hit.style.transform = `translate(${hitX}px, ${hitY}px)`;
        hit.style.zIndex = String(hitZ);
        hit.style.pointerEvents = centerDepth > INTERACT_ABOVE && doneSettling ? "auto" : "none";
      }

      // Contact shadow — a soft blurred blob sitting just below the sticker,
      // between it and the metal, so it reads as physically resting ON the
      // curved surface instead of a flat decal floating above it. Fades in
      // with blend/occlusion (never visible mid-flight), and gets a brief
      // brighter/wider pulse from `impact` right at the moment of contact.
      const shadow = shadowRef.current;
      if (shadow) {
        const shadowOpacity = r * b * centerOcclusion * (0.32 + imp * 0.3);
        const shadowScale = 1 + imp * 0.18;
        shadow.style.transform = `translate(${hitX + 5}px, ${hitY + height * 0.4}px) scale(${shadowScale})`;
        shadow.style.opacity = String(shadowOpacity);
        shadow.style.zIndex = String(Math.max(0, (b < 0.999 ? 900 : Math.round(100 + centerDepth * 100)) - 2));
      }
    }

    update();
    const unsubs = [
      progress.on("change", update),
      blend.on("change", update),
      reveal.on("change", update),
      scaleMul.on("change", update),
      hover.on("change", update),
      settled.on("change", update),
      impact.on("change", update),
    ];
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- motion values are stable refs; geometry inputs (radius/angularWidth/etc.) come from props that only change on resize, handled by the effect re-running on those deps below
  }, [progress, blend, reveal, scaleMul, hover, settled, impact, baseAngle, sweep, radius, angularWidth, segments, entryDx, entryDy, yBase, verticalDrift, band, height]);

  return (
    <>
      {/* Contact shadow — single blurred blob per sticker (not per slice),
          negligible cost. Static blur/shape via className; only opacity,
          position and scale are touched per frame. */}
      <div
        ref={shadowRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full bg-black blur-md"
        style={{ width: width * 0.86, height: height * 0.28, marginLeft: -(width * 0.86) / 2, marginTop: -(height * 0.28) / 2 }}
      />

      {Array.from({ length: segments }, (_, i) => (
        <StickerSlice
          key={i}
          ref={(el) => {
            outerRefs.current[i] = el;
          }}
          innerRef={(el) => {
            innerRefs.current[i] = el;
          }}
          shadeRef={(el) => {
            shadeRefs.current[i] = el;
          }}
          sliceIndex={i}
          segments={segments}
          sliceWidth={sliceWidth}
          height={height}
          src={data.src.src}
        />
      ))}

      {/* Invisible hit-area for hover/click, positioned at the sticker's own
          centre point — curvature-agnostic, which is fine for a hover target
          this size. */}
      <div
        ref={hitRef}
        className="absolute left-1/2 top-1/2 cursor-pointer"
        style={{ width, height, marginLeft: -width / 2, marginTop: -height / 2 }}
        onPointerEnter={() => {
          setHovered(true);
          hover.set(1);
        }}
        onPointerLeave={() => {
          setHovered(false);
          hover.set(0);
        }}
        onClick={onSelect}
        role="button"
        tabIndex={-1}
        aria-label={`View ${data.alt}`}
      />
    </>
  );
}
