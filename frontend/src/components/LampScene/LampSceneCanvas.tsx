import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
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
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const shadeGroupRef = useRef<THREE.Group>(null);
  const downSpotRef = useRef<THREE.SpotLight>(null);
  const upSpotRef = useRef<THREE.SpotLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const bulbRef = useRef<THREE.Mesh>(null);
  const cordMeshRef = useRef<THREE.Mesh>(null);
  const handleGroupRef = useRef<THREE.Group>(null);
  const collarRef = useRef<THREE.Mesh>(null);

  // Hover & Drag state for visual feedback
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [isHandleGrabbed, setIsHandleGrabbed] = useState(false);

  // Target lighting state lerp
  const targetLight = useRef(isOn ? 1 : 0);
  useEffect(() => {
    targetLight.current = isOn ? 1 : 0;
  }, [isOn]);

  // Cord physical geometry constants
  const cordAttachX = 0.22;
  const cordAttachY = 2.36;
  const cordAttachZ = 0.12;
  const cordRestBottomY = 1.48;
  const cordRestLength = cordAttachY - cordRestBottomY;

  // Pull Cord 180° Arc Physics & Drag Interaction State
  const isDragging = useRef(false);
  const startScreenY = useRef(0);
  const startScreenX = useRef(0);
  const pointerDownTime = useRef(0);

  const curSwingAngle = useRef(0); // 0 = straight down, -PI/2 = full left, +PI/2 = full right
  const pullDistance = useRef(0); // 0 to 0.42 units

  const velAngle = useRef(0);
  const pullVel = useRef(0);
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

  /* ------------------------------------------------------------------ */
  /* Cord Geometry & Curve Definition                                   */
  /* ------------------------------------------------------------------ */
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

    // 2. Damped Spring Physics for Pull Cord
    if (!isDragging.current) {
      // Angular spring smoothly returning to vertical rest (0 rad)
      const kAngle = 135;
      const cAngle = 12;
      const forceAngle = -kAngle * curSwingAngle.current - cAngle * velAngle.current;
      velAngle.current += forceAngle * dt;
      curSwingAngle.current += velAngle.current * dt;

      // Vertical/radial pull extension spring returning to rest (0)
      const kPull = 200;
      const cPull = 15;
      const forcePull = -kPull * pullDistance.current - cPull * pullVel.current;
      pullVel.current += forcePull * dt;
      pullDistance.current += pullVel.current * dt;

      // Rest snap
      if (Math.abs(pullDistance.current) < 0.001 && Math.abs(pullVel.current) < 0.005) {
        pullDistance.current = 0;
        pullVel.current = 0;
      }
      if (Math.abs(curSwingAngle.current) < 0.001 && Math.abs(velAngle.current) < 0.005) {
        curSwingAngle.current = 0;
        velAngle.current = 0;
      }
    }

    const currentDist = pullDistance.current;
    const currentSwing = curSwingAngle.current;

    // 3. Mechanical Reaction on Lamp Arm & Shade
    if (shadeGroupRef.current) {
      const nodAngle = currentDist * 0.05;
      shadeGroupRef.current.rotation.z = -nodAngle * Math.cos(currentSwing);
      shadeGroupRef.current.position.y = 2.75 - nodAngle * 0.25;
    }

    // 4. Update 3D Cord Geometry Curve and Handle Position
    if (cordMeshRef.current && handleGroupRef.current) {
      const pTopX = cordAttachX;
      const pTopY = cordAttachY - currentDist * 0.02;
      const pTopZ = cordAttachZ;

      const currentLength = cordRestLength + currentDist;
      const pBottomX = pTopX + currentLength * Math.sin(currentSwing);
      const pBottomY = pTopY - currentLength * Math.cos(currentSwing);
      const pBottomZ = pTopZ + Math.sin(Math.abs(currentSwing) * 0.5) * 0.03;

      // Under tension, the curve straightens naturally
      const tensionStraighten = THREE.MathUtils.clamp(currentDist * 2.5, 0, 0.9);
      const midBulge = 1 - tensionStraighten;

      // Natural catenary hanging curve across the 180° swing
      const mid1X = pTopX + (pBottomX - pTopX) * 0.35 - 0.02 * Math.sin(currentSwing) * midBulge;
      const mid1Y = pTopY - (pTopY - pBottomY) * 0.35 - 0.015 * Math.abs(Math.sin(currentSwing)) * midBulge;
      const mid1Z = pTopZ + 0.01 * midBulge;

      const mid2X = pTopX + (pBottomX - pTopX) * 0.72;
      const mid2Y = pTopY - (pTopY - pBottomY) * 0.72 - 0.03 * Math.abs(Math.sin(currentSwing)) * midBulge;
      const mid2Z = pTopZ + 0.015 * midBulge;

      const dynamicCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pTopX, pTopY, pTopZ),
        new THREE.Vector3(mid1X, mid1Y, mid1Z),
        new THREE.Vector3(mid2X, mid2Y, mid2Z),
        new THREE.Vector3(pBottomX, pBottomY, pBottomZ),
      ]);

      cordMeshRef.current.geometry.dispose();
      cordMeshRef.current.geometry = new THREE.TubeGeometry(dynamicCurve, 20, 0.013, 8, false);

      handleGroupRef.current.position.set(pBottomX, pBottomY, pBottomZ);
      handleGroupRef.current.rotation.z = -currentSwing;

      if (collarRef.current) {
        collarRef.current.position.set(cordAttachX, -0.38, cordAttachZ);
      }
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
    document.body.style.userSelect = 'none';

    startScreenY.current = e.clientY;
    startScreenX.current = e.clientX;
    pointerDownTime.current = performance.now();
    hasTriggeredToggle.current = false;

    // Get screen position of cord's top pivot
    const getPivotScreenPos = () => {
      const pivotPos = new THREE.Vector3(cordAttachX, cordAttachY, cordAttachZ);
      if (groupRef.current) {
        pivotPos.applyMatrix4(groupRef.current.matrixWorld);
      }
      const proj = pivotPos.project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      return {
        x: rect.left + ((proj.x + 1) / 2) * rect.width,
        y: rect.top + ((-proj.y + 1) / 2) * rect.height,
        rect,
      };
    };

    // Get screen position of resting bottom handle
    const getRestBottomScreenPos = () => {
      const restPos = new THREE.Vector3(cordAttachX, cordRestBottomY, cordAttachZ);
      if (groupRef.current) {
        restPos.applyMatrix4(groupRef.current.matrixWorld);
      }
      const proj = restPos.project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      return {
        x: rect.left + ((proj.x + 1) / 2) * rect.width,
        y: rect.top + ((-proj.y + 1) / 2) * rect.height,
      };
    };

    const { x: pivotX, y: pivotY } = getPivotScreenPos();
    const { x: restX, y: restY } = getRestBottomScreenPos();
    const restLengthScreen = Math.max(30, Math.hypot(restX - pivotX, restY - pivotY));

    const onPointerMove = (evt: PointerEvent) => {
      if (!isDragging.current) return;
      evt.preventDefault();

      const { x: pX, y: pY } = getPivotScreenPos();
      const dx = evt.clientX - pX;
      const dy = evt.clientY - pY; // positive downwards

      // Angle relative to straight down:
      // dx = 0, dy > 0 -> 0 (straight down)
      // dx > 0 -> to the right (up to +PI/2)
      // dx < 0 -> to the left (down to -PI/2)
      const rawAngle = Math.atan2(dx, Math.max(0.001, dy));

      // Enforce the full 180° range: [-PI/2, +PI/2] (-90° to +90°)
      const targetAngle = THREE.MathUtils.clamp(rawAngle, -Math.PI / 2, Math.PI / 2);
      curSwingAngle.current = targetAngle;

      // Distance from pivot in screen space
      const ptrDist = Math.hypot(dx, dy);

      // Pull tension beyond resting length:
      if (ptrDist > restLengthScreen) {
        const pullAmount = Math.min(0.42, (ptrDist - restLengthScreen) * 0.005);
        pullDistance.current = pullAmount;

        // Activation threshold: 0.16 units (~35-40px extension beyond resting length)
        if (pullAmount >= 0.16 && !hasTriggeredToggle.current) {
          hasTriggeredToggle.current = true;
          onToggle();
        }
      } else {
        pullDistance.current = 0;
      }
    };

    const onPointerUp = (evt: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setIsHandleGrabbed(false);
      document.body.style.cursor = 'auto';
      document.body.style.userSelect = '';

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const elapsed = performance.now() - pointerDownTime.current;
      const dragDist = Math.hypot(evt.clientX - startScreenX.current, evt.clientY - startScreenY.current);

      // If user made a quick intentional flick/tug in ANY direction (> 12px within 300ms) without crossing threshold yet:
      if (!hasTriggeredToggle.current && elapsed < 300 && dragDist > 12) {
        pullDistance.current = 0.28;
        hasTriggeredToggle.current = true;
        onToggle();
      }

      // Initial release recoil velocity for damped harmonic return
      pullVel.current = -pullDistance.current * 18;
      velAngle.current = -curSwingAngle.current * 14;
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
        <mesh ref={collarRef} position={[cordAttachX, -0.38, cordAttachZ]} material={polishedBrassMat} castShadow>
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

    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Desk Floor Surface                                                 */
/* ------------------------------------------------------------------ */
function FloorSurface({ isOn: _isOn }: { isOn: boolean }) {
  // Transparent over the atmospheric Aurora background image
  return null;
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
