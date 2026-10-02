"use client";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { graphicTees, TSHIRT_MODEL } from "@/content/projects/graphic-tees";

const PRINTS = graphicTees.flatMap((t) => (t.print ? [t.print] : []));

/**
 * Framing, measured off the approved artboard (3840x2160): inside the white
 * frame the shirt spans 14.7%–87.6% of the stage height, centred on the
 * floor shadow. Expressed relative to stage height only, so the shirt sits
 * on the same spot above the shadow at any stage width.
 */
const FOV = 25;
const SHIRT_HEIGHT_FRACTION = 0.73;
const VIEW_HEIGHT = 1 / SHIRT_HEIGHT_FRACTION; // shirt is normalised to height 1
const CAMERA_DISTANCE = VIEW_HEIGHT / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const CENTER_DROP = 0.012 * VIEW_HEIGHT; // shirt centre sits 1.2% below stage centre

const AUTO_ROTATE_SPEED = 0.35; // rad/s while idle
const SWAP_S = 0.7; // full spin when switching shirts

/** three.js objects are mutable by design; kept out of the component body so
 *  the React compiler's immutability rule doesn't see a hook value change. */
function applyPrint(material: THREE.MeshStandardMaterial, map: THREE.Texture) {
  material.map = map;
  material.needsUpdate = true;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Print textures load on demand (the selected one first, the rest
 *  prefetched once it is up) and are cached for the session. */
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

function Tee({ print, reducedMotion }: { print: string; reducedMotion: boolean }) {
  const gltf = useGLTF(TSHIRT_MODEL);
  const anisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  // Normalise: centre the tee on the origin and scale it to height 1.
  const { model, material } = useMemo(() => {
    const scene = gltf.scene.clone(true);
    let mat: THREE.MeshStandardMaterial | null = null;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        if (!mat) mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mesh.material = mat;
      }
    });
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const wrapper = new THREE.Group();
    scene.position.sub(center);
    // the prints are on the back — face that side to the camera first
    const turn = new THREE.Group();
    turn.rotation.y = Math.PI;
    turn.add(scene);
    wrapper.add(turn);
    wrapper.scale.setScalar(1 / size.y);
    return { model: wrapper, material: mat as unknown as THREE.MeshStandardMaterial };
  }, [gltf]);

  const spin = useRef<THREE.Group>(null);
  const shown = useRef<string | null>(null);
  const swap = useRef<{ start: number; from0: number; tex: THREE.Texture; url: string } | null>(null);
  const clock = useThree((s) => s.clock);

  useEffect(() => {
    let cancelled = false;
    loadPrint(print, anisotropy).then((tex) => {
      // a later selection may have superseded this one while it loaded
      if (cancelled || print === shown.current) return;
      if (shown.current === null || reducedMotion) {
        shown.current = print;
        applyPrint(material, tex);
        // first print is up — warm the cache for the rest
        if (!reducedMotion) PRINTS.forEach((url) => loadPrint(url, anisotropy));
        return;
      }
      swap.current = { start: clock.elapsedTime, from0: spin.current?.rotation.y ?? 0, tex, url: print };
    });
    return () => {
      cancelled = true;
    };
  }, [print, anisotropy, material, reducedMotion, clock]);

  useFrame((state) => {
    const g = spin.current;
    if (!g) return;
    const s = swap.current;
    if (s) {
      const t = Math.min(1, (state.clock.elapsedTime - s.start) / SWAP_S);
      // one full turn, texture swapped while the shirt is side-on
      g.rotation.y = s.from0 + easeInOutCubic(t) * Math.PI * 2;
      if (t >= 0.25 && shown.current !== s.url) {
        shown.current = s.url;
        applyPrint(material, s.tex);
      }
      if (t >= 1) swap.current = null;
    }
  });

  return (
    <group position={[0, -CENTER_DROP, 0]}>
      <group ref={spin}>
        <primitive object={model} />
      </group>
    </group>
  );
}

/** On narrow stages (phones) the height-based framing would push the
 *  sleeves out of frame — pull the camera back until the tee (≈0.9 of its
 *  height wide) fits in 80% of the stage width. */
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

export function TeeScene({ print, reducedMotion }: { print: string; reducedMotion: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, CAMERA_DISTANCE], fov: FOV, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
    >
      {/* Overhead spot, like the light pool on the reference wall, plus a
          soft fill and two rims so the black cotton keeps its folds. */}
      <hemisphereLight args={["#ffffff", "#202020", 0.9]} />
      <directionalLight position={[0.5, 3, 3]} intensity={2.2} />
      <directionalLight position={[-3, 1, -2]} intensity={1.1} />
      <directionalLight position={[3, 0.5, -1]} intensity={0.8} />
      <CameraFit />
      <Suspense fallback={null}>
        <Tee print={print} reducedMotion={reducedMotion} />
      </Suspense>
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

useGLTF.preload(TSHIRT_MODEL);
