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

  const restAngle = Math.atan2(cordAttachZ, cordAttachX);
  const cordRadius = Math.sqrt(cordAttachX * cordAttachX + cordAttachZ * cordAttachZ);

  // Pull Cord 360° Physics & Drag Interaction State
  const isDragging = useRef(false);
  const startScreenY = useRef(0);
  const startScreenX = useRef(0);
  const pointerDownTime = useRef(0);

  const curAngle = useRef(restAngle);
  const lastAngle = useRef(restAngle);
  const curRadius = useRef(cordRadius);
  const pullDistance = useRef(0); // 0 to 0.42 units

  const velAngle = useRef(0);
  const velRadius = useRef(0);
  const pullVelY = useRef(0);
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
      const k = 195; // Spring stiffness
      const c = 14; // Damping coefficient

      // Vertical spring
      const forceY = -k * pullDistance.current - c * pullVelY.current;
      pullVelY.current += forceY * dt;
      pullDistance.current += pullVelY.current * dt;

      // Radial spring back to resting radius
      const diffR = curRadius.current - cordRadius;
      const forceR = -k * diffR - c * velRadius.current;
      velRadius.current += forceR * dt;
      curRadius.current += velRadius.current * dt;

      // Angular spring smoothly returning to rest angle along the shortest circular arc
      const kAngle = 65;
      const cAngle = 9;
      let diffAngle = curAngle.current - restAngle;
      diffAngle = Math.atan2(Math.sin(diffAngle), Math.cos(diffAngle));
      const forceAngle = -kAngle * diffAngle - cAngle * velAngle.current;
      velAngle.current += forceAngle * dt;
      curAngle.current += velAngle.current * dt;

      // Rest snap
      if (Math.abs(pullDistance.current) < 0.001 && Math.abs(pullVelY.current) < 0.005) {
        pullDistance.current = 0;
        pullVelY.current = 0;
      }
      if (Math.abs(diffR) < 0.001 && Math.abs(velRadius.current) < 0.005) {
        curRadius.current = cordRadius;
        velRadius.current = 0;
      }
      if (Math.abs(diffAngle) < 0.002 && Math.abs(velAngle.current) < 0.01) {
        curAngle.current = restAngle;
        velAngle.current = 0;
      }
    }

    const currentDist = pullDistance.current;
    const currentAngle = curAngle.current;
    const currentR = curRadius.current;

    // 3. Mechanical Reaction on Lamp Arm & Shade
    if (shadeGroupRef.current) {
      const nodAngle = currentDist * 0.05;
      shadeGroupRef.current.rotation.z = -nodAngle * Math.cos(currentAngle);
      shadeGroupRef.current.rotation.x = nodAngle * Math.sin(currentAngle);
      shadeGroupRef.current.position.y = 2.75 - nodAngle * 0.25;
    }

    // 4. Update 3D Cord Geometry Curve and Handle Position
    if (cordMeshRef.current && handleGroupRef.current) {
      const pTopY = cordAttachY - currentDist * 0.02;
      const pTopX = cordRadius * Math.cos(currentAngle);
      const pTopZ = cordRadius * Math.sin(currentAngle);

      const pBottomY = cordRestBottomY - currentDist;
      const pBottomX = currentR * Math.cos(currentAngle);
      const pBottomZ = currentR * Math.sin(currentAngle);

      // Under tension, the curve straightens naturally
      const tensionStraighten = THREE.MathUtils.clamp(currentDist * 2.5, 0, 0.85);
      const midBulge = 1 - tensionStraighten;

      // Natural catenary hanging curve
      const mid1Y = pTopY - (pTopY - pBottomY) * 0.35;
      const mid1R = THREE.MathUtils.lerp(cordRadius, currentR, 0.25) + 0.03 * midBulge;
      const mid1X = mid1R * Math.cos(currentAngle);
      const mid1Z = mid1R * Math.sin(currentAngle);

      const mid2Y = pTopY - (pTopY - pBottomY) * 0.72;
      const mid2R = THREE.MathUtils.lerp(cordRadius, currentR, 0.65) + 0.04 * midBulge;
      const mid2X = mid2R * Math.cos(currentAngle);
      const mid2Z = mid2R * Math.sin(currentAngle);

      const dynamicCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pTopX, pTopY, pTopZ),
        new THREE.Vector3(mid1X, mid1Y, mid1Z),
        new THREE.Vector3(mid2X, mid2Y, mid2Z),
        new THREE.Vector3(pBottomX, pBottomY, pBottomZ),
      ]);

      cordMeshRef.current.geometry.dispose();
      cordMeshRef.current.geometry = new THREE.TubeGeometry(dynamicCurve, 20, 0.013, 8, false);

      handleGroupRef.current.position.set(pBottomX, pBottomY, pBottomZ);
      const tiltAmount = (currentR - cordRadius) * 2.0;
      handleGroupRef.current.rotation.x = tiltAmount * Math.sin(currentAngle);
      handleGroupRef.current.rotation.z = -tiltAmount * Math.cos(currentAngle);

      if (collarRef.current) {
        collarRef.current.position.set(pTopX, -0.38, pTopZ);
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

    // Projected pole center on screen
    const getPoleScreenPos = () => {
      const polePos = new THREE.Vector3(0, cordRestBottomY, 0);
      if (groupRef.current) {
        polePos.applyMatrix4(groupRef.current.matrixWorld);
      }
      const proj = polePos.clone().project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      return {
        x: rect.left + ((proj.x + 1) / 2) * rect.width,
        y: rect.top + ((-proj.y + 1) / 2) * rect.height,
        rect,
      };
    };

    const { x: poleX, y: poleY } = getPoleScreenPos();
    const initDx = e.clientX - poleX;
    const initDy = e.clientY - poleY;
    const tiltAspect = 0.55;
    lastAngle.current = Math.atan2(initDy / tiltAspect, initDx);

    const onPointerMove = (evt: PointerEvent) => {
      if (!isDragging.current) return;
      evt.preventDefault();

      const { x: pX, y: pY, rect } = getPoleScreenPos();
      const dx = evt.clientX - pX;
      const dy = evt.clientY - pY;

      // Estimate pixel radius of rest ellipse on screen
      const rScreenX =
        (cordRadius * 0.7 / (camera as THREE.PerspectiveCamera).position.z) *
        (rect.height / (2 * Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360)));
      const rx = Math.max(35, Math.min(120, rScreenX || 58));
      const ry = rx * tiltAspect;

      const rPointer = Math.sqrt(dx * dx + (dy / tiltAspect) * (dy / tiltAspect));

      // Continuous 360° rotation across boundary
      if (rPointer > 8) {
        const rawAngle = Math.atan2(dy / tiltAspect, dx);
        let dTheta = rawAngle - lastAngle.current;
        while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
        while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
        curAngle.current += dTheta;
        lastAngle.current = rawAngle;
      }

      // Handle radial extension (pulling slightly outward, never inward through pole)
      const radialFactor = (rPointer - rx) / rx;
      curRadius.current = THREE.MathUtils.clamp(
        cordRadius + radialFactor * 0.12,
        0.18, // Don't let it touch or pass through the central pole (radius ~0.055)
        0.42 // Natural maximum swing outward
      );

      // Downward pull distance calculation:
      // At current angle, resting handle on the ellipse is at pY + ry * Math.sin(curAngle.current)
      const restYOnScreen = pY + ry * Math.sin(curAngle.current);
      const deltaYFromRest = evt.clientY - restYOnScreen;
      const deltaYFromGrab = evt.clientY - startScreenY.current;
      const effectivePullY = Math.max(deltaYFromRest, deltaYFromGrab * 0.75);

      if (effectivePullY > 15) {
        const dist = Math.min(0.42, (effectivePullY - 15) * 0.005);
        pullDistance.current = dist;

        // Activation threshold: 0.16 units (~35-40px downward pull)
        if (dist >= 0.16 && !hasTriggeredToggle.current) {
          hasTriggeredToggle.current = true;
          onToggle();
        }
      } else {
        pullDistance.current = Math.max(-0.04, effectivePullY * 0.001);
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
      const dy = Math.max(0, evt.clientY - startScreenY.current);

      // If user made a quick intentional flick/tug downward (> 10px within 300ms) without crossing threshold yet:
      if (!hasTriggeredToggle.current && elapsed < 300 && dy > 10) {
        pullDistance.current = 0.28;
        hasTriggeredToggle.current = true;
        onToggle();
      }

      // Initial release recoil velocity for damped harmonic return
      pullVelY.current = -pullDistance.current * 18;
      velRadius.current = -(curRadius.current - cordRadius) * 16;
      velAngle.current = THREE.MathUtils.clamp(velAngle.current, -8, 8);
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
