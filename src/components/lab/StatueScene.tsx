"use client";

import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export const STATUE_MODEL = "/lab/statue.glb";

const FOV = 30;
/** the statue fills this much of the frame's height */
const FILL = 0.74;
/** how far the statue turns towards the pointer at the screen's edge (radians) */
const MAX_YAW = 0.95;
const MAX_PITCH = 0.22;
/** how quickly it follows (higher = snappier) */
const TURN_DAMPING = 3.2;
const LIGHT_DAMPING = 9;
/** the pointer light floats this far in front of the statue */
const LIGHT_Z = 0.85;
/** how bright the room's reflections are once revealed (the neutral tone curve reads brighter than a filmic one) */
const ROOM_LEVEL = 0.7;
/** its full intensity (kept under the bloom threshold: the chrome should gleam, not glow) */
const POINTER_LIGHT = 2.6;
/** with no pointer movement for this long (or on touch screens), the light wanders by itself */
const IDLE_AFTER_S = 3.5;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Opening sequence, in seconds from the moment the model is ready:
 * black → the visor alone flickers on in red → the lights come up and the
 * statue is revealed.
 */
const BLINKS: [on: number, off: number][] = [
  [0.5, 0.62],
  [0.78, 0.86],
  [1.2, 1.32],
];
const LENS_STAYS_ON = 1.55; // after the last flicker it comes on for good
const REVEAL_START = 2.3;
const REVEAL_S = 2.4;
/** During the flicker the camera sits close on the visor, so the lit lens
 *  spans this much of the screen's width; as the statue is revealed it
 *  pulls back (and swings round to the front) to the full view. */
const VISOR_SCREEN_WIDTH = 0.35;
/** the lens strip sits at an angle in its bounding box: its long edge is
 *  about this fraction of the box's diagonal (measured on screen) */
const LENS_LENGTH_IN_BOX = 0.8;
const ZOOM_OUT_S = 2.8;

/** how bright the visor is, 0..1 */
function lensAt(t: number) {
  if (t >= LENS_STAYS_ON) return Math.min(1, 0.55 + (t - LENS_STAYS_ON) / 0.25);
  return BLINKS.some(([on, off]) => t >= on && t < off) ? 1 : 0;
}
/** how far the room lights are up, 0..1 */
function revealAt(t: number) {
  return easeInOutCubic(THREE.MathUtils.clamp((t - REVEAL_START) / REVEAL_S, 0, 1));
}

/** how far the camera has pulled back from the visor to the full view, 0..1 */
function zoomOutAt(t: number) {
  return easeInOutCubic(THREE.MathUtils.clamp((t - REVEAL_START) / ZOOM_OUT_S, 0, 1));
}

/**
 * Shared state for the opening. `t` is its clock: seconds of DRAWN time
 * since the statue's first frame (frame deltas, each capped) — not wall
 * time, so a tab opened in the background, or a slow first frame, does not
 * eat the sequence; it plays when the page is actually being shown.
 */
type IntroState = {
  t: number | null;
  /** where the clock starts (0; `?t=<seconds>` in the URL starts it later, for checking a moment of the opening) */
  from: number;
  /** the lens: centre, the way it faces, and its width (statue height = 1) */
  lens: THREE.Vector3 | null;
  facing: THREE.Vector3;
  width: number;
};
type Intro = React.RefObject<IntroState>;
function startFromUrl() {
  const t = Number(new URLSearchParams(window.location.search).get("t"));
  return Number.isFinite(t) && t > 0 ? t : 0;
}
/** Called once per frame by the statue: starts the clock on its first frame, then advances it. */
function tickIntro(intro: Intro, delta: number, lens: THREE.Vector3 | null, facing: THREE.Vector3, width: number) {
  if (intro.current.t === null) {
    intro.current.t = intro.current.from;
    intro.current.lens = lens;
    intro.current.facing.copy(facing);
    intro.current.width = width;
    return;
  }
  intro.current.t += Math.min(delta, 0.05);
}
function introTime(intro: Intro, reducedMotion: boolean) {
  if (reducedMotion) return Infinity; // straight to the revealed state
  return intro.current.t ?? 0;
}

/**
 * How bright the lit lens is, in HDR units. Well above 1 so that it — and
 * almost nothing else — crosses the bloom threshold: the glow you see is the
 * bloom pass spreading that excess, like a lens overloading a camera sensor.
 */
const LENS_EMISSIVE = 13;
/** in luminance; pure red counts for little (0.21), which is why the lens needs so much */
const BLOOM_THRESHOLD = 1.5;

/** three.js objects are mutable by design; kept out of the component bodies
 *  so React's immutability lint doesn't see a hook value being changed. */
