"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useSpring, type MotionValue } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { DECK_MODEL, type SkateDeck } from "@/content/projects/skateboard-designs";

/**
 * The decks, in 3D, over the wall. One canvas the size of the stage; world
 * units are stage HEIGHTS (the camera's vertical field of view spans exactly
 * 1 at the wall plane, z = 0), so a deck placed in the plate's fractions
 * lands on the rails exactly where the wall's DOM hit areas and labels are.
 *
 * Every deck is the shared model (public/skateboarding/deck.glb) wearing its
 * own print and edge colour. Hover (from the DOM, which owns the pointer):
 * the deck comes off the wall towards the camera, grows a touch and tilts
 * after the pointer — real depth now, so the wood grain and the edge catch
 * the light as it turns.
 */

/** the model: X across, Y through (the graphic underneath, -Y), Z along */
const MODEL_LENGTH = 0.797;
const FOV = 20;
const CAMERA_DISTANCE = 0.5 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

/** Hover feel: lift off the wall (world units = stage heights) and growth; the tilt (degrees) comes from the DOM. */
const LIFT = 0.06;
const HOVER_SCALE = 1.03;
/** Settles in ≈300ms with no visible bounce. */
const LIFT_SPRING = { stiffness: 260, damping: 27, mass: 1 } as const;
/** Pointer tracking: soft and damped, never twitchy. */
const TILT_SPRING = { stiffness: 140, damping: 22, mass: 0.7 } as const;
const FADE_S = 0.5;

const ENV_INTENSITY = 0.35;
/** the wood-grain normal map at its authored strength × this */
const GRAIN_BOOST = 1.2;

export type DeckLayout = {
  /** stage width / height */
  aspect: number;
  /** first deck's centre, × stage width */
  centre0: number;
  /** × stage width */
  pitch: number;
  /** deck top, × stage height */
  top: number;
  /** deck length on the wall, × stage height */
  height: number;
};

export type DeckSlot = {
  deck: SkateDeck;
  active: boolean;
  /** degrees, from the DOM pointer handlers (see DeckWall) */
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
};

let modelPromise: Promise<GLTF> | null = null;
function loadModel() {
  if (!modelPromise) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    modelPromise = loader.loadAsync(DECK_MODEL);
  }
  return modelPromise;
}

const printCache = new Map<string, Promise<THREE.Texture>>();
function loadPrint(url: string, anisotropy: number) {
  let p = printCache.get(url);
  if (!p) {
    p = new THREE.TextureLoader().loadAsync(url).then((tex) => {
      // glTF UV convention + colour texture
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = anisotropy;
      tex.needsUpdate = true;
      return tex;
    });
    printCache.set(url, p);
  }
  return p;
}

/**
 * A deck ready to hang: the shared model's scene cloned, its two printed
 * faces wearing this deck's print, its edge in this deck's colour. The
 * model is turned so the graphic faces the camera with the nose up, and
 * scaled so its length is 1 (the wall scales it to the deck height).
 * three.js objects are mutable by design: kept out of the components.
 */
function dressDeck(gltf: GLTF, deck: SkateDeck, print: THREE.Texture, anisotropy: number) {
  const scene = gltf.scene.clone(true);
  const materials: THREE.MeshStandardMaterial[] = [];
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material as THREE.MeshStandardMaterial;
    const mat = source.clone();
    if (/edge/i.test(source.name)) {
      mat.color.set(deck.edge);
    } else {
      mat.map = print;
      mat.map.anisotropy = anisotropy;
      if (mat.normalMap) mat.normalScale.multiplyScalar(GRAIN_BOOST);
    }
    mat.envMapIntensity = 0.8;
    mat.transparent = true;
    mat.opacity = 0;
    mesh.material = mat;
    materials.push(mat);
  });
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  scene.position.sub(box.getCenter(new THREE.Vector3()));
  // -Y (the graphic) -> +Z (towards the camera); +Z (the nose) -> +Y (up)
  const turn = new THREE.Group();
  turn.rotation.x = -Math.PI / 2;
  turn.add(scene);
  const fit = new THREE.Group();
  fit.scale.setScalar(1 / MODEL_LENGTH);
  fit.add(turn);
  return { object: fit, materials };
}

/** Fade-in as a deck's print arrives (materials are mutable by design;
 *  kept out of the component). */
function setOpacity(materials: THREE.MeshStandardMaterial[], opacity: number) {
  for (const m of materials) {
    m.opacity = opacity;
    if (opacity >= 1) m.transparent = false;
  }
}

