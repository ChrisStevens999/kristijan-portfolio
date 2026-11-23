"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { TV_MODEL, TV_SCREEN_CLIP } from "@/content/projects/skateboard-designs";

/**
 * The retro TV (public/skateboarding/tv, built by
 * scripts/build-tv-assets.mjs), shot by the scroll: it arrives showing its
 * stickered right side, and as the visitor scrolls the camera comes round
 * to the front and pushes in until the screen (the campaign clip, behind a
 * light CRT treatment) fills the view. Scrolling back reverses it.
 *
 * The scroll is the only control: no drag, no zoom, and the canvas takes no
 * pointer events, so the page scrolls freely over it.
 *
 * three.js objects are mutable by design; everything that changes one lives
 * in the helpers below, outside the components.
 */

const FOV = 32;
/**
 * The model's own axes: the screen faces +X and the stickered side is -Z,
 * the viewer's right when facing the screen. The opening shot looks at that
 * side, turned a little towards the front so the TV reads as a box, and a
 * touch from above.
 */
const START_AZIMUTH = THREE.MathUtils.degToRad(76);
const START_ELEVATION = THREE.MathUtils.degToRad(7);
/** the camera comes round over the first part of the move and pushes in over the last; they overlap */
const TURN_END = 0.72;
const PUSH_START = 0.18;
/** how quickly the camera catches up with the scroll (per second) */
const FOLLOW = 7;
/** the screen's share of the view at the end: room for the bezel around it */
const SCREEN_FIT_DOWN = 1.5;
const SCREEN_FIT_ACROSS = 1.12;

type Screen = { mesh: THREE.Mesh; standIn: THREE.Material | THREE.Material[] };
/** what the camera frames: the whole TV at the start, its screen at the end */
type Shot = {
  centre: THREE.Vector3;
  radius: number;
  screenCentre: THREE.Vector3;
  screenWidth: number;
  screenHeight: number;
};
/** the camera's place along the move, eased towards the scroll's */
type Rig = { at: number | null };

let modelPromise: Promise<GLTF> | null = null;
function loadModel() {
  if (!modelPromise) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    modelPromise = loader.loadAsync(TV_MODEL);
  }
  return modelPromise;
}

/** the CRT look from the supplied viewer: scanlines, vignette, a faint flicker */
function crtMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, t: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform sampler2D map;uniform float t;varying vec2 vUv;
      void main(){
        vec3 c=texture2D(map,vUv).rgb;
        float scan=0.9+0.1*sin(vUv.y*900.0);
        vec2 d=vUv-0.5; float vig=1.0-dot(d,d)*1.1;
        float flick=0.985+0.015*sin(t*60.0);
        gl_FragColor=vec4(c*scan*vig*flick*1.08,1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
}

/** the screen clip: muted, looping, inline, never shown as an element */
function screenVideo() {
  const v = document.createElement("video");
  v.src = TV_SCREEN_CLIP;
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.crossOrigin = "anonymous";
  v.preload = "auto";
  return v;
}
function releaseVideo(v: HTMLVideoElement) {
  v.pause();
  v.removeAttribute("src");
  v.load();
}

/** the clip as a texture behind the CRT shader */
function crtFor(video: HTMLVideoElement) {
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  return crtMaterial(tex);
}
function disposeCrt(crt: THREE.ShaderMaterial) {
  (crt.uniforms.map.value as THREE.Texture).dispose();
  crt.dispose();
}
const tick = (crt: THREE.ShaderMaterial, t: number) => {
  crt.uniforms.t.value = t;
};

/** the meshes that are the screen (material "Screen"), with the still frame the model ships on them */
function findScreens(root: THREE.Object3D) {
  const found: Screen[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (mats.some((m) => m.name === "Screen")) found.push({ mesh, standIn: mesh.material });
  });
  return found;
}
const showOn = (screens: Screen[], material: THREE.Material) => {
  for (const { mesh } of screens) mesh.material = material;
};
const showStandIn = (screens: Screen[]) => {
  for (const { mesh, standIn } of screens) mesh.material = standIn;
};

function lightWithRoom(scene: THREE.Scene, gl: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(gl);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  pmrem.dispose();
  return () => {
    scene.environment = null;
    env.dispose();
  };
}

