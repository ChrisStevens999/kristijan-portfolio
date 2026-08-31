"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { StickerPlacement } from "@/content/projects/sticker-archive";
import { optimizedImageUrl } from "@/lib/optimizedImageUrl";
import { getAlphaBBox } from "./alphaBBox";

/**
 * Long-edge px requested from the optimizer for each source sticker photo.
 * The atlas canvas itself is only ATLAS_WIDTH (2048px) wide and even the
 * largest single sticker occupies well under half that — 1080 leaves
 * several times the final on-atlas resolution as headroom (retina/DPR
 * included) while cutting each fetch from multi-megabyte camera originals
 * down to a small fraction of that. Must be one of Next's allowed
 * imageSizes/deviceSizes — see optimizedImageUrl's doc comment.
 */
const STICKER_SOURCE_WIDTH = 1080;

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
    // Leave flipY at its default (true) — every sticker's artwork needs to
    // stay upright. The consequence (mesh v=0 samples canvas row
    // atlasHeight-1, i.e. the BOTTOM of what we draw, not the top) is
    // accounted for in INITIAL_Y_OFFSET/VERTICAL_TRAVEL_WORLD's sign
    // instead — see that constant's doc comment in the content file.
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- atlasWidth/atlasHeight are stable module-level constants
  }, []);

  useEffect(() => {
    let cancelled = false;
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;

    Promise.allSettled(
      placements.map(
        (p) =>
          new Promise<{ p: StickerPlacement; img: HTMLImageElement }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ p, img });
            img.onerror = reject;
            img.src = optimizedImageUrl(p.src.src, STICKER_SOURCE_WIDTH);
          }),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        // allSettled (not all) — one bad/slow sticker image shouldn't blank
        // the whole atlas; it just leaves that one spot empty.
        const loaded = results
          .filter((r): r is PromiseFulfilledResult<{ p: StickerPlacement; img: HTMLImageElement }> => r.status === "fulfilled")
          .map((r) => r.value);
        for (const { p, img } of loaded) {
          // Size/centre against the artwork's ALPHA BOUNDING BOX, not the
          // padded PNG canvas — some source PNGs have far more transparent
          // margin than others, which used to make otherwise-equal-sized
          // stickers read as noticeably different scales. widthFrac is
          // "how wide the visible artwork should be"; here we find how big
          // the visible artwork actually is inside this specific PNG, then
          // scale/offset the WHOLE image so that bbox — not the canvas —
          // lands at the target size and position. The image itself is
          // still drawn in full (so nothing outside the bbox is clipped);
          // only the centring math changes.
          const bbox = getAlphaBBox(img);
          const targetBboxWidthPx = p.widthFrac * atlasWidth;
          const scale = targetBboxWidthPx / bbox.w;
          const drawnW = img.naturalWidth * scale;
          const drawnH = img.naturalHeight * scale;
          const bboxCenterX = bbox.x + bbox.w / 2;
          const bboxCenterY = bbox.y + bbox.h / 2;
          const bboxOffsetX = (bboxCenterX - img.naturalWidth / 2) * scale;
          const bboxOffsetY = (bboxCenterY - img.naturalHeight / 2) * scale;

          const cx = p.u * atlasWidth;
          const cy = p.v * atlasHeight;

          const draw = (offsetX: number) => {
            ctx.save();
            ctx.translate(cx + offsetX, cy);
            ctx.rotate((p.rotationDeg * Math.PI) / 180);
            ctx.translate(-bboxOffsetX, -bboxOffsetY);
            ctx.drawImage(img, -drawnW / 2, -drawnH / 2, drawnW, drawnH);
            ctx.restore();
          };

          draw(0);
          // Safety net for stickers whose visible bbox crosses the u=0/1
          // circumference seam — draw the wrapped copy too so nothing clips.
          const bboxLeft = cx - targetBboxWidthPx / 2;
          const bboxRight = cx + targetBboxWidthPx / 2;
          if (bboxLeft < 0) draw(atlasWidth);
          if (bboxRight > atlasWidth) draw(-atlasWidth);
        }
        texture.needsUpdate = true;
      });

    return () => {
      cancelled = true;
    };
  }, [texture, placements, atlasWidth, atlasHeight]);

  return texture;
}
