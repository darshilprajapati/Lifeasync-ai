import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Desk Lamp 3D Model — Articulated brass/gunmetal desk lamp          */
/* ------------------------------------------------------------------ */

interface LampModelProps {
  isOn: boolean;
  onToggle: () => void;
}

function LampModel({ isOn, onToggle }: LampModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const bulbRef = useRef<THREE.Mesh>(null);
  const targetIntensity = useRef(isOn ? 1 : 0);

  useEffect(() => {
    targetIntensity.current = isOn ? 1 : 0;
  }, [isOn]);

  /* Premium Materials */
  const bodyMetalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#2C2A29'),
        metalness: 0.75,
        roughness: 0.28,
      }),
    []
  );

  const brassAccentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#E5B365'),
        metalness: 0.85,
        roughness: 0.22,
      }),
    []
  );

  const shadeExteriorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#242222'),
        metalness: 0.5,
        roughness: 0.4,
        side: THREE.DoubleSide,
      }),
    []
  );

  const shadeInteriorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFDF9E'),
        metalness: 0.1,
        roughness: 0.7,
        emissive: new THREE.Color('#FFA64D'),
        emissiveIntensity: 0,
        side: THREE.BackSide,
      }),
    []
  );

  const bulbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFF1D0'),
        emissive: new THREE.Color('#FFD175'),
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0.92,
      }),
    []
  );

  /* Animation loop for smooth light transitions & gentle idle float */
  useFrame((_state, delta) => {
    const speed = 4.0;
    const t = targetIntensity.current;

    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        t * 2.8,
        delta * speed
      );
    }
    if (spotRef.current) {
      spotRef.current.intensity = THREE.MathUtils.lerp(
        spotRef.current.intensity,
        t * 4.5,
        delta * speed
      );
    }
    if (bulbMat) {
      bulbMat.emissiveIntensity = THREE.MathUtils.lerp(
        bulbMat.emissiveIntensity,
        t * 3.5,
        delta * speed
      );
      bulbMat.opacity = THREE.MathUtils.lerp(
        bulbMat.opacity,
        t > 0.5 ? 1.0 : 0.35,
        delta * speed
      );
    }
    if (shadeInteriorMat) {
      shadeInteriorMat.emissiveIntensity = THREE.MathUtils.lerp(
        shadeInteriorMat.emissiveIntensity,
        t * 1.4,
        delta * speed
      );
    }

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(Date.now() * 0.0006) * 0.025;
    }
  });

  const shadeGeo = useMemo(() => {
    return new THREE.CylinderGeometry(0.7, 1.5, 1.1, 32, 1, true);
  }, []);

  return (
    <group
      ref={groupRef}
      position={[-0.1, -1.9, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {/* Heavy Beveled Circular Base */}
      <mesh position={[0, 0, 0]} material={bodyMetalMat} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.25, 0.16, 36]} />
      </mesh>

      {/* Brass decorative base ring */}
      <mesh position={[0, 0.08, 0]} material={brassAccentMat}>
        <torusGeometry args={[1.18, 0.035, 12, 36]} />
      </mesh>

      {/* Base Toggle Switch (interactive click spot) */}
      <mesh position={[0.6, 0.12, 0.4]} material={brassAccentMat} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.12, 16]} />
      </mesh>
      <mesh position={[0.6, 0.22, 0.4]} material={isOn ? brassAccentMat : bodyMetalMat}>
        <sphereGeometry args={[0.06, 12, 12]} />
      </mesh>

      {/* Lower Joint Sphere */}
      <mesh position={[0, 0.22, 0]} material={brassAccentMat} castShadow>
        <sphereGeometry args={[0.16, 18, 18]} />
      </mesh>

      {/* Lower Arm (Twin Rods) */}
      <group position={[0, 0.22, 0]} rotation={[0, 0, -0.18]}>
        <mesh position={[-0.08, 1.1, 0]} material={bodyMetalMat} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.2, 16]} />
        </mesh>
        <mesh position={[0.08, 1.1, 0]} material={bodyMetalMat} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.2, 16]} />
        </mesh>

        {/* Mid Joint Brass Assembly */}
        <mesh position={[0, 2.2, 0]} material={brassAccentMat} castShadow>
          <sphereGeometry args={[0.15, 18, 18]} />
        </mesh>
        <mesh position={[0, 2.2, 0]} rotation={[0, 0, Math.PI / 2]} material={brassAccentMat}>
          <cylinderGeometry args={[0.08, 0.08, 0.32, 16]} />
        </mesh>

        {/* Upper Arm */}
        <group position={[0, 2.2, 0]} rotation={[0, 0, 0.52]}>
          <mesh position={[-0.06, 0.9, 0]} material={bodyMetalMat} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 1.8, 16]} />
          </mesh>
          <mesh position={[0.06, 0.9, 0]} material={bodyMetalMat} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 1.8, 16]} />
          </mesh>

          {/* Head Joint */}
          <mesh position={[0, 1.8, 0]} material={brassAccentMat} castShadow>
            <sphereGeometry args={[0.13, 16, 16]} />
          </mesh>

          {/* Lamp Shade & Light Assembly */}
          <group position={[0, 1.85, 0]} rotation={[0.2, 0, 0]}>
            {/* Outer shade */}
            <mesh geometry={shadeGeo} material={shadeExteriorMat} castShadow position={[0, -0.3, 0]} />
            {/* Inner reflective shade */}
            <mesh geometry={shadeGeo} material={shadeInteriorMat} position={[0, -0.3, 0]} />

            {/* Brass Top Shade Ring */}
            <mesh position={[0, 0.25, 0]} material={brassAccentMat}>
              <torusGeometry args={[0.7, 0.03, 12, 32]} />
            </mesh>

            {/* Light bulb */}
            <mesh ref={bulbRef} position={[0, -0.22, 0]} material={bulbMat}>
              <sphereGeometry args={[0.19, 20, 20]} />
            </mesh>

            {/* Point light for local omni warmth */}
            <pointLight
              ref={lightRef}
              position={[0, -0.4, 0]}
              color="#FFE1A8"
              intensity={0}
              distance={14}
              decay={2}
              castShadow
            />

            {/* Spot light for dramatic down-cone illumination */}
            <spotLight
              ref={spotRef}
              position={[0, -0.25, 0]}
              target-position={[0, -5, 0]}
              color="#FFD699"
              intensity={0}
              angle={Math.PI / 3.2}
              penumbra={0.75}
              distance={16}
              decay={2}
              castShadow
            />
          </group>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Wellness Orbital Elements (Health, Productivity, Security, etc.)    */
