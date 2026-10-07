"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Framing, measured off the approved artboard (3840x2160): inside the white
 * frame the shirt spans 14.7%–87.6% of the stage height, centred on the
 * floor shadow. Expressed relative to stage height only, so the shirt sits
 * on the same spot above the shadow at any stage width.
 */
const FOV = 25;
const SHIRT_HEIGHT_FRACTION = 0.73;
const VIEW_HEIGHT = 1 / SHIRT_HEIGHT_FRACTION; // garment is normalised to height 1
const CAMERA_DISTANCE = VIEW_HEIGHT / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const CENTER_DROP = 0.012 * VIEW_HEIGHT; // garment centre sits 1.2% below stage centre

const AUTO_ROTATE_SPEED = 0.35; // rad/s while idle
const SWAP_S = 0.7; // full spin when switching garments

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * What to show: a model, optionally with a print (base-colour texture) put
 * on it. Two kinds of garment use this:
 *  - a T-shirt: the shared tee model + that shirt's print;
 *  - a pattern shirt: its own model, shown exactly as authored (its own UVs
 *    — i.e. pattern scale — texture and trim colours), no print.
 */
export type GarmentView = {
  model: string;
  print?: string;
  /** show the back first */
  faceBack: boolean;
  /** other prints for the same model to download in the background */
  prefetch: string[];
};

// --- loading (cached for the session) ----------------------------------------------

const gltfCache = new Map<string, Promise<GLTF>>();
function loadModel(url: string) {
  let p = gltfCache.get(url);
  if (!p) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    p = loader.loadAsync(url);
    gltfCache.set(url, p);
  }
  return p;
}

const printCache = new Map<string, Promise<THREE.Texture>>();
function loadPrint(url: string, anisotropy: number) {
  let p = printCache.get(url);
  if (!p) {
    p = new THREE.TextureLoader().loadAsync(url).then((tex) => {
      // glTF UV convention + colour texture
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = anisotropy;
      tex.needsUpdate = true;
      return tex;
    });
    printCache.set(url, p);
  }
  return p;
}

/**
 * A ready-to-show object for a view: the model centred on the origin, scaled
 * to height 1 and turned to its starting side, with its own material copies
 * (sharing geometry and textures with the cached model). One per
 * model+print, built once.
 */
const objectCache = new Map<string, Promise<THREE.Object3D>>();
const viewKey = (v: GarmentView) => `${v.model}|${v.print ?? ""}|${v.faceBack ? "b" : "f"}`;
function loadGarment(view: GarmentView, anisotropy: number) {
  const key = viewKey(view);
  let p = objectCache.get(key);
  if (!p) {
    p = Promise.all([loadModel(view.model), view.print ? loadPrint(view.print, anisotropy) : null]).then(
      ([gltf, print]) => {
        const scene = gltf.scene.clone(true);
        // Which materials the print goes on. A shared model ships with its
        // cloth materials' base colour stripped, so every material is cloth
        // (the tee)... unless some part has its own plain colour and never
        // had a texture (the hoodie's drawstrings): those keep it.
        const materials = new Set<THREE.MeshStandardMaterial>();
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) materials.add(mesh.material as THREE.MeshStandardMaterial);
        });
        const isPlain = (m: THREE.MeshStandardMaterial) => !m.map && m.color.getHex() !== 0xffffff;
        const printed = new Set([...materials].filter((m) => !isPlain(m)));
        const clones = new Map<THREE.Material, THREE.MeshStandardMaterial>();
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const source = mesh.material as THREE.MeshStandardMaterial;
          if (!clones.has(source)) {
            const mat = source.clone();
            if (print && printed.has(source)) mat.map = print;
            if (mat.map) mat.map.anisotropy = anisotropy;
            clones.set(source, mat);
          }
          mesh.material = clones.get(source)!;
        });
        scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        scene.position.sub(box.getCenter(new THREE.Vector3()));
        const turn = new THREE.Group();
        turn.rotation.y = view.faceBack ? Math.PI : 0;
        turn.add(scene);
        const wrapper = new THREE.Group();
        wrapper.add(turn);
        wrapper.scale.setScalar(1 / size.y);
        return wrapper;
      },
    );
    objectCache.set(key, p);
  }
  return p;
}

