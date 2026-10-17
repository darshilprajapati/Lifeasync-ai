import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Physics-driven Interactive Lamp with Spring-animated Pull Cord     */
/* ------------------------------------------------------------------ */

interface LampSceneCanvasProps {
  isOn: boolean;
  onToggle: () => void;
  lampState: 'off' | 'turningOn' | 'on' | 'turningOff';
}

interface LampModelProps {
  isOn: boolean;
  onToggle: () => void;
  cordPullProgress: number;
  triggerPullCord: () => void;
}

function LampModel({ isOn, onToggle, cordPullProgress, triggerPullCord }: LampModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const downSpotRef = useRef<THREE.SpotLight>(null);
  const upSpotRef = useRef<THREE.SpotLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const floorPoolRef = useRef<THREE.Mesh>(null);
  const bulbRef = useRef<THREE.Mesh>(null);
  const cordGroupRef = useRef<THREE.Group>(null);

  const targetLight = useRef(isOn ? 1 : 0);

  useEffect(() => {
    targetLight.current = isOn ? 1 : 0;
  }, [isOn]);

  /* ------------------------------------------------------------------ */
  /* Materials: High-fidelity matte gunmetal, brass, & glowing fabric   */
  /* ------------------------------------------------------------------ */
  const darkGunmetalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1E1B1B'),
        metalness: 0.85,
        roughness: 0.25,
      }),
    []
  );

  const polishedBrassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#E0B35A'),
        metalness: 0.9,
        roughness: 0.18,
      }),
    []
  );

  const shadeOuterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(isOn ? '#FBE5C5' : '#221F1F'),
        roughness: 0.7,
        metalness: 0.05,
        emissive: new THREE.Color('#FF9B38'),
        emissiveIntensity: isOn ? 1.1 : 0,
        side: THREE.DoubleSide,
      }),
    [isOn]
  );

  const shadeInnerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(isOn ? '#FFF2D6' : '#141212'),
        emissive: new THREE.Color('#FFA840'),
        emissiveIntensity: isOn ? 1.6 : 0,
        roughness: 0.4,
        side: THREE.BackSide,
      }),
    [isOn]
  );

  const bulbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFF5E0'),
        emissive: new THREE.Color('#FFD27D'),
        emissiveIntensity: isOn ? 3.5 : 0.05,
        transparent: true,
        opacity: isOn ? 0.95 : 0.4,
      }),
    [isOn]
  );

  const cordMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#D8A856'),
        metalness: 0.8,
        roughness: 0.25,
      }),
    []
  );

  const floorPoolMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#FFAA4A'),
        transparent: true,
        opacity: isOn ? 0.38 : 0,
        depthWrite: false,
      }),
    [isOn]
  );

  /* ------------------------------------------------------------------ */
  /* Physics & Lighting Transition Loop                                 */
  /* ------------------------------------------------------------------ */
  useFrame((_state, delta) => {
    const lightLerpSpeed = 4.2;
    const t = targetLight.current;

    // Downward warm cone spotlight
    if (downSpotRef.current) {
      downSpotRef.current.intensity = THREE.MathUtils.lerp(
        downSpotRef.current.intensity,
        t * 5.8,
        delta * lightLerpSpeed
      );
    }

    // Upward soft ambient spotlight
    if (upSpotRef.current) {
      upSpotRef.current.intensity = THREE.MathUtils.lerp(
        upSpotRef.current.intensity,
        t * 1.8,
        delta * lightLerpSpeed
      );
    }

    // Omnidirectional point light inside shade
    if (pointLightRef.current) {
      pointLightRef.current.intensity = THREE.MathUtils.lerp(
        pointLightRef.current.intensity,
        t * 2.8,
        delta * lightLerpSpeed
      );
    }

    // Shade glowing material transitions
    if (shadeOuterMat) {
      shadeOuterMat.emissiveIntensity = THREE.MathUtils.lerp(
        shadeOuterMat.emissiveIntensity,
        t * 1.15,
        delta * lightLerpSpeed
      );
      shadeOuterMat.color.lerp(
        new THREE.Color(t > 0.5 ? '#FBE5C5' : '#221F1F'),
        delta * lightLerpSpeed
      );
    }

    if (shadeInnerMat) {
      shadeInnerMat.emissiveIntensity = THREE.MathUtils.lerp(
        shadeInnerMat.emissiveIntensity,
        t * 1.6,
        delta * lightLerpSpeed
      );
    }

    if (bulbMat) {
      bulbMat.emissiveIntensity = THREE.MathUtils.lerp(
        bulbMat.emissiveIntensity,
        t * 3.5,
        delta * lightLerpSpeed
      );
    }

    // Floor light pool transition
    if (floorPoolMat) {
      floorPoolMat.opacity = THREE.MathUtils.lerp(
        floorPoolMat.opacity,
        t * 0.38,
        delta * lightLerpSpeed
      );
    }

    // Cord pull displacement with spring damping
    if (cordGroupRef.current) {
      // cordPullProgress drives vertical stretch + subtle spring recoil
      const targetCordY = -cordPullProgress * 0.45;
      cordGroupRef.current.position.y = THREE.MathUtils.lerp(
        cordGroupRef.current.position.y,
        targetCordY,
        delta * 12
      );
    }

    // Micro head nod/bounce when cord is pulled
    if (groupRef.current) {
      const headDamp = cordPullProgress * 0.035;
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        headDamp,
        delta * 10
      );
    }
  });

  /* Lamp shade geometry: realistic tapered cone */
  const shadeGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.72, 1.38, 1.25, 48, 1, true);
  }, []);

  /* Cord Curve Geometry */
  const cordCurveGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.06, -0.4, 0.02),
      new THREE.Vector3(0.12, -0.9, 0.04),
      new THREE.Vector3(0.08, -1.35, 0.02),
    ]);
    return new THREE.TubeGeometry(curve, 24, 0.018, 8, false);
  }, []);

  const handleCordClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    triggerPullCord();
    onToggle();
  };

  const handleLampClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    triggerPullCord();
    onToggle();
  };

  return (
    <group ref={groupRef} position={[0, -2.1, 0]}>
      {/* ------------------------------------------------------------- */}
      {/* BASE: Heavy stepped circular base with brass accent ring      */}
      {/* ------------------------------------------------------------- */}
      <group onClick={handleLampClick}>
        <mesh position={[0, 0.06, 0]} material={darkGunmetalMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.95, 1.05, 0.12, 48]} />
        </mesh>

        <mesh position={[0, 0.13, 0]} material={polishedBrassMat} castShadow>
          <torusGeometry args={[0.96, 0.028, 16, 48]} />
        </mesh>

        <mesh position={[0, 0.16, 0]} material={darkGunmetalMat} castShadow>
          <cylinderGeometry args={[0.34, 0.44, 0.08, 36]} />
        </mesh>

        <mesh position={[0, 0.22, 0]} material={polishedBrassMat} castShadow>
          <cylinderGeometry args={[0.13, 0.17, 0.06, 32]} />
        </mesh>

        {/* ------------------------------------------------------------- */}
        {/* POLE: Slender central stem with brass decorative joinery      */}
        {/* ------------------------------------------------------------- */}
        {/* Lower pole */}
        <mesh position={[0, 1.2, 0]} material={darkGunmetalMat} castShadow>
          <cylinderGeometry args={[0.065, 0.065, 1.9, 24]} />
        </mesh>

        {/* Middle decorative brass junction ring */}
        <mesh position={[0, 2.15, 0]} material={polishedBrassMat} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.12, 24]} />
        </mesh>

        {/* Upper pole */}
        <mesh position={[0, 2.9, 0]} material={darkGunmetalMat} castShadow>
          <cylinderGeometry args={[0.065, 0.065, 1.4, 24]} />
        </mesh>

        {/* Neck connector collar */}
        <mesh position={[0, 3.65, 0]} material={polishedBrassMat} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.14, 24]} />
        </mesh>

        {/* Socket cup / mounting bell under shade */}
        <mesh position={[0, 3.8, 0]} material={polishedBrassMat} castShadow>
          <sphereGeometry args={[0.26, 24, 24]} />
        </mesh>

        {/* ------------------------------------------------------------- */}
        {/* SHADE & BULB: Tapered conical shade with warm interior glow   */}
        {/* ------------------------------------------------------------- */}
        <group position={[0, 4.35, 0]}>
          {/* Outer shade surface */}
          <mesh geometry={shadeGeometry} material={shadeOuterMat} castShadow position={[0, 0, 0]} />

          {/* Inner reflective shade surface */}
          <mesh geometry={shadeGeometry} material={shadeInnerMat} position={[0, 0, 0]} />

          {/* Top brass rim */}
          <mesh position={[0, 0.62, 0]} material={polishedBrassMat}>
            <torusGeometry args={[0.73, 0.022, 12, 48]} />
          </mesh>

          {/* Bottom brass rim */}
          <mesh position={[0, -0.62, 0]} material={polishedBrassMat}>
            <torusGeometry args={[1.39, 0.025, 12, 48]} />
          </mesh>

          {/* Internal light bulb */}
          <mesh ref={bulbRef} position={[0, -0.15, 0]} material={bulbMat}>
            <sphereGeometry args={[0.22, 24, 24]} />
          </mesh>

          {/* Omnidirectional warm point light inside shade */}
          <pointLight
            ref={pointLightRef}
            position={[0, -0.25, 0]}
            color="#FFD699"
            intensity={0}
            distance={16}
            decay={2}
          />

          {/* Downward focused cone of light illuminating the room */}
          <spotLight
            ref={downSpotRef}
            position={[0, -0.3, 0]}
            target-position={[0, -5.5, 0]}
            color="#FFE5B4"
            intensity={0}
            angle={Math.PI / 2.7}
            penumbra={0.75}
            distance={18}
            decay={2}
            castShadow
          />

          {/* Upward gentle ceiling wash */}
          <spotLight
            ref={upSpotRef}
            position={[0, 0.65, 0]}
            target-position={[0, 5, 0]}
            color="#FFA840"
            intensity={0}
            angle={Math.PI / 3.5}
            penumbra={0.8}
            distance={12}
            decay={2}
          />
        </group>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* PULL CORD: Hanging chain with brass tassel & physics pull     */}
      {/* ------------------------------------------------------------- */}
      <group
        ref={cordGroupRef}
        position={[0.34, 3.82, 0.08]}
        onClick={handleCordClick}
      >
        {/* Flexible pull cord line */}
        <mesh geometry={cordCurveGeo} material={cordMat} />

        {/* Turned brass pull tassel at end of cord */}
        <group position={[0.08, -1.35, 0.02]}>
          {/* Tassel top bead */}
          <mesh material={polishedBrassMat} castShadow>
            <sphereGeometry args={[0.045, 16, 16]} />
          </mesh>
          {/* Tassel central cylinder */}
          <mesh position={[0, -0.1, 0]} material={polishedBrassMat} castShadow>
            <cylinderGeometry args={[0.035, 0.042, 0.16, 20]} />
          </mesh>
          {/* Tassel lower droplet */}
          <mesh position={[0, -0.2, 0]} material={polishedBrassMat} castShadow>
            <coneGeometry args={[0.042, 0.1, 20]} />
          </mesh>
        </group>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* FLOOR LIGHT POOL: Realistic illuminated ellipse beneath lamp   */}
      {/* ------------------------------------------------------------- */}
      <mesh
        ref={floorPoolRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        material={floorPoolMat}
      >
        <circleGeometry args={[2.8, 48]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Desk Floor Surface                                                 */
/* ------------------------------------------------------------------ */
function FloorSurface({ isOn }: { isOn: boolean }) {
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(isOn ? '#78231B' : '#100D0C'),
        roughness: 0.9,
        metalness: 0.1,
      }),
    [isOn]
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.12, 0]} receiveShadow material={floorMat}>
      <planeGeometry args={[35, 35]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Ambient Dust Motes in the Warm Light Beam                          */
/* ------------------------------------------------------------------ */
function LightMotes({ isOn }: { isOn: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { posArray } = useMemo(() => {
    const count = 75;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 5;
      arr[i * 3 + 1] = Math.random() * 5.5 - 1.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return { posArray: arr };
  }, []);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, isOn ? 0.35 : 0, delta * 3);

    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    if (posAttr) {
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] += delta * 0.05;
        if (arr[i * 3 + 1] > 3.8) {
          arr[i * 3 + 1] = -1.5;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posArray, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#FFE5B4"
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Main Three.js Scene Canvas Component                               */
/* ------------------------------------------------------------------ */
const LampSceneCanvas: React.FC<LampSceneCanvasProps> = ({ isOn, onToggle }) => {
  const [dpr, setDpr] = useState(1);
  const [cordPullProgress, setCordPullProgress] = useState(0);

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, 2));
  }, []);

  // Cord pull spring trigger: pulls down and springs back smoothly
  const triggerPullCord = () => {
    setCordPullProgress(1);
    const start = performance.now();
    const duration = 480;

    const animatePull = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      // Damped spring response
      const value = Math.cos(progress * Math.PI * 2.5) * (1 - progress);
      setCordPullProgress(Math.max(0, value));

      if (progress < 1) {
        requestAnimationFrame(animatePull);
      } else {
        setCordPullProgress(0);
      }
    };

    requestAnimationFrame(animatePull);
  };

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return (
    <Canvas
      dpr={dpr}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ position: [0, 0.4, 7.2], fov: 42, near: 0.1, far: 50 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      aria-label="Interactive 3D standing lamp. Click lamp or pull the cord to toggle illumination."
      role="img"
    >
      {/* Ambient lighting adapts smoothly between illuminated state and dark room */}
      <ambientLight intensity={isOn ? 0.45 : 0.08} color={isOn ? '#FFEFEA' : '#3D3535'} />

      {/* Gentle directional fill */}
      <directionalLight
        position={[3, 5, 4]}
        intensity={isOn ? 0.7 : 0.12}
        color={isOn ? '#FFF5EE' : '#685D5D'}
      />

      {/* 3D Lamp with Articulated Parts & Pull Cord */}
      <LampModel
        isOn={isOn}
        onToggle={onToggle}
        cordPullProgress={cordPullProgress}
        triggerPullCord={triggerPullCord}
      />

      {/* Light Motes */}
      {!prefersReducedMotion && <LightMotes isOn={isOn} />}

      {/* Floor plane */}
      <FloorSurface isOn={isOn} />
    </Canvas>
  );
};

export default LampSceneCanvas;