/** A soft dark pool on the wall behind each deck (radial gradient sprite). */
function shadowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0.9)");
  g.addColorStop(0.45, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Deck3D({
  slot,
  index,
  layout,
  gltf,
  shadow,
  reducedMotion,
}: {
  slot: DeckSlot;
  index: number;
  layout: DeckLayout;
  gltf: GLTF;
  shadow: THREE.Texture;
  reducedMotion: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const group = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const [dressed, setDressed] = useState<ReturnType<typeof dressDeck> | null>(null);
  const fade = useRef(0);

  useEffect(() => {
    let live = true;
    loadPrint(slot.deck.print, gl.capabilities.getMaxAnisotropy()).then((print) => {
      if (live) setDressed(dressDeck(gltf, slot.deck, print, gl.capabilities.getMaxAnisotropy()));
    });
    return () => {
      live = false;
    };
  }, [gltf, gl, slot.deck]);

  const lift = useSpring(0, LIFT_SPRING);
  const rotateX = useSpring(slot.tiltX, TILT_SPRING);
  const rotateY = useSpring(slot.tiltY, TILT_SPRING);
  useEffect(() => {
    lift.set(slot.active && !reducedMotion ? 1 : 0);
  }, [lift, slot.active, reducedMotion]);

  const x = (layout.centre0 + layout.pitch * index - 0.5) * layout.aspect;
  const y = 0.5 - (layout.top + layout.height / 2);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const l = lift.get();
    g.position.set(x, y, l * LIFT);
    const s = layout.height * (1 + (HOVER_SCALE - 1) * l);
    g.scale.setScalar(s);
    g.rotation.set(THREE.MathUtils.degToRad(rotateX.get()), -THREE.MathUtils.degToRad(rotateY.get()), 0);
    if (dressed && fade.current < 1) {
      fade.current = Math.min(1, fade.current + dt / FADE_S);
      setOpacity(dressed.materials, fade.current);
    }
    const sh = shadowRef.current;
    if (sh) {
      // the shadow stays on the wall, spreads and drops as the deck lifts
      sh.position.set(x, y - layout.height * (0.015 + 0.02 * l), -0.05);
      sh.scale.set(layout.height * (0.42 + 0.06 * l), layout.height * 1.12, 1);
      (sh.material as THREE.MeshBasicMaterial).opacity = (dressed ? fade.current : 0) * (0.5 + 0.2 * l);
    }
  });

  return (
    <>
      <mesh ref={shadowRef} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadow} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={group}>{dressed ? <primitive object={dressed.object} /> : null}</group>
    </>
  );
}

/** The wall's cool overhead spotlights, as the decks see them. */
function Studio() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => lightWithRoom(scene, gl), [gl, scene]);
  return null;
}
function lightWithRoom(scene: THREE.Scene, gl: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(gl);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = ENV_INTENSITY;
  pmrem.dispose();
  return () => {
    scene.environment = null;
    env.dispose();
  };
}

export function DeckScene({
  slots,
  layout,
  reducedMotion,
  running,
}: {
  slots: DeckSlot[];
  layout: DeckLayout;
  reducedMotion: boolean;
  /** false while the wall is off screen: the frame loop stops */
  running: boolean;
}) {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  useEffect(() => {
    let live = true;
    loadModel().then((g) => live && setGltf(g));
    return () => {
      live = false;
    };
  }, []);
  const shadow = useMemo(() => shadowTexture(), []);

  return (
    <Canvas
      camera={{ position: [0, 0, CAMERA_DISTANCE], fov: FOV, near: 0.1, far: 10 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.75]}
      frameloop={running ? "always" : "never"}
      style={{ background: "transparent", pointerEvents: "none" }}
    >
      {/* the ceiling spots: cool key from above and in front, a soft fill,
          a faint rim so the edges separate from the wall */}
      <hemisphereLight args={["#dfe8ff", "#0a0d14", 0.5]} />
      <directionalLight position={[0.2, 3, 2]} intensity={2.2} color="#e6eeff" />
      <directionalLight position={[-2, 0.5, 2.5]} intensity={0.5} />
      <directionalLight position={[2.5, 1.5, -1.5]} intensity={0.6} color="#cfe0ff" />
      <Studio />
      {gltf
        ? slots.map((slot, i) => (
            <Deck3D
              key={slot.deck.id}
              slot={slot}
              index={i}
              layout={layout}
              gltf={gltf}
              shadow={shadow}
              reducedMotion={reducedMotion}
            />
          ))
        : null}
    </Canvas>
  );
}
