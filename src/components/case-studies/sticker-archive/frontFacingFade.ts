import type * as THREE from "three";

/**
 * Per-fragment brightness/alpha falloff applied to sticker materials only
 * (never the metal — that keeps its own real-lighting falloff untouched).
 * Full strength within ±30° of dead-front (task D's own ±35° "readable"
 * threshold, with a small margin), dropping to ~15% by ±52° and to ~0 by
 * ±58° — deliberately NOT a hard cut at the geometric ±90° backface limit.
 * Tightened once already from an initial ±40°/±75° pair that, verified via
 * screenshot, left a 50°+ off-centre sticker still ~50% bright — nowhere
 * near dim enough to stop reading as a competing "main" sticker.
 *
 * WHY THIS EXISTS: three independent placement-only passes established that
 * pure spacing/angle math cannot deliver "~3 substantial stickers visible
 * at once" on its own. With a real orthographic camera, foreshortening
 * alone doesn't meaningfully shrink a sticker's apparent size until it's
 * quite close to the true ±90° edge. With 25 stickers each needing an
 * individual front-facing moment inside a fixed 340° rotation, that wide a
 * "still looks substantial" zone makes several of them visible at full
 * prominence simultaneously no matter how carefully they're spaced. This
 * directly targets the actual cause (apparent prominence, not just
 * geometric size) instead of continuing to fight it with placement alone.
 *
 * NOTE the falloff is per-FRAGMENT, not per-sticker: a sticker whose centre
 * sits at, say, 50° off-front spans real angular width itself (up to ~±25–
 * 30° around that centre for the biggest ones), so its near edge can still
 * be reasonably bright while its far edge fades hard — verified visually
 * with a deliberately extreme threshold before settling on this one. That
 * reads as the sticker receding into the curve, not a bug — but it does
 * mean the thresholds need to be tighter than "where a single dead-centre
 * point would be dim" to actually pull a whole off-centre sticker down.
 *
 * Used as the `onBeforeCompile` prop directly on a plain <meshBasicMaterial>
 * (kept unlit, per the existing "stickers don't take the metal's
 * directional lighting" decision) rather than a bespoke ShaderMaterial, so
 * alphaTest, transparency, colour-space output etc. all keep using
 * three.js's own built-in chunks — only two chunks gain one extra line.
 */
export function frontFacingFadeOnBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying float vFacingFade;")
    .replace(
      // NOTE: <beginnormal_vertex> (which defines `objectNormal`) is only
      // included by MeshBasicMaterial's shader when USE_ENVMAP or
      // USE_SKINNING is defined — neither is true here, so that chunk is
      // silently ABSENT and a replace targeting it is a no-op, leaving
      // vFacingFade uninitialized (reads as ~0 → the whole sticker layer
      // renders near-black). <begin_vertex> has no such condition and the
      // raw `normal` attribute is always available regardless, so use that
      // directly instead of relying on the (sometimes-missing) chunk output.
      "#include <begin_vertex>",
      "#include <begin_vertex>\n  vFacingFade = smoothstep(0.53, 0.866, normalize(mat3(modelMatrix) * normal).z);",
    );
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vFacingFade;")
    .replace(
      "#include <alphatest_fragment>",
      "#include <alphatest_fragment>\n  diffuseColor.rgb *= vFacingFade;\n  diffuseColor.a *= mix(1.0, vFacingFade, 0.85);",
    );
}
