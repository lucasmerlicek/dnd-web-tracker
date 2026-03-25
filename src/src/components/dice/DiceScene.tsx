"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, useSphere, useBox } from "@react-three/cannon";
import * as THREE from "three";
import type { DieSpec } from "@/types";

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function createD10Geometry(): THREE.BufferGeometry {
  // Pentagonal trapezohedron approximation using two pentagonal pyramids
  const top = 0.7;
  const bot = -0.7;
  const mid = 0.15;
  const r = 0.65;
  const verts: number[] = [];
  const indices: number[] = [];

  // 5 upper-ring vertices, 5 lower-ring vertices, 1 top, 1 bottom
  const upperRing: THREE.Vector3[] = [];
  const lowerRing: THREE.Vector3[] = [];

  for (let i = 0; i < 5; i++) {
    const aUp = (i / 5) * Math.PI * 2;
    const aLo = ((i + 0.5) / 5) * Math.PI * 2;
    upperRing.push(new THREE.Vector3(Math.cos(aUp) * r, mid, Math.sin(aUp) * r));
    lowerRing.push(new THREE.Vector3(Math.cos(aLo) * r, -mid, Math.sin(aLo) * r));
  }

  const topV = new THREE.Vector3(0, top, 0);
  const botV = new THREE.Vector3(0, bot, 0);

  // Indices: 0-4 upper, 5-9 lower, 10 top, 11 bottom
  const allVerts = [...upperRing, ...lowerRing, topV, botV];
  allVerts.forEach((v) => verts.push(v.x, v.y, v.z));

  for (let i = 0; i < 5; i++) {
    const next = (i + 1) % 5;
    // Upper triangles (top cap)
    indices.push(10, i, next);
    // Upper-to-lower kite faces
    indices.push(i, i + 5, next);
    indices.push(next, i + 5, ((i + 1) % 5) + 5);
    // Lower triangles (bottom cap)
    indices.push(11, ((i + 1) % 5) + 5, i + 5);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const GEOMETRIES: Record<number, () => THREE.BufferGeometry> = {
  4: () => new THREE.TetrahedronGeometry(0.55),
  6: () => new THREE.BoxGeometry(0.7, 0.7, 0.7),
  8: () => new THREE.OctahedronGeometry(0.55),
  10: () => createD10Geometry(),
  12: () => new THREE.DodecahedronGeometry(0.55),
  20: () => new THREE.IcosahedronGeometry(0.55),
};


/* ------------------------------------------------------------------ */
/*  Dark metal material                                                */
/* ------------------------------------------------------------------ */

const DICE_MATERIAL_PROPS = {
  color: "#3a3a3a",
  metalness: 0.7,
  roughness: 0.45,
  envMapIntensity: 0.6,
};

/* ------------------------------------------------------------------ */
/*  Single Die mesh with physics                                       */
/* ------------------------------------------------------------------ */

interface DieProps {
  sides: number;
  index: number;
  totalDice: number;
}

function Die({ sides, index, totalDice }: DieProps) {
  const geometry = useMemo(() => {
    const factory = GEOMETRIES[sides] ?? GEOMETRIES[20];
    return factory();
  }, [sides]);

  // Spread dice horizontally so they don't overlap
  const startX = useMemo(() => {
    const spread = Math.min(totalDice - 1, 4) * 1.2;
    return -spread / 2 + index * 1.2 + (Math.random() - 0.5) * 0.3;
  }, [index, totalDice]);

  const startY = useMemo(() => 4 + Math.random() * 2, []);
  const startZ = useMemo(() => (Math.random() - 0.5) * 0.8, []);

  // Random initial velocity and spin
  const initialVelocity = useMemo<[number, number, number]>(
    () => [(Math.random() - 0.5) * 3, -(Math.random() * 2 + 2), (Math.random() - 0.5) * 3],
    []
  );
  const initialSpin = useMemo<[number, number, number]>(
    () => [
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
    ],
    []
  );

  // Use sphere collider as a simple approximation for all polyhedra
  const [ref] = useSphere(() => ({
    mass: 1,
    position: [startX, startY, startZ] as [number, number, number],
    velocity: initialVelocity,
    angularVelocity: initialSpin,
    args: [0.45],
    linearDamping: 0.3,
    angularDamping: 0.3,
    material: { friction: 0.6, restitution: 0.35 },
  }));

  return (
    <mesh ref={ref as React.Ref<THREE.Mesh>} geometry={geometry} castShadow>
      <meshStandardMaterial {...DICE_MATERIAL_PROPS} />
    </mesh>
  );
}


/* ------------------------------------------------------------------ */
/*  Ground plane                                                       */
/* ------------------------------------------------------------------ */

function Ground() {
  const [ref] = useBox(() => ({
    type: "Static" as const,
    position: [0, -1, 0] as [number, number, number],
    args: [20, 0.5, 20],
    material: { friction: 0.8, restitution: 0.2 },
  }));

  return (
    <mesh ref={ref as React.Ref<THREE.Mesh>} receiveShadow>
      <boxGeometry args={[20, 0.5, 20]} />
      <meshStandardMaterial color="#1a1a1a" transparent opacity={0} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Invisible walls to keep dice in view                               */
/* ------------------------------------------------------------------ */

function Walls() {
  const wallArgs: [number, number, number] = [0.5, 10, 20];
  const frontBackArgs: [number, number, number] = [20, 10, 0.5];

  const [leftRef] = useBox(() => ({
    type: "Static" as const,
    position: [-5, 3, 0] as [number, number, number],
    args: wallArgs,
  }));
  const [rightRef] = useBox(() => ({
    type: "Static" as const,
    position: [5, 3, 0] as [number, number, number],
    args: wallArgs,
  }));
  const [backRef] = useBox(() => ({
    type: "Static" as const,
    position: [0, 3, -4] as [number, number, number],
    args: frontBackArgs,
  }));
  const [frontRef] = useBox(() => ({
    type: "Static" as const,
    position: [0, 3, 4] as [number, number, number],
    args: frontBackArgs,
  }));

  return (
    <>
      <mesh ref={leftRef as React.Ref<THREE.Mesh>}><boxGeometry args={wallArgs} /><meshBasicMaterial visible={false} /></mesh>
      <mesh ref={rightRef as React.Ref<THREE.Mesh>}><boxGeometry args={wallArgs} /><meshBasicMaterial visible={false} /></mesh>
      <mesh ref={backRef as React.Ref<THREE.Mesh>}><boxGeometry args={frontBackArgs} /><meshBasicMaterial visible={false} /></mesh>
      <mesh ref={frontRef as React.Ref<THREE.Mesh>}><boxGeometry args={frontBackArgs} /><meshBasicMaterial visible={false} /></mesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported DiceScene                                                 */
/* ------------------------------------------------------------------ */

export interface DiceSceneProps {
  dice: DieSpec[];
}

export default function DiceScene({ dice }: DiceSceneProps) {
  // Flatten DieSpec[] into individual die entries
  const dieEntries = useMemo(() => {
    const entries: { sides: number; key: string }[] = [];
    dice.forEach((spec, si) => {
      for (let i = 0; i < spec.count; i++) {
        entries.push({ sides: spec.sides, key: `${si}-${i}` });
      }
    });
    return entries;
  }, [dice]);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 6, 5], fov: 45, near: 0.1, far: 50 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ alpha: true }}
    >
      {/* Lighting for dark metal aesthetic */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[3, 8, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-3, 5, -2]} intensity={0.4} color="#8888aa" />

      <Physics
        gravity={[0, -15, 0]}
        defaultContactMaterial={{ friction: 0.6, restitution: 0.3 }}
      >
        <Ground />
        <Walls />
        {dieEntries.map((entry, idx) => (
          <Die
            key={entry.key}
            sides={entry.sides}
            index={idx}
            totalDice={dieEntries.length}
          />
        ))}
      </Physics>
    </Canvas>
  );
}
