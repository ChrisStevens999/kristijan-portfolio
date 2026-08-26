"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { StickerPlacement } from "@/content/projects/sticker-archive";

/**
 * Builds the ONE transparent canvas texture that carries every sticker's
 * actual PNG artwork, drawn at its fixed (u, v) position/size/rotation.
 * This atlas is wrapped around the sticker cylinder in StickerScene — the
 * curvature/foreshortening/back-face disappearance all fall out of real
 * geometry + UV mapping, nothing is faked per-sticker.
 *
 * Deterministic: same placements in, same canvas out, every load. The
 * texture object itself is created synchronously via useMemo (never null —
 * starts as a blank/transparent canvas); an effect fills it in once the
 * source PNGs finish loading, mutating that same texture rather than
 * swapping state, so there's no render-triggering setState in the effect.
 */
export function useStickerAtlasTexture(
  placements: StickerPlacement[],
  atlasWidth: number,
  atlasHeight: number,
) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = atlasWidth;
    canvas.height = atlasHeight;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- atlasWidth/atlasHeight are stable module-level constants
  }, []);

  useEffect(() => {
    let cancelled = false;
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;

    Promise.all(
      placements.map(
        (p) =>
          new Promise<{ p: StickerPlacement; img: HTMLImageElement }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ p, img });
            img.onerror = reject;
            img.src = p.src.src;
          }),
      ),
    )
      .then((loaded) => {
        if (cancelled) return;
        for (const { p, img } of loaded) {
          const w = p.widthFrac * atlasWidth;
          const h = w * (p.src.height / p.src.width);
          const cx = p.u * atlasWidth;
          const cy = p.v * atlasHeight;

          const draw = (offsetX: number) => {
            ctx.save();
            ctx.translate(cx + offsetX, cy);
            ctx.rotate((p.rotationDeg * Math.PI) / 180);
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
          };

          draw(0);
          // Safety net for stickers whose bounding box crosses the u=0/1
          // circumference seam — draw the wrapped copy too so nothing clips.
          if (cx - w / 2 < 0) draw(atlasWidth);
          if (cx + w / 2 > atlasWidth) draw(-atlasWidth);
        }
        texture.needsUpdate = true;
      })
      .catch(() => {
        // A failed sticker image just leaves that spot blank on the atlas —
        // not worth tearing down the whole surface for.
      });

    return () => {
      cancelled = true;
    };
  }, [texture, placements, atlasWidth, atlasHeight]);

  return texture;
}