/* ------------------------------------------------------------------ */

interface WellnessOrbitalsProps {
  isOn: boolean;
}

function WellnessOrbitals({ isOn }: WellnessOrbitalsProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 5 Orbitals corresponding to LifeSync AI core domains:
  // 1: Health & Fitness (#FF6B6B)
  // 2: Productivity & Energy (#FFD166)
  // 3: Security & Vault (#64DFDF)
  // 4: Schedule & Habits (#EE9B00)
  // 5: Financial Health (#06D6A0)
  const nodes = useMemo(
    () => [
      { radius: 2.2, speed: 0.6, yOffset: 0.4, size: 0.22, color: '#FFF0D4', glow: '#FF6B6B' },
      { radius: 2.7, speed: -0.45, yOffset: 1.2, size: 0.18, color: '#FFF8E1', glow: '#FFD166' },
      { radius: 2.4, speed: 0.5, yOffset: -0.5, size: 0.2, color: '#E0F7FA', glow: '#64DFDF' },
      { radius: 3.1, speed: -0.35, yOffset: 0.8, size: 0.19, color: '#FFE0B2', glow: '#EE9B00' },
      { radius: 2.8, speed: 0.4, yOffset: -0.2, size: 0.17, color: '#E8F5E9', glow: '#06D6A0' },
    ],
    []
  );

  const materials = useMemo(
    () =>
      nodes.map(
        (n) =>
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(n.color),
            emissive: new THREE.Color(n.glow),
            emissiveIntensity: isOn ? 1.5 : 0.4,
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85,
          })
      ),
    [nodes, isOn]
  );

  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#FFFFFF'),
        transparent: true,
        opacity: isOn ? 0.22 : 0.08,
      }),
    [isOn]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    groupRef.current.children.forEach((child, index) => {
      const node = nodes[index];
      if (node && child instanceof THREE.Group) {
        const angle = time * node.speed;
        child.position.x = Math.cos(angle) * node.radius - 0.2;
        child.position.z = Math.sin(angle) * (node.radius * 0.7);
        child.position.y = node.yOffset + Math.sin(time * 1.5 + index) * 0.18;
        child.rotation.y += delta * 0.8;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <group key={i}>
          {/* Central Glowing Wellness Orb */}
          <mesh material={materials[i]} castShadow>
            <sphereGeometry args={[node.size, 20, 20]} />
          </mesh>
          {/* Subtle Delicate Orbital Ring */}
          <mesh material={ringMat} rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[node.size * 1.7, 0.012, 12, 32]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Desk Surface Plate                                                 */
/* ------------------------------------------------------------------ */

function DeskSurface() {
  const surfaceMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#8F281E'),
        roughness: 0.85,
        metalness: 0.1,
      }),
    []
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.82, 0]} receiveShadow material={surfaceMat}>
      <planeGeometry args={[30, 30]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Warm Atmospheric Dust Particles                                    */
/* ------------------------------------------------------------------ */

function AmbientDust({ isOn }: { isOn: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { posArray } = useMemo(() => {
    const count = 90;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = Math.random() * 6 - 1.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return { posArray: arr };
  }, []);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    const targetOpacity = isOn ? 0.45 : 0.1;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 2);

    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    if (posAttr) {
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] += delta * 0.06;
        if (arr[i * 3 + 1] > 4.5) {
          arr[i * 3 + 1] = -1.5;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[posArray, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#FFF3D6"
        transparent
        opacity={0.15}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Main Three.js Lamp Scene Canvas                                    */
/* ------------------------------------------------------------------ */

interface LampSceneCanvasProps {
  isOn: boolean;
  onToggle: () => void;
}

const LampSceneCanvas: React.FC<LampSceneCanvasProps> = ({ isOn, onToggle }) => {
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, 2));
  }, []);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return (
    <Canvas
      dpr={dpr}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ position: [0.3, 0.4, 7.5], fov: 40, near: 0.1, far: 50 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      aria-label="Interactive 3D desk lamp and wellness constellation. Click to toggle warm illumination."
      role="img"
    >
      {/* Balanced ambient light allowing the coral-red backdrop to harmonize */}
      <ambientLight intensity={0.35} color="#FFE6DF" />

      {/* Gentle directional fill */}
      <directionalLight
        position={[4, 6, 4]}
        intensity={0.65}
        color="#FFF4EE"
      />

      {/* 3D Lamp */}
      <LampModel isOn={isOn} onToggle={onToggle} />

      {/* Floating Wellness Nodes */}
      {!prefersReducedMotion && <WellnessOrbitals isOn={isOn} />}

      {/* Ambient floating dust motes */}
      {!prefersReducedMotion && <AmbientDust isOn={isOn} />}

      {/* Ground plane for realistic depth */}
      <DeskSurface />
    </Canvas>
  );
};

export default LampSceneCanvas;
