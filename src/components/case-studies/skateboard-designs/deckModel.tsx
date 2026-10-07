"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { DECK_MODEL, type SkateDeck } from "@/content/projects/skateboard-designs";

/**
 * The deck model, shared by the wall (DeckScene) and the close-up
 * (DeckInspect): loading, dressing a deck in its print and edge colour, the
 * camera both scenes frame with, and the light they share — so a deck looks
 * the same the moment it leaves the wall for the close-up.
 *
 * World units are stage heights: the camera's vertical field of view spans
 * exactly 1 at z = 0, so a deck placed in fractions of its stage lands
 * exactly on the DOM that places it.
 */

/** the model: X across, Y through (the graphic underneath, -Y), Z along */
export const MODEL_LENGTH = 0.797;
/** 0.214 wide per 0.797 of length */
export const DECK_WIDTH = 0.2686;
export const FOV = 20;
export const CAMERA_DISTANCE = 0.5 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const ENV_INTENSITY = 0.35;
/** the wood-grain normal map at its authored strength × this */
const GRAIN_BOOST = 1.2;

let modelPromise: Promise<GLTF> | null = null;
export function loadModel() {
  if (!modelPromise) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    modelPromise = loader.loadAsync(DECK_MODEL);
  }
  return modelPromise;
}

const printCache = new Map<string, Promise<THREE.Texture>>();
export function loadPrint(url: string, anisotropy: number) {
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

export type DressedDeck = { object: THREE.Object3D; materials: THREE.MeshStandardMaterial[] };

/**
 * A deck ready to hang: the shared model's scene cloned, its two printed
 * faces wearing this deck's print, its edge in this deck's colour. The
 * model is turned so the graphic faces the camera with the nose up, and
 * scaled so its length is 1 (the scene scales it to the deck's height).
 * three.js objects are mutable by design: kept out of the components.
 */
export function dressDeck(gltf: GLTF, deck: SkateDeck, print: THREE.Texture, anisotropy: number): DressedDeck {
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

/** Fade-in as a deck's print arrives. */
export function setOpacity(materials: THREE.MeshStandardMaterial[], opacity: number) {
  for (const m of materials) {
    m.opacity = opacity;
    if (opacity >= 1) m.transparent = false;
  }
}

/** A soft dark pool for the wall behind a deck (radial gradient sprite). */
export function shadowTexture() {
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

/** The wall's cool ceiling spots, as the decks see them: a key from above
 *  and in front, a soft fill, a faint rim so the edges separate from the
 *  wall, and a neutral room for the reflections along the grain. */
export function DeckLights() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => lightWithRoom(scene, gl), [gl, scene]);
  return (
    <>
      <hemisphereLight args={["#dfe8ff", "#0a0d14", 0.5]} />
      <directionalLight position={[0.2, 3, 2]} intensity={2.2} color="#e6eeff" />
      <directionalLight position={[-2, 0.5, 2.5]} intensity={0.5} />
      <directionalLight position={[2.5, 1.5, -1.5]} intensity={0.6} color="#cfe0ff" />
    </>
  );
}