function setLensGlow(material: THREE.MeshPhysicalMaterial | null, value: number) {
  if (material) material.emissiveIntensity = value * LENS_EMISSIVE;
}

/**
 * The lens as glowing glass rather than a flat red shape:
 *  - physically it is smooth coated glass (clearcoat), so it picks up sharp
 *    reflections of the lights on top of its own glow, and reads as dark
 *    glossy glass when it is off;
 *  - its glow is not uniform: brightest where you look straight into it,
 *    falling off towards the rim (as light from behind a curved lens does),
 *    with a paler, hotter core.
 */
function makeLensMaterial(source: THREE.MeshPhysicalMaterial) {
  const mat = source.clone();
  mat.color.set("#12060a");
  mat.emissive.set("#ff0a1c");
  mat.emissiveIntensity = 0; // dark until the opening switches it on
  mat.metalness = 0;
  mat.roughness = 0.14;
  mat.clearcoat = 1;
  mat.clearcoatRoughness = 0.04;
  mat.envMapIntensity = 2.4;
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      {
        float lensFacing = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
        // rim falls to a quarter; the centre stays full
        totalEmissiveRadiance *= mix(0.25, 1.0, pow(lensFacing, 1.6));
        // a paler, hotter core (adds a little green/blue to the red)
        totalEmissiveRadiance += totalEmissiveRadiance.r * vec3(0.0, 0.2, 0.16) * pow(lensFacing, 7.0);
      }`,
    );
  };
  mat.customProgramCacheKey = () => "statue-lens-glass";
  return mat;
}

/** The black frame as real metal: a satin coat that catches the lights along its edges. */
function makeFrameMaterial(source: THREE.MeshPhysicalMaterial) {
  const mat = source.clone();
  mat.metalness = 1;
  mat.roughness = 0.32;
  mat.clearcoat = 0.6;
  mat.clearcoatRoughness = 0.25;
  mat.envMapIntensity = 2.6;
  return mat;
}

/** A soft horizontal streak (drawn once): the anamorphic flare across a bright light. */
function useStreakTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    // squash a round gradient into a long thin one
    ctx.translate(256, 32);
    ctx.scale(8, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.12, "rgba(255,255,255,0.5)");
    g.addColorStop(0.45, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Cheap, repeatable flicker in 0..1 (two incommensurate sines + a fast shimmer). */
function flicker(t: number) {
  return 0.5 + 0.5 * (0.55 * Math.sin(t * 7.3) + 0.3 * Math.sin(t * 13.7 + 1.3) + 0.15 * Math.sin(t * 41.0));
}

/**
 * Where the "pointer" is, in -1..1 screen units: the real pointer while it
 * is moving, otherwise a slow figure-of-eight so the piece is never static
 * (and so phones, which have no hover, still get the effect). Listens on
 * the window, so it works wherever the pointer is on the page.
 */
function usePointerTarget(reducedMotion: boolean) {
  const target = useRef(new THREE.Vector2(0.35, 0.3));
  const real = useRef(new THREE.Vector2(0, 0));
  const lastMove = useRef(-Infinity);
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      real.current.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      lastMove.current = clock.elapsedTime;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [clock]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (t - lastMove.current < IDLE_AFTER_S) target.current.copy(real.current);
    else if (!reducedMotion) target.current.set(Math.sin(t * 0.45) * 0.75, Math.sin(t * 0.9) * 0.35 + 0.15);
  });
  return target;
}

type PointerRef = React.RefObject<THREE.Vector2>;
type SceneProps = {
  reducedMotion: boolean;
  /** the model has loaded (the opening starts) */
  onReady?: () => void;
  /** the opening has finished: the statue is lit and the camera is back */
  onRevealed?: () => void;
};

function Statue({
  reducedMotion,
  onReady,
  onRevealed,
  pointer,
  intro,
}: {
  reducedMotion: boolean;
  onReady?: () => void;
  onRevealed?: () => void;
  pointer: PointerRef;
  intro: Intro;
}) {
  const gltf = useGLTF(STATUE_MODEL);
  const streakTexture = useStreakTexture();
  const anisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  // Normalise: centre on the origin, height 1; note where the lens ended up.
  const { model, lens, lensSize, lensFacing, lensMaterial } = useMemo(() => {
    let lensMaterial: THREE.MeshPhysicalMaterial | null = null;
    const scene = gltf.scene.clone(true);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // own copy per mesh, so tweaks here never touch the cached GLTF
      const source = mesh.material as THREE.MeshPhysicalMaterial;
      if (mesh.name === "Red_Emissive_Lens") {
        lensMaterial = makeLensMaterial(source);
        mesh.material = lensMaterial;
      } else if (mesh.name === "Black_Metal_Frame") {
        mesh.material = makeFrameMaterial(source);
      } else {
        const mat = source.clone();
        for (const tex of [mat.map, mat.normalMap, mat.clearcoatNormalMap]) if (tex) tex.anisotropy = anisotropy;
        // the chrome lives off its reflections
        mat.envMapIntensity = 1.15;
        mesh.material = mat;
      }
    });
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const wrapper = new THREE.Group();
    scene.position.sub(centre);
    wrapper.add(scene);
    wrapper.scale.setScalar(1 / size.y);
    wrapper.updateMatrixWorld(true);

    const lensObject = scene.getObjectByName("Red_Emissive_Lens") as THREE.Mesh | undefined;
    const lensBox = lensObject ? new THREE.Box3().setFromObject(lensObject) : null;
    // Which way the lens faces — the halo is only shown when that side is
    // towards the camera. The visor frame's arms run back along the head,
    // so its centre sits behind the lens: frame centre → lens centre points
    // out of the face.
    const facing = new THREE.Vector3(0, 0, 1);
    const frameObject = scene.getObjectByName("Black_Metal_Frame");
    if (lensBox && frameObject) {
      const forward = lensBox
        .getCenter(new THREE.Vector3())
        .sub(new THREE.Box3().setFromObject(frameObject).getCenter(new THREE.Vector3()));
      if (forward.lengthSq() > 1e-10) facing.copy(forward.normalize());
    }
    return {
      model: wrapper,
      lens: lensBox ? lensBox.getCenter(new THREE.Vector3()) : null,
      lensSize: lensBox ? lensBox.getSize(new THREE.Vector3()).length() : 0,
      lensFacing: facing,
      lensMaterial: lensMaterial as THREE.MeshPhysicalMaterial | null,
    };
  }, [gltf, anisotropy]);

  useEffect(() => {
    onReady?.();
  }, [model, onReady]);

  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const v = useRef({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() });
  const lensLight = useRef<THREE.PointLight>(null);
  const revealed = useRef(false);
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    tickIntro(intro, delta, lens, lensFacing, lensSize);
    const it = introTime(intro, reducedMotion);
    const reveal = revealAt(it);
    // a living light: once on, it never sits perfectly still
    const shimmer = reducedMotion ? 1 : 0.93 + 0.07 * flicker(state.clock.elapsedTime);
    const lensOn = lensAt(it) * shimmer;
    setLensGlow(lensMaterial, lensOn);
    // the lens only starts lighting the face once the room comes up — during
    // the flicker it is the one thing visible
    if (lensLight.current) lensLight.current.intensity = 0.7 * lensOn * reveal;
    // The statue holds still while the camera is on the visor (the camera
    // is aimed at where the lens rests); once it has pulled back, a slow
    // breath, and it turns towards the pointer (eased, so it feels like
    // weight, not a cursor).
    const free = zoomOutAt(it);
    if (free >= 1 && !revealed.current) {
      revealed.current = true;
      onRevealed?.();
    }
    g.position.y = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.7) * 0.008 * free;
    const p = pointer.current;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, p.x * MAX_YAW * free, TURN_DAMPING, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -p.y * MAX_PITCH * free, TURN_DAMPING, delta);
    // flare: full when the lens looks at the camera, gone by the time it is side-on
    if (halo.current && lens) {
      g.updateMatrixWorld();
      const lensWorld = v.current.a.copy(lens).applyMatrix4(g.matrixWorld);
      const facing = v.current.b.copy(lensFacing).applyQuaternion(g.quaternion);
      const towards = v.current.c.copy(state.camera.position).sub(lensWorld).normalize().dot(facing);
      // the streak belongs to a light seen head-on: strongest looking into the lens
      halo.current.opacity = 0.34 * lensOn * THREE.MathUtils.smoothstep(towards, 0.1, 0.75);
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} />
      {lens && (
        <group position={lens}>
          {/* the lens actually lights the face around it (the glow itself is the bloom pass)… */}
          <pointLight ref={lensLight} color="#ff1626" intensity={0} distance={1.3} decay={2} />
          {/* …and a long horizontal streak across it — the anamorphic flare a
              cinema lens throws from a bright light, faded out as the visor turns away */}
          <sprite scale={[lensSize * 5.5, lensSize * 0.42, 1]}>
            <spriteMaterial
              ref={halo}
              map={streakTexture}
              color="#ff2a3a"
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              depthTest={false}
              transparent
              opacity={0}
            />
          </sprite>
        </group>
      )}
    </group>
  );
}

/** The pointer as a light: a warm point light that floats in front of the
 *  statue wherever the pointer is. The light itself is invisible, only its
 *  effect on the statue shows. */
function PointerLight({ pointer, intro, reducedMotion }: { pointer: PointerRef; intro: Intro; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const reveal = revealAt(introTime(intro, reducedMotion));
    if (light.current) light.current.intensity = POINTER_LIGHT * reveal;
    // the room's reflections come up with it (dark until the reveal)
    state.scene.environmentIntensity = reveal * ROOM_LEVEL;
    // viewport = the visible width/height at the statue's depth
    const { width, height } = state.viewport;
    const p = pointer.current;
    g.position.x = THREE.MathUtils.damp(g.position.x, (p.x * width) / 2, LIGHT_DAMPING, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, (p.y * height) / 2, LIGHT_DAMPING, delta);
  });
  return (
    <group ref={group} position={[0.4, 0.3, LIGHT_Z]}>
      <pointLight ref={light} color="#fff2e2" intensity={0} distance={6} decay={2} />
    </group>
  );
}

/** Everything that moves with the pointer shares one target. */
function PointerRig({ reducedMotion, onReady, onRevealed }: SceneProps) {
  const pointer = usePointerTarget(reducedMotion);
  const intro = useRef<IntroState>({ t: null, from: startFromUrl(), lens: null, facing: new THREE.Vector3(0, 0, 1), width: 0 });
  return (
    <>
      <IntroCamera intro={intro} reducedMotion={reducedMotion} />
      <PointerLight pointer={pointer} intro={intro} reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <Statue reducedMotion={reducedMotion} onReady={onReady} onRevealed={onRevealed} pointer={pointer} intro={intro} />
      </Suspense>
    </>
  );
}

/**
 * The camera. Full view: straight on, framing the statue by height (pulled
 * back on narrow phone screens so it still fits by width). Opening: close
 * on the visor, looking straight into the lens from the direction it faces,
 * at the distance where the lens spans VISOR_SCREEN_WIDTH of the screen —
 * then one move back and round to the full view as the statue is revealed.
 */
function IntroCamera({ intro, reducedMotion }: { intro: Intro; reducedMotion: boolean }) {
  const v = useRef({ full: new THREE.Vector3(), close: new THREE.Vector3(), target: new THREE.Vector3() });
  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const aspect = state.size.width / state.size.height;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const viewH = Math.max(1 / FILL, 0.95 / 0.82 / aspect);
    const { full, close, target } = v.current;
    full.set(0, 0, viewH / 2 / tan);

    const { lens, facing, width } = intro.current;
    const out = lens ? zoomOutAt(introTime(intro, reducedMotion)) : 1;
    if (!lens || out >= 1) {
      camera.position.copy(full);
      camera.lookAt(0, 0, 0);
      return;
    }
    // visible width at distance d is 2·d·tan(fov/2)·aspect → solve for the lens filling its share
    const distance = Math.max(0.16, (width * LENS_LENGTH_IN_BOX) / VISOR_SCREEN_WIDTH / (2 * tan * aspect));
    close.copy(facing).multiplyScalar(distance).add(lens);
    camera.position.lerpVectors(close, full, out);
    target.copy(lens).multiplyScalar(1 - out); // look at the lens → the statue's centre
    camera.lookAt(target);
  });
  return null;
}

export function StatueScene({ reducedMotion, onReady, onRevealed }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: FOV, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#000000"]} />

      {/* The pointer is the key light, so the room is kept dark: the
          reflection panels (built in code, no HDR file) are only bright
          enough to leave a faint outline — two thin rims, a whisper of
          overhead, and the red kicker — and there is no fixed front light. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#000000"]} />
        <Lightformer form="rect" intensity={0.9} position={[0, 4, 1.5]} rotation-x={Math.PI / 2} scale={[7, 2.2, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-4.5, 1, -0.5]} rotation-y={Math.PI / 2} scale={[5, 0.7, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[4.5, 0.4, -1]} rotation-y={-Math.PI / 2} scale={[5, 0.6, 1]} />
        <Lightformer form="circle" intensity={1.8} color="#ff2030" position={[2.5, -2.5, -3]} scale={2.5} />
      </Environment>
      <PointerRig reducedMotion={reducedMotion} onReady={onReady} onRevealed={onRevealed} />

      {/* Cinematic glow: only what is brighter than the threshold blooms —
          the lit lens (far brighter than anything else) and the hottest
          glints on the chrome. Tone mapping moves here, to the end of the
          chain; "neutral" keeps the lens crimson where filmic curves push a
          very bright red towards orange. */}
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.55} luminanceThreshold={BLOOM_THRESHOLD} luminanceSmoothing={0.3} radius={0.62} levels={7} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload(STATUE_MODEL);
