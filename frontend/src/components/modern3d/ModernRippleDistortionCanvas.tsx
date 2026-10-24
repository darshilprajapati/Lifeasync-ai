import React, { useEffect, useRef } from 'react';
import { useThemeSystem } from '../../context/ThemeContext';

interface RipplePoint {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  birthTime: number; // seconds
  intensity: number;
}

const MAX_RIPPLES = 24;

/**
 * ModernRippleDistortionCanvas
 * Genuine pointer-driven WebGL liquid ripple displacement.
 * - In Modern 3D mode: pointer movement creates a water-like disturbance that physically
 *   warps the surface coordinates and background grid, leaving a decaying liquid wake.
 * - Uses WebGL fragment shader with 2D wave equation displacement and specular caustic highlights.
 * - Pauses rendering when all ripples decay and pointer is idle (0% CPU/GPU overhead when idle).
 * - Positioned behind interactive content (pointer-events: none, z-index: 0).
 * - Inactive in Professional mode, prefers-reduced-motion, and touch-only devices.
 */
export const ModernRippleDistortionCanvas: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
}> = ({ containerRef }) => {
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isProf) return;

    // Accessibility & touch safeguards
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;
    if (window.innerWidth < 900) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power'
    });

    if (!gl) {
      console.warn('LifeSync AI: WebGL not available for ripple displacement.');
      return;
    }

    // Vertex Shader: full-screen quad
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        // Flip Y for WebGL screen coordinates
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader: physical liquid wave displacement + caustic sheen
    const fsSource = `
      precision mediump float;
      varying vec2 v_uv;

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform int u_is_dark;
      uniform int u_ripple_count;
      uniform vec4 u_ripples[${MAX_RIPPLES}]; // xy = pos, z = birthTime, w = intensity

      void main() {
        vec2 uv = v_uv;
        float aspect = u_resolution.x / max(u_resolution.y, 1.0);

        vec2 totalDisplacement = vec2(0.0);
        float totalCrest = 0.0;

        for (int i = 0; i < ${MAX_RIPPLES}; i++) {
          if (i >= u_ripple_count) break;

          vec4 rip = u_ripples[i];
          vec2 toCenter = uv - rip.xy;
          toCenter.x *= aspect;

          float dist = length(toCenter);
          float age = u_time - rip.z;

          if (age > 0.0 && age < 1.6) {
            float waveRadius = age * 0.38; // wave expansion speed
            float d = dist - waveRadius;

            // Wave envelope packet
            if (abs(d) < 0.12) {
              float wave = sin(d * 42.0) * exp(-d * d * 450.0);
              float decay = max(0.0, 1.0 - (age / 1.6));
              float amp = wave * decay * rip.w * 0.028;

              vec2 dir = normalize(uv - rip.xy + vec2(0.0001));
              totalDisplacement += dir * amp;
              totalCrest += abs(wave) * decay * rip.w;
            }
          }
        }

        // Warped surface coordinates
        vec2 warpedUv = uv + totalDisplacement;

        // Base atmospheric gradient
        vec4 baseColor;
        if (u_is_dark == 1) {
          // Deep indigo/navy night gradient
          vec3 topColor = vec3(0.055, 0.067, 0.102); // #0E111A
          vec3 botColor = vec3(0.082, 0.098, 0.153); // #151927
          baseColor = vec4(mix(topColor, botColor, warpedUv.y), 1.0);
        } else {
          // Luminous modern light surface
          vec3 topColor = vec3(0.965, 0.957, 0.941); // #F6F4F0
          vec3 botColor = vec3(0.925, 0.914, 0.890); // #ECE9E3
          baseColor = vec4(mix(topColor, botColor, warpedUv.y), 1.0);
        }

        // Architectural geometric grid lines warped by liquid ripples
        vec2 gridPos = warpedUv * (u_resolution / 38.0);
        vec2 gridFract = abs(fract(gridPos - 0.5) - 0.5) / fwidth(gridPos);
        float gridLine = 1.0 - min(min(gridFract.x, gridFract.y), 1.0);

        if (u_is_dark == 1) {
          // Subtle grid in dark mode, warped by ripples
          baseColor.rgb += vec3(0.18, 0.22, 0.35) * (gridLine * 0.08);
        } else {
          // Subtle warm gray grid in light mode
          baseColor.rgb -= vec3(0.08, 0.08, 0.08) * (gridLine * 0.04);
        }

        // Liquid specular caustic highlight along wave crests
        if (totalCrest > 0.001) {
          vec3 normal = normalize(vec3(-totalDisplacement.x * 35.0, -totalDisplacement.y * 35.0, 1.0));
          vec3 lightDir = normalize(vec3(0.2, 0.5, 0.85));
          float spec = pow(max(0.0, dot(normal, lightDir)), 22.0);

          vec3 warmSheen = vec3(1.0, 0.44, 0.20); // Orange/coral
          vec3 coolSheen = vec3(0.35, 0.78, 1.0); // Icy blue
          vec3 causticColor = u_is_dark == 1 
            ? mix(warmSheen, coolSheen, sin(warpedUv.x * 4.0 + u_time) * 0.5 + 0.5) 
            : vec3(1.0); // Clean crystal reflection in light mode (zero orange shadow/glow)

          float specMult = u_is_dark == 1 ? 0.85 : 0.35;
          float crestMult = u_is_dark == 1 ? 0.06 : 0.02;
          baseColor.rgb += causticColor * (spec * totalCrest * specMult + totalCrest * crestMult);
        }

        gl_FragColor = baseColor;
      }
    `;

    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('LifeSync AI Shader Error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('LifeSync AI Program Link Error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry: 2 triangles covering [-1, 1]
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const isDarkLoc = gl.getUniformLocation(program, 'u_is_dark');
    const ripCountLoc = gl.getUniformLocation(program, 'u_ripple_count');
    const ripplesLoc = gl.getUniformLocation(program, 'u_ripples');

    let width = 0;
    let height = 0;

    const resize = () => {
      if (!container || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth;
      height = container.clientHeight;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const ripples: RipplePoint[] = [];
    const startTime = performance.now();
    let animId: number | null = null;
    let isRunning = false;
    let lastDropTime = 0;
    let lastDropX = -1000;
    let lastDropY = -1000;

    const render = () => {
      const nowSec = (performance.now() - startTime) / 1000;

      // Clean up aged ripples (> 1.6s)
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (nowSec - ripples[i].birthTime > 1.6) {
          ripples.splice(i, 1);
        }
      }

      gl.useProgram(program);
      gl.uniform2f(resLoc, width, height);
      gl.uniform1f(timeLoc, nowSec);
      gl.uniform1i(isDarkLoc, isDark ? 1 : 0);
      gl.uniform1i(ripCountLoc, ripples.length);

      // Pack ripples into Float32Array
      const rippleData = new Float32Array(MAX_RIPPLES * 4);
      for (let i = 0; i < ripples.length && i < MAX_RIPPLES; i++) {
        rippleData[i * 4 + 0] = ripples[i].x;
        rippleData[i * 4 + 1] = ripples[i].y;
        rippleData[i * 4 + 2] = ripples[i].birthTime;
        rippleData[i * 4 + 3] = ripples[i].intensity;
      }
      gl.uniform4fv(ripplesLoc, rippleData);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (ripples.length > 0) {
        animId = requestAnimationFrame(render);
      } else {
        isRunning = false;
      }
    };

    const addDisturbance = (clientX: number, clientY: number, speedBoost = 1.0) => {
      const rect = container.getBoundingClientRect();
      const normX = (clientX - rect.left) / Math.max(rect.width, 1);
      const normY = (clientY - rect.top) / Math.max(rect.height, 1);

      if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return;

      const nowSec = (performance.now() - startTime) / 1000;

      if (ripples.length >= MAX_RIPPLES) {
        ripples.shift();
      }

      ripples.push({
        x: normX,
        y: normY,
        birthTime: nowSec,
        intensity: Math.min(1.4, Math.max(0.6, speedBoost))
      });

      if (!isRunning) {
        isRunning = true;
        animId = requestAnimationFrame(render);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = now - lastDropTime;
      const dx = e.clientX - lastDropX;
      const dy = e.clientY - lastDropY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Spawn ripples when moving (throttle by ~32ms or distance > 14px)
      if (dt > 32 && dist > 14) {
        const speed = Math.min(dist / Math.max(dt, 1), 2.5);
        addDisturbance(e.clientX, e.clientY, 0.8 + speed * 0.4);
        lastDropTime = now;
        lastDropX = e.clientX;
        lastDropY = e.clientY;
      }
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Initial render pass
    render();

    return () => {
      window.removeEventListener('resize', resize);
      container.removeEventListener('pointermove', handlePointerMove);
      if (animId) cancelAnimationFrame(animId);
      gl.deleteBuffer(quadBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      ripples.length = 0;
      isRunning = false;
    };
  }, [isProf, isDark, containerRef]);

  if (isProf) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
};
