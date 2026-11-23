"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { TV_MODEL, TV_SCREEN_CLIP } from "@/content/projects/skateboard-designs";

/**
 * The retro TV (public/skateboarding/tv, built by
 * scripts/build-tv-assets.mjs): the stickered CRT turning slowly on its own,
 * its screen playing the campaign clip with a light CRT treatment. Drag
 * sideways to turn it; vertical swipes still scroll the page. No zoom — the
 * wheel belongs to the page.
 *
 * Lighting and framing follow the supplied viewer: a room environment for
 * the reflections, one warm key light, a three-quarter view from the front.
 *
 * three.js objects are mutable by design; everything that changes one lives
 * in the helpers below, outside the components.
 */

const FOV = 32;
/** the supplied viewer's three-quarter view, from the front-right */
const VIEW = new THREE.Vector3(0.85, 0.18, -0.75).normalize();

type Controls = ComponentRef<typeof OrbitControls>;
type Screen = { mesh: THREE.Mesh; standIn: THREE.Material | THREE.Material[] };

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

/**
 * Frame the whole TV in whichever field of view is narrower (a phone in
 * portrait is narrower across than down), from the three-quarter view.
 */
function frame(
  camera: THREE.PerspectiveCamera,
  controls: Controls | null,
  size: { width: number; height: number },
  center: THREE.Vector3,
  radius: number,
) {
  const aspect = size.width / Math.max(1, size.height);
  const vHalf = THREE.MathUtils.degToRad(FOV / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const distance = (radius / Math.sin(Math.min(vHalf, hHalf))) * 0.92;
  const target = center.clone().add(new THREE.Vector3(0, -radius * 0.06, 0));
  camera.position.copy(target).add(VIEW.clone().multiplyScalar(distance));
  camera.near = distance / 50;
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(target);
    controls.update();
  }
}

/** OrbitControls claims every touch (touch-action: none); give vertical
 *  swipes back to the page so a phone can still scroll past the TV. */
const letPageScroll = (el: HTMLElement) => {
  el.style.touchAction = "pan-y";
};

function Environment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => lightWithRoom(scene, gl), [gl, scene]);
  return null;
}

function Tv({
  gltf,
  playing,
  reducedMotion,
  onReady,
}: {
  gltf: GLTF;
  playing: boolean;
  reducedMotion: boolean;
  onReady: () => void;
}) {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const controls = useRef<Controls>(null);

  // the model's own bounds: what the camera frames
  const { center, radius } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    return { center: box.getCenter(new THREE.Vector3()), radius: box.getSize(new THREE.Vector3()).length() / 2 };
  }, [gltf]);

  // the clip behind the CRT shader; until it has a frame, the model's own
  // still frame stays on the screen
  const [video] = useState(screenVideo);
  const crt = useMemo(() => crtFor(video), [video]);
  const screens = useMemo(() => findScreens(gltf.scene), [gltf]);

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

  useEffect(() => frame(camera, controls.current, size, center, radius), [camera, size, center, radius]);
  useEffect(() => letPageScroll(gl.domElement), [gl]);
  useEffect(() => onReady(), [onReady]);

  useFrame((state) => tick(crt, state.clock.getElapsedTime()));

  return (
    <>
      <primitive object={gltf.scene} />
      <OrbitControls
        ref={controls}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={1.2}
        // a turntable: free all the way round, only a little tilt
        minPolarAngle={Math.PI / 2 - 0.45}
        maxPolarAngle={Math.PI / 2 + 0.1}
      />
    </>
  );
}

export function TvScene({
  running,
  reducedMotion,
  onReady,
}: {
  /** false while the section is off screen: no frames are drawn and the clip pauses */
  running: boolean;
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
      style={{ background: "transparent", cursor: "grab" }}
    >
      <Environment />
      <directionalLight position={[3, 4, -2]} intensity={1.4} color="#fff1e0" />
      {gltf ? <Tv gltf={gltf} playing={running} reducedMotion={reducedMotion} onReady={onReady} /> : null}
    </Canvas>
  );
}
