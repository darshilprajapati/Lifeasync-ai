import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Physics-driven Interactive Three.js Lamp with Genuine Pull Cord    */
/* Proportions reduced by ~30%, no clipping, no decorative rings      */
/* ------------------------------------------------------------------ */

interface LampSceneCanvasProps {
  isOn: boolean;
  onToggle: () => void;
  lampState: 'off' | 'turningOn' | 'on' | 'turningOff';
}

interface LampModelProps {
  isOn: boolean;
  onToggle: () => void;
}

function LampModel({ isOn, onToggle }: LampModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shadeGroupRef = useRef<THREE.Group>(null);
  const downSpotRef = useRef<THREE.SpotLight>(null);
  const upSpotRef = useRef<THREE.SpotLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const floorPoolRef = useRef<THREE.Mesh>(null);
  const bulbRef = useRef<THREE.Mesh>(null);
  const cordMeshRef = useRef<THREE.Mesh>(null);
  const handleGroupRef = useRef<THREE.Group>(null);

  // Hover & Drag state for visual feedback
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [isHandleGrabbed, setIsHandleGrabbed] = useState(false);

  // Target lighting state lerp
  const targetLight = useRef(isOn ? 1 : 0);
  useEffect(() => {
    targetLight.current = isOn ? 1 : 0;
  }, [isOn]);

  // Pull Cord Physics & Drag Interaction State
  const isDragging = useRef(false);
  const startScreenY = useRef(0);
  const startScreenX = useRef(0);
  const pointerDownTime = useRef(0);
  const pullDistance = useRef(0); // 0 to 0.42 units
  const pullSwing = useRef(0); // -0.15 to 0.15 units
  const pullVelY = useRef(0);
  const pullVelX = useRef(0);
  const hasTriggeredToggle = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Materials: High-fidelity matte gunmetal, brass, & glowing fabric   */
  /* ------------------------------------------------------------------ */
  const darkGunmetalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1B1818'),
        metalness: 0.85,
        roughness: 0.26,
      }),
    []
  );

  const polishedBrassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#DFB052'),
        metalness: 0.92,
        roughness: 0.16,
      }),
    []
  );

  const handleBrassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(isHandleGrabbed ? '#FFE28A' : isHandleHovered ? '#F0C265' : '#DFB052'),
        emissive: new THREE.Color('#E5B869'),
        emissiveIntensity: isHandleGrabbed ? 0.6 : isHandleHovered ? 0.35 : 0.08,
        metalness: 0.92,
        roughness: 0.14,
      }),
    [isHandleHovered, isHandleGrabbed]
  );

  const shadeOuterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(isOn ? '#FCE6C4' : '#221F1F'),
        roughness: 0.72,
        metalness: 0.04,
        emissive: new THREE.Color('#FF9630'),
        emissiveIntensity: isOn ? 1.15 : 0,
        side: THREE.DoubleSide,
      }),
    [isOn]
  );

  const shadeInnerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(isOn ? '#FFF3D8' : '#141212'),
        emissive: new THREE.Color('#FFA63C'),
        emissiveIntensity: isOn ? 1.6 : 0,
        roughness: 0.38,
        side: THREE.BackSide,
      }),
    [isOn]
  );

  const bulbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFF5E0'),
        emissive: new THREE.Color('#FFD27D'),
        emissiveIntensity: isOn ? 3.6 : 0.05,
        transparent: true,
        opacity: isOn ? 0.95 : 0.45,
      }),
    [isOn]
  );

  const cordMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#D8A856'),
        metalness: 0.82,
        roughness: 0.24,
      }),
    []
  );

  const floorPoolMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#FFA845'),
        transparent: true,
        opacity: isOn ? 0.36 : 0,
        depthWrite: false,
      }),
    [isOn]
  );

  /* ------------------------------------------------------------------ */
  /* Cord Geometry & Curve Definition                                   */
  /* ------------------------------------------------------------------ */
  // Cord attaches neatly under the shade rim on the right side
  const cordAttachX = 0.22;
  const cordAttachY = 2.36;
  const cordAttachZ = 0.12;
  const cordRestBottomY = 1.48;

  const initialCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(cordAttachX, cordAttachY, cordAttachZ),
      new THREE.Vector3(cordAttachX + 0.03, cordAttachY - 0.28, cordAttachZ + 0.01),
      new THREE.Vector3(cordAttachX + 0.05, cordAttachY - 0.60, cordAttachZ + 0.02),
      new THREE.Vector3(cordAttachX + 0.01, cordRestBottomY, cordAttachZ),
    ]);
  }, []);

  const initialTubeGeo = useMemo(() => {
    return new THREE.TubeGeometry(initialCurve, 18, 0.013, 8, false);
  }, [initialCurve]);

  /* ------------------------------------------------------------------ */
  /* Physics Loop & Animation                                           */
  /* ------------------------------------------------------------------ */
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.04);
    const lightLerpSpeed = 4.2;
    const t = targetLight.current;

    // 1. Lighting Interpolation
    if (downSpotRef.current) {
      downSpotRef.current.intensity = THREE.MathUtils.lerp(
        downSpotRef.current.intensity,
        t * 5.8,
        delta * lightLerpSpeed
      );
    }
    if (upSpotRef.current) {
      upSpotRef.current.intensity = THREE.MathUtils.lerp(
        upSpotRef.current.intensity,
        t * 1.8,
        delta * lightLerpSpeed
      );
    }
    if (pointLightRef.current) {
      pointLightRef.current.intensity = THREE.MathUtils.lerp(
        pointLightRef.current.intensity,
        t * 2.8,
        delta * lightLerpSpeed
      );
    }

    if (shadeOuterMat) {
      shadeOuterMat.emissiveIntensity = THREE.MathUtils.lerp(
        shadeOuterMat.emissiveIntensity,
        t * 1.15,
        delta * lightLerpSpeed
      );
      shadeOuterMat.color.lerp(
        new THREE.Color(t > 0.5 ? '#FCE6C4' : '#221F1F'),
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
        t * 3.6,
        delta * lightLerpSpeed
      );
    }
    if (floorPoolMat) {
      floorPoolMat.opacity = THREE.MathUtils.lerp(
        floorPoolMat.opacity,
        t * 0.36,
        delta * lightLerpSpeed
      );
    }

    // 2. Damped Spring Physics for Pull Cord
    if (!isDragging.current) {
      const k = 195; // Spring stiffness
      const c = 14;  // Damping coefficient

      // Vertical spring
      const forceY = -k * pullDistance.current - c * pullVelY.current;
      pullVelY.current += forceY * dt;
      pullDistance.current += pullVelY.current * dt;

      // Horizontal swing spring
      const forceX = -k * pullSwing.current - c * pullVelX.current;
      pullVelX.current += forceX * dt;
      pullSwing.current += pullVelX.current * dt;

      // Rest snap
      if (Math.abs(pullDistance.current) < 0.001 && Math.abs(pullVelY.current) < 0.005) {
        pullDistance.current = 0;
        pullVelY.current = 0;
      }
      if (Math.abs(pullSwing.current) < 0.001 && Math.abs(pullVelX.current) < 0.005) {
        pullSwing.current = 0;
        pullVelX.current = 0;
      }
    }

    const currentDist = pullDistance.current;
    const currentSwing = pullSwing.current;

    // 3. Mechanical Reaction on Lamp Arm & Shade
    if (shadeGroupRef.current) {
      const nodAngle = currentDist * 0.05;
      shadeGroupRef.current.rotation.z = -nodAngle;
      shadeGroupRef.current.position.y = 2.75 - nodAngle * 0.25;
    }

    // 4. Update 3D Cord Geometry Curve and Handle Position
    if (cordMeshRef.current && handleGroupRef.current) {
      const pTopY = cordAttachY - currentDist * 0.02;
      const pBottomY = cordRestBottomY - currentDist;
      const pBottomX = cordAttachX + currentSwing;

      // Under tension, the curve straightens naturally
      const tensionStraighten = THREE.MathUtils.clamp(currentDist * 2.5, 0, 0.85);
      const midBulge = 1 - tensionStraighten;

      const dynamicCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cordAttachX, pTopY, cordAttachZ),
        new THREE.Vector3(
          cordAttachX + currentSwing * 0.25 + 0.03 * midBulge,
          pTopY - (pTopY - pBottomY) * 0.35,
          cordAttachZ + 0.01 * midBulge
        ),
        new THREE.Vector3(
          cordAttachX + currentSwing * 0.65 + 0.05 * midBulge,
          pTopY - (pTopY - pBottomY) * 0.72,
          cordAttachZ + 0.02 * midBulge
        ),
        new THREE.Vector3(pBottomX, pBottomY, cordAttachZ),
      ]);

      cordMeshRef.current.geometry.dispose();
      cordMeshRef.current.geometry = new THREE.TubeGeometry(dynamicCurve, 18, 0.013, 8, false);

      handleGroupRef.current.position.set(pBottomX, pBottomY, cordAttachZ);
      handleGroupRef.current.rotation.z = -currentSwing * 1.5;
    }
  });

  /* ------------------------------------------------------------------ */
  /* Pointer Drag Handlers on the 3D Pull Cord Handle                   */
  /* ------------------------------------------------------------------ */
  const onHandlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHandleHovered(true);
    if (!isDragging.current) {
      document.body.style.cursor = 'grab';
    }
  };

  const onHandlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHandleHovered(false);
    if (!isDragging.current) {
      document.body.style.cursor = 'auto';
    }
  };

  const onHandlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isDragging.current = true;
    setIsHandleGrabbed(true);
    document.body.style.cursor = 'grabbing';

    startScreenY.current = e.clientY;
    startScreenX.current = e.clientX;
    pointerDownTime.current = performance.now();
    hasTriggeredToggle.current = false;

    // Pointer move listener
    const onPointerMove = (evt: PointerEvent) => {
      if (!isDragging.current) return;
      const dy = evt.clientY - startScreenY.current;
      const dx = evt.clientX - startScreenX.current;

      if (dy > 0) {
        // Dragging downward in lamp local coordinates
        const dist = Math.min(0.42, dy * 0.005);
        pullDistance.current = dist;
        pullSwing.current = THREE.MathUtils.clamp(dx * 0.0025, -0.14, 0.14);

        // Activation threshold: 0.16 units (~35-40px downward pull)
        if (dist >= 0.16 && !hasTriggeredToggle.current) {
          hasTriggeredToggle.current = true;
          onToggle();
        }
      } else {
        // Slight resistance when moving above rest point
        pullDistance.current = Math.max(-0.04, dy * 0.001);
        pullSwing.current = THREE.MathUtils.clamp(dx * 0.002, -0.05, 0.05);
      }
    };

    // Pointer up listener
    const onPointerUp = (evt: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setIsHandleGrabbed(false);
      document.body.style.cursor = 'auto';

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const elapsed = performance.now() - pointerDownTime.current;
      const dy = Math.max(0, evt.clientY - startScreenY.current);

      // If user made a quick intentional flick/tug downward (> 12px within 300ms) without crossing threshold yet:
      if (!hasTriggeredToggle.current && elapsed < 300 && dy > 10) {
        pullDistance.current = 0.28;
        hasTriggeredToggle.current = true;
        onToggle();
      }

      // Initial release recoil velocity for damped harmonic return
      pullVelY.current = -pullDistance.current * 18;
      pullVelX.current = -pullSwing.current * 14;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  /* Shade Geometry: Elegant tapered cone matching reference standing lamp */
  const shadeGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.46, 0.82, 0.78, 48, 1, true);
  }, []);

  return (
    /* Lamp assembly scaled down by ~30% and centered vertically */
    <group ref={groupRef} position={[0, -1.05, 0]} scale={[0.70, 0.70, 0.70]}>
      {/* ------------------------------------------------------------- */}
      {/* 1. BASE: Heavy cast stepped circular base with brass trim     */}
      {/* ------------------------------------------------------------- */}
      <group>
        {/* Main stepped cast dark gunmetal base disc */}
        <mesh position={[0, 0.035, 0]} material={darkGunmetalMat} castShadow>
          <cylinderGeometry args={[0.68, 0.74, 0.07, 48]} />
        </mesh>

        {/* Stepped brass top plate ring */}
        <mesh position={[0, 0.075, 0]} material={polishedBrassMat} castShadow>
          <cylinderGeometry args={[0.36, 0.42, 0.03, 36]} />
        </mesh>

        {/* Brass central stem ferrule */}
        <mesh position={[0, 0.105, 0]} material={polishedBrassMat} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.04, 24]} />
        </mesh>

        {/* ------------------------------------------------------------- */}
        {/* 2. ARTICULATED SUPPORT STEM: Believable brass joint knuckles  */}
        {/* ------------------------------------------------------------- */}
        {/* Lower pole section */}
        <mesh position={[0, 0.68, 0]} material={darkGunmetalMat} castShadow>
          <cylinderGeometry args={[0.038, 0.038, 1.15, 24]} />
        </mesh>

        {/* Lower articulation knuckle joint */}
        <mesh position={[0, 1.28, 0]} material={polishedBrassMat} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.09, 24]} />
        </mesh>

        {/* Middle pole section */}
        <mesh position={[0, 1.78, 0]} material={darkGunmetalMat} castShadow>
          <cylinderGeometry args={[0.038, 0.038, 0.95, 24]} />
        </mesh>

        {/* Upper articulation knuckle joint */}
        <mesh position={[0, 2.28, 0]} material={polishedBrassMat} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.09, 24]} />
        </mesh>

        {/* Upper neck socket stem */}
        <mesh position={[0, 2.34, 0]} material={polishedBrassMat} castShadow>
          <cylinderGeometry args={[0.048, 0.048, 0.08, 24]} />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 3. SHADE ASSEMBLY & BULB (Dips slightly on pull cord tension) */}
      {/* ------------------------------------------------------------- */}
      <group ref={shadeGroupRef} position={[0, 2.75, 0]}>
        {/* Outer glowing fabric surface */}
        <mesh geometry={shadeGeometry} material={shadeOuterMat} castShadow />

        {/* Inner reflective shade surface */}
        <mesh geometry={shadeGeometry} material={shadeInnerMat} />

        {/* Internal light bulb */}
        <mesh ref={bulbRef} position={[0, -0.05, 0]} material={bulbMat}>
          <sphereGeometry args={[0.14, 24, 24]} />
        </mesh>

        {/* Omnidirectional warm point light inside shade */}
        <pointLight
          ref={pointLightRef}
          position={[0, -0.08, 0]}
          color="#FFD699"
          intensity={0}
          distance={14}
          decay={2}
        />

        {/* Downward focused cone of light illuminating the room */}
        <spotLight
          ref={downSpotRef}
          position={[0, -0.15, 0]}
          target-position={[0, -4.5, 0]}
          color="#FFE5B4"
          intensity={0}
          angle={Math.PI / 2.8}
          penumbra={0.85}
          distance={16}
          decay={2}
        />

        {/* Upward gentle ceiling wash */}
        <spotLight
          ref={upSpotRef}
          position={[0, 0.38, 0]}
          target-position={[0, 4.5, 0]}
          color="#FFA840"
          intensity={0}
          angle={Math.PI / 3.5}
          penumbra={0.8}
          distance={10}
          decay={2}
        />

        {/* Switch socket collar beneath shade rim where cord attaches */}
        <mesh position={[cordAttachX, -0.38, cordAttachZ]} material={polishedBrassMat} castShadow>
          <cylinderGeometry args={[0.02, 0.025, 0.04, 16]} />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 4. GENUINE 3D PULL CORD & TURNED BRASS TASSEL HANDLE          */}
      {/* ------------------------------------------------------------- */}
      {/* Dynamic hanging cord line */}
      <mesh ref={cordMeshRef} geometry={initialTubeGeo} material={cordMat} />

      {/* Turned brass pull handle/tassel with interactive grab hit-box */}
      <group
        ref={handleGroupRef}
        position={[cordAttachX, cordRestBottomY, cordAttachZ]}
        onPointerOver={onHandlePointerOver}
        onPointerOut={onHandlePointerOut}
        onPointerDown={onHandlePointerDown}
      >
        {/* Top connector bead */}
        <mesh material={handleBrassMat} castShadow>
          <sphereGeometry args={[0.034, 16, 16]} />
        </mesh>
        {/* Turned ribbed handle cylinder */}
        <mesh position={[0, -0.08, 0]} material={handleBrassMat} castShadow>
          <cylinderGeometry args={[0.028, 0.034, 0.14, 20]} />
        </mesh>
        {/* Lower finial droplet */}
        <mesh position={[0, -0.17, 0]} material={handleBrassMat} castShadow>
          <coneGeometry args={[0.034, 0.08, 20]} />
        </mesh>

        {/* Generous invisible grab target for effortless pointer and touch dragging */}
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.45, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 5. FLOOR LIGHT POOL: Realistic illuminated ellipse beneath lamp */}
      {/* ------------------------------------------------------------- */}
      <mesh
        ref={floorPoolRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        material={floorPoolMat}
      >
        <circleGeometry args={[2.0, 48]} />
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.06, 0]} material={floorMat}>
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
    const count = 55;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 3.5;
      arr[i * 3 + 1] = Math.random() * 3.5 - 0.8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
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
        if (arr[i * 3 + 1] > 2.5) {
          arr[i * 3 + 1] = -0.8;
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
        size={0.026}
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
      camera={{ position: [0, 0.05, 5.8], fov: 38, near: 0.1, far: 50 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        touchAction: 'pan-y', // allows page scrolling outside cord handle
      }}
      aria-label="Interactive 3D standing lamp. Pull the cord downwards to toggle illumination."
      role="img"
    >
      {/* Ambient lighting adapts smoothly between illuminated state and dark room */}
      <ambientLight intensity={isOn ? 0.45 : 0.08} color={isOn ? '#FFEFEA' : '#3D3535'} />

      {/* Directional fill */}
      <directionalLight
        position={[3, 5, 4]}
        intensity={isOn ? 0.7 : 0.12}
        color={isOn ? '#FFF5EE' : '#685D5D'}
      />

      {/* 3D Lamp with Articulated Parts & Genuine Pull Cord */}
      <LampModel isOn={isOn} onToggle={onToggle} />

      {/* Ambient light motes */}
      {!prefersReducedMotion && <LightMotes isOn={isOn} />}

      {/* Floor surface plane */}
      <FloorSurface isOn={isOn} />
    </Canvas>
  );
};

export default LampSceneCanvas;