/** three.js objects are mutable by design; kept out of the component body so
 *  the React compiler's immutability rule doesn't see a hook value change. */
function show(holder: THREE.Group, object: THREE.Object3D) {
  holder.clear();
  holder.add(object);
}

/**
 * Shows the current view. Switching to another one spins the garment a full
 * turn and swaps it while it is side-on; switching to a different KIND of
 * garment (another model on the tee→shirt boundary) does the same.
 */
function Garment({ view, reducedMotion }: { view: GarmentView; reducedMotion: boolean }) {
  const anisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const clock = useThree((s) => s.clock);
  const spin = useRef<THREE.Group>(null);
  const shown = useRef<string | null>(null);
  const swap = useRef<{ start: number; from0: number; object: THREE.Object3D; key: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = viewKey(view);
    loadGarment(view, anisotropy).then((object) => {
      // a later selection may have superseded this one while it loaded
      if (cancelled || key === shown.current || !spin.current) return;
      if (shown.current === null || reducedMotion) {
        shown.current = key;
        show(spin.current, object);
        // first one is up — warm the cache for the other prints
        if (!reducedMotion) view.prefetch.forEach((url) => loadPrint(url, anisotropy));
        return;
      }
      swap.current = { start: clock.elapsedTime, from0: spin.current.rotation.y, object, key };
    });
    return () => {
      cancelled = true;
    };
  }, [view, anisotropy, reducedMotion, clock]);

  useFrame((state) => {
    const g = spin.current;
    const s = swap.current;
    if (!g || !s) return;
    const t = Math.min(1, (state.clock.elapsedTime - s.start) / SWAP_S);
    // one full turn, swapped while the garment is side-on
    g.rotation.y = s.from0 + easeInOutCubic(t) * Math.PI * 2;
    if (t >= 0.25 && shown.current !== s.key) {
      shown.current = s.key;
      show(g, s.object);
    }
    if (t >= 1) swap.current = null;
  });

  return (
    <group position={[0, -CENTER_DROP, 0]}>
      <group ref={spin} />
    </group>
  );
}

/** On narrow stages (phones) the height-based framing would push the
 *  sleeves out of frame — pull the camera back until the garment (≈0.9 of
 *  its height wide) fits in 80% of the stage width. */
const SHIRT_WIDTH = 0.9;
function CameraFit() {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    const neededHeight = SHIRT_WIDTH / 0.8 / aspect;
    const height = Math.max(VIEW_HEIGHT, neededHeight);
    camera.position.setLength(height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  }, [camera, aspect]);
  return null;
}

export function TeeScene({ view, reducedMotion }: { view: GarmentView; reducedMotion: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, CAMERA_DISTANCE], fov: FOV, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
    >
      {/* Overhead spot, like the light pool on the reference wall, plus a
          soft fill and two rims so the fabric keeps its folds. */}
      <hemisphereLight args={["#ffffff", "#202020", 0.9]} />
      <directionalLight position={[0.5, 3, 3]} intensity={2.2} />
      <directionalLight position={[-3, 1, -2]} intensity={1.1} />
      <directionalLight position={[3, 0.5, -1]} intensity={0.8} />
      <CameraFit />
      <Garment view={view} reducedMotion={reducedMotion} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        autoRotate={!reducedMotion}
        autoRotateSpeed={AUTO_ROTATE_SPEED * 10}
        minPolarAngle={Math.PI / 2 - 0.45}
        maxPolarAngle={Math.PI / 2 + 0.25}
        target={[0, -CENTER_DROP, 0]}
      />
    </Canvas>
  );
}
