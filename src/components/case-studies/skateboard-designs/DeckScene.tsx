"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useSpring, type MotionValue } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { SkateDeck } from "@/content/projects/skateboard-designs";

import { CAMERA_DISTANCE, DeckLights, dressDeck, FOV, loadModel, loadPrint, setOpacity, shadowTexture, type DressedDeck } from "./deckModel";

/**
 * The decks, in 3D, over the wall. One canvas the size of the stage; world
 * units are stage heights (see deckModel), so a deck placed in the plate's
 * fractions lands on the rails exactly where the wall's DOM hit areas and
 * labels are.
 *
 * Every deck is the shared model wearing its own print and edge colour.
 * Hover (from the DOM, which owns the pointer): the deck comes off the wall
 * towards the camera, grows a touch and tilts after the pointer — real
 * depth, so the wood grain and the edge catch the light as it turns. A deck
 * picked for the close-up (DeckInspect) is hidden here while it is away.
 */

/** Hover feel: lift off the wall (world units = stage heights) and growth; the tilt (degrees) comes from the DOM. */
const LIFT = 0.06;
const HOVER_SCALE = 1.03;
/** Settles in ≈300ms with no visible bounce. */
const LIFT_SPRING = { stiffness: 260, damping: 27, mass: 1 } as const;
/** Pointer tracking: soft and damped, never twitchy. */
const TILT_SPRING = { stiffness: 140, damping: 22, mass: 0.7 } as const;
const FADE_S = 0.5;

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
  /** away in the close-up: not drawn here */
  hidden: boolean;
  /** degrees, from the DOM pointer handlers (see DeckWall) */
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
};

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
  const invalidate = useThree((s) => s.invalidate);
  const group = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const [dressed, setDressed] = useState<DressedDeck | null>(null);
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

  // shown/hidden outside the frame loop, so it holds even while the loop is stopped
  useEffect(() => {
    if (group.current) group.current.visible = !slot.hidden;
    if (shadowRef.current) shadowRef.current.visible = !slot.hidden;
    invalidate();
  }, [slot.hidden, invalidate]);

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

export function DeckScene({
  slots,
  layout,
  reducedMotion,
  running,
}: {
  slots: DeckSlot[];
  layout: DeckLayout;
  reducedMotion: boolean;
  /** false while the wall is off screen or behind the close-up: the frame loop stops */
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
      <DeckLights />
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