/** the TV's bounds and its screen's, measured from the model */
function measure(root: THREE.Object3D, screens: Screen[]): Shot {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const centre = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  // the opening shot aims a little below the middle: the TV's weight is low
  centre.y -= radius * 0.06;

  const glass = new THREE.Box3();
  for (const { mesh } of screens) glass.expandByObject(mesh);
  if (glass.isEmpty()) glass.copy(box);
  const size = glass.getSize(new THREE.Vector3());
  const screenCentre = glass.getCenter(new THREE.Vector3());
  screenCentre.x = glass.max.x; // the front of the glass
  return { centre, radius, screenCentre, screenWidth: size.z, screenHeight: size.y };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => v * v * (3 - 2 * v);
const target = new THREE.Vector3();
const direction = new THREE.Vector3();

/**
 * Put the camera at `at` along the move (0: the stickered side, the whole
 * TV in view; 1: square on to the screen, close). Both ends are fitted to
 * whichever field of view is tighter, so a phone in portrait sees the whole
 * TV and then the whole screen.
 */
function shoot(camera: THREE.PerspectiveCamera, size: { width: number; height: number }, shot: Shot, at: number) {
  const aspect = size.width / Math.max(1, size.height);
  const down = THREE.MathUtils.degToRad(FOV / 2);
  const across = Math.atan(Math.tan(down) * aspect);

  const turn = ease(clamp01(at / TURN_END));
  const push = ease(clamp01((at - PUSH_START) / (1 - PUSH_START)));

  const far = (shot.radius / Math.sin(Math.min(down, across))) * 0.92;
  const near = Math.max(
    (shot.screenHeight / 2 / Math.tan(down)) * SCREEN_FIT_DOWN,
    (shot.screenWidth / 2 / Math.tan(across)) * SCREEN_FIT_ACROSS,
  );
  const distance = THREE.MathUtils.lerp(far, near, push);
  const azimuth = START_AZIMUTH * (1 - turn);
  const elevation = START_ELEVATION * (1 - turn);

  target.lerpVectors(shot.centre, shot.screenCentre, push);
  direction.set(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), -Math.cos(elevation) * Math.sin(azimuth));
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.near = near / 20;
  camera.far = far * 10;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
}

/** ease the rig towards where the scroll is; the first frame starts there */
function follow(rig: Rig, to: number, dt: number) {
  rig.at = rig.at === null ? to : rig.at + (to - rig.at) * (1 - Math.exp(-dt * FOLLOW));
  return rig.at;
}

function Environment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => lightWithRoom(scene, gl), [gl, scene]);
  return null;
}

function Tv({
  gltf,
  playing,
  progress,
  reducedMotion,
  onReady,
}: {
  gltf: GLTF;
  playing: boolean;
  progress: MotionValue<number>;
  reducedMotion: boolean;
  onReady: () => void;
}) {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const size = useThree((s) => s.size);

  // the clip behind the CRT shader; until it has a frame, the model's own
  // still frame stays on the screen
  const [video] = useState(screenVideo);
  const crt = useMemo(() => crtFor(video), [video]);
  const screens = useMemo(() => findScreens(gltf.scene), [gltf]);
  const shot = useMemo(() => measure(gltf.scene, screens), [gltf, screens]);
  const rig = useRef<Rig>({ at: null });

  useEffect(() => {
    const show = () => showOn(screens, crt);
    video.addEventListener("playing", show, { once: true });
    return () => {
      video.removeEventListener("playing", show);
      showStandIn(screens);
    };
  }, [video, crt, screens]);

  // play while on screen; reduced motion keeps the still frame
  useEffect(() => {
    if (!playing || reducedMotion) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      /* autoplay refused: the still frame stays */
    });
  }, [playing, reducedMotion, video]);

  useEffect(
    () => () => {
      releaseVideo(video);
      disposeCrt(crt);
    },
    [video, crt],
  );

  useEffect(() => onReady(), [onReady]);

  // reduced motion: no camera move, the TV simply faces the visitor
  useFrame((state, dt) => {
    tick(crt, state.clock.getElapsedTime());
    const at = reducedMotion ? 1 : follow(rig.current, clamp01(progress.get()), dt);
    shoot(camera, size, shot, at);
  });

  return <primitive object={gltf.scene} />;
}

export function TvScene({
  running,
  progress,
  reducedMotion,
  onReady,
}: {
  /** false while the section is off screen: no frames are drawn and the clip pauses */
  running: boolean;
  /** the camera move, 0 (the stickered side) to 1 (close on the screen), driven by the scroll */
  progress: MotionValue<number>;
  reducedMotion: boolean;
  onReady: () => void;
}) {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  useEffect(() => {
    let live = true;
    loadModel().then((g) => live && setGltf(g));
    return () => {
      live = false;
    };
  }, []);

  return (
    <Canvas
      camera={{ fov: FOV, position: [0, 0, 5] }}
      gl={{ antialias: true, alpha: true, toneMappingExposure: 1.05 }}
      dpr={[1, 2]}
      frameloop={running ? "always" : "never"}
      style={{ background: "transparent", pointerEvents: "none" }}
    >
      <Environment />
      <directionalLight position={[3, 4, -2]} intensity={1.4} color="#fff1e0" />
      {gltf ? <Tv gltf={gltf} playing={running} progress={progress} reducedMotion={reducedMotion} onReady={onReady} /> : null}
    </Canvas>
  );
}
