"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

import type { StaticImageData } from "next/image";

import { getAlphaBBox } from "./alphaBBox";

/**
 * How much blank canvas margin surrounds the artwork's alpha bounding box,
 * as a multiple of the bbox's own size — needs to be generous enough that
 * the small rotationDeg jitter (all ≤ ~11° in MANUAL_LAYOUT) never clips a
 * corner once the whole image is rotated. Exported so SlapSticker can size
 * its geometry patch with the exact same padding baked into the canvas —
 * texture and geometry must agree on this or the artwork would appear
 * inset/cropped relative to its patch.
 */
export const SLAP_TEXTURE_PAD = 1.5;

const MAX_CANVAS_DIM = 512;

/**
 * Builds ONE isolated, correctly-rotated canvas texture for a single
 * sticker — the individually-rendered counterpart to useStickerAtlasTexture,
 * used only for the small number of stickers getting the slap-on animation
 * (see SlapSticker.tsx). Same alpha-bbox sizing/centring logic as the atlas
 * builder (so a slap sticker and an atlas-baked sticker of the same
 * `widthFrac` read as the exact same physical size), just against a
 * dedicated small canvas instead of a shared position in one big atlas —
 * there's no (u, v) offset to place, and no seam-wraparound safety net
 * needed, since this image is never wrapped around a circumference itself.
 *
 * Returns null until the source image has loaded and been processed.
 */
export function useSingleStickerTexture(
  src: StaticImageData,
  rotationDeg: number,
): { texture: THREE.CanvasTexture; aspect: number } | null {
  const [result, setResult] = useState<{ texture: THREE.CanvasTexture; aspect: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;

      const bbox = getAlphaBBox(img);
      const scale = MAX_CANVAS_DIM / (Math.max(bbox.w, bbox.h) * SLAP_TEXTURE_PAD);
      const canvasW = Math.max(1, Math.round(bbox.w * SLAP_TEXTURE_PAD * scale));
      const canvasH = Math.max(1, Math.round(bbox.h * SLAP_TEXTURE_PAD * scale));
      const drawnW = img.naturalWidth * scale;
      const drawnH = img.naturalHeight * scale;
      const bboxCenterX = bbox.x + bbox.w / 2;
      const bboxCenterY = bbox.y + bbox.h / 2;
      const bboxOffsetX = (bboxCenterX - img.naturalWidth / 2) * scale;
      const bboxOffsetY = (bboxCenterY - img.naturalHeight / 2) * scale;

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d")!;
      ctx.save();
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.translate(-bboxOffsetX, -bboxOffsetY);
      ctx.drawImage(img, -drawnW / 2, -drawnH / 2, drawnW, drawnH);
      ctx.restore();

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      setResult({ texture, aspect: bbox.h / bbox.w });
    };
    img.src = src.src;

    return () => {
      cancelled = true;
    };
  }, [src, rotationDeg]);

  return result;
}
