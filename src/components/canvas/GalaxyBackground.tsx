'use client';

/**
 * Home-page deep-space environment (Three.js, single WebGL context).
 *
 * Layers (back → front):
 *   1. Deep-space base colour (renderer clear colour)
 *   2. Nebula — full-screen domain-warped fbm shader, drifts slowly
 *   3. Spiral galaxy — GPU particles; differential rotation is computed in the
 *      vertex shader (inner orbits turn faster), so animation costs no CPU
 *   4. Background stars (3 depth layers, twinkle in shader) + drifting dust
 *   5. Core glow (subtle light variation)
 *
 * Performance: particle counts scale with device capability; DPR capped; render loop
 * pauses when the tab is hidden; reduced-motion renders one static frame; all GPU
 * resources are disposed on unmount. Falls back to a CSS gradient without WebGL.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Props {
  reducedMotion?: boolean;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function qualityTier(): 'low' | 'mid' | 'high' {
  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (w < 700 || cores <= 4 || mem <= 4) return 'low';
  if (w < 1300 || cores <= 8) return 'mid';
  return 'high';
}

// Seeded PRNG so the galaxy looks identical across reloads
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rand: () => number) {
  return Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
}

const NEBULA_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uPointer;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.03; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.2 + uPointer * 0.04;
    float t = uTime * 0.03;
    // Domain warping gives the filamentary nebula structure
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t)));
    vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.4));
    float n = fbm(p + 2.6 * r);

    vec3 violet = vec3(0.32, 0.16, 0.62);
    vec3 blue   = vec3(0.07, 0.22, 0.55);
    vec3 cyan   = vec3(0.10, 0.55, 0.70);
    vec3 magenta= vec3(0.55, 0.12, 0.42);
    vec3 col = mix(blue, violet, smoothstep(0.25, 0.75, n));
    col = mix(col, cyan, smoothstep(0.55, 0.95, r.x) * 0.55);
    col = mix(col, magenta, smoothstep(0.62, 0.95, q.y) * 0.25);

    // Dust lanes darken the cloud
    float dust = smoothstep(0.45, 0.7, fbm(p * 1.7 - r));
    float density = pow(n, 2.4) * 1.25 * (1.0 - 0.55 * dust);

    // Keep the nebula concentrated toward the galaxy (upper right), fade near the hero text (left)
    float mask = smoothstep(1.3, 0.1, distance(uv, vec2(0.6, 0.72)));
    mask = max(mask, 0.25 * smoothstep(1.2, 0.0, distance(uv, vec2(0.15, 0.1))));
    gl_FragColor = vec4(col * density * mask * 0.9, 1.0);
  }
`;

const GALAXY_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aRadius;
  attribute float aAngle;
  attribute float aHeight;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    // Differential rotation: angular speed ∝ 1/sqrt(r) (flattened rotation curve feel)
    float ang = aAngle + uTime * 0.11 / sqrt(aRadius + 0.15);
    vec3 pos = vec3(cos(ang) * aRadius, aHeight, sin(ang) * aRadius);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (24.0 / -mv.z);
    vColor = aColor;
    vAlpha = smoothstep(4.2, 0.2, aRadius);
  }
`;
const GALAXY_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * 1.35, a * vAlpha * 0.85);
  }
`;

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  uniform float uDepth;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec3 p = position;
    p.xy += uPointer * uDepth;           // parallax
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio;
    vColor = aColor;
    vTw = 0.65 + 0.35 * sin(uTime * (0.6 + aPhase * 1.8) + aPhase * 40.0);
  }
`;
const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 2.2) * vTw;
    gl_FragColor = vec4(vColor, a);
  }
`;

export const GalaxyBackground: React.FC<Props> = ({ reducedMotion = false }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [supported] = useState(() => (typeof window === 'undefined' ? true : hasWebGL()));

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return;

    const tier = qualityTier();
    const counts = {
      low: { galaxy: 14000, stars: 1200, dust: 200 },
      mid: { galaxy: 30000, stars: 2200, dust: 380 },
      high: { galaxy: 52000, stars: 3200, dust: 600 },
    }[tier];
    const pixelRatio = Math.min(window.devicePixelRatio || 1, tier === 'high' ? 1.75 : 1.25);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x02040b, 1);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(0, 0, 10);

    const disposables: { dispose: () => void }[] = [];
    const rand = mulberry32(20261108);

    // ── Layer 2: nebula (screen-space quad, rendered first) ──
    const nebulaMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uPointer: { value: new THREE.Vector2() } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: NEBULA_FRAG,
      depthWrite: false,
      depthTest: false,
    });
    const nebulaGeo = new THREE.PlaneGeometry(2, 2);
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    nebula.frustumCulled = false;
    nebula.renderOrder = -10;
    scene.add(nebula);
    disposables.push(nebulaMat, nebulaGeo);

    // ── Layer 3: spiral galaxy ──
    const G = counts.galaxy;
    const gPos = new Float32Array(G * 3);
    const gSize = new Float32Array(G);
    const gRad = new Float32Array(G);
    const gAng = new Float32Array(G);
    const gH = new Float32Array(G);
    const gCol = new Float32Array(G * 3);
    const arms = 2;
    const cCore = new THREE.Color('#fff1dc');
    const cInner = new THREE.Color('#9fd8ff');
    const cArm = new THREE.Color('#5b7cff');
    const cOuter = new THREE.Color('#9a5bff');
    const cHII = new THREE.Color('#ff7ad1');
    const tmp = new THREE.Color();
    for (let i = 0; i < G; i++) {
      const isBulge = i < G * 0.11;
      let r: number, ang: number, h: number;
      if (isBulge) {
        r = Math.abs(gauss(rand)) * 0.45;
        ang = rand() * Math.PI * 2;
        h = gauss(rand) * 0.12 * (1 - r);
      } else {
        r = Math.pow(rand(), 0.75) * 4.2 + 0.15;
        const arm = Math.floor(rand() * arms);
        const field = rand() < 0.22;
        // Logarithmic spiral: θ = ln(r)/tan(pitch) + arm offset, with scatter
        const twist = Math.log(r + 0.3) * 3.1;
        const scatter = gauss(rand) * (0.07 + 0.035 * r);
        ang = field ? rand() * Math.PI * 2 : (arm / arms) * Math.PI * 2 + twist + scatter;
        h = gauss(rand) * 0.05;
      }
      gRad[i] = r; gAng[i] = ang; gH[i] = h;
      const tr = Math.min(1, r / 4.2);
      if (isBulge) tmp.copy(cCore).lerp(cInner, Math.min(1, r * 1.6));
      else if (tr < 0.45) tmp.copy(cInner).lerp(cArm, tr / 0.45);
      else tmp.copy(cArm).lerp(cOuter, (tr - 0.45) / 0.55);
      if (!isBulge && rand() < 0.012) tmp.copy(cHII); // star-forming knots
      const bright = isBulge ? 0.7 : 0.6 + rand() * 0.5;
      gCol[i * 3] = tmp.r * bright; gCol[i * 3 + 1] = tmp.g * bright; gCol[i * 3 + 2] = tmp.b * bright;
      gSize[i] = isBulge ? 1.6 + rand() * 2.4 : 0.8 + rand() * 1.8 + (rand() < 0.01 ? 3 : 0);
    }
    const galaxyGeo = new THREE.BufferGeometry();
    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    galaxyGeo.setAttribute('aSize', new THREE.BufferAttribute(gSize, 1));
    galaxyGeo.setAttribute('aRadius', new THREE.BufferAttribute(gRad, 1));
    galaxyGeo.setAttribute('aAngle', new THREE.BufferAttribute(gAng, 1));
    galaxyGeo.setAttribute('aHeight', new THREE.BufferAttribute(gH, 1));
    galaxyGeo.setAttribute('aColor', new THREE.BufferAttribute(gCol, 3));
    galaxyGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    const galaxyMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } },
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const galaxy = new THREE.Points(galaxyGeo, galaxyMat);
    const galaxyGroup = new THREE.Group();
    galaxyGroup.add(galaxy);
    galaxyGroup.rotation.set(0.88, 0.0, -0.38); // inclined disc, seen at ~50°
    scene.add(galaxyGroup);
    disposables.push(galaxyGeo, galaxyMat);

    // Core glow sprite (light variation)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const g2 = glowCanvas.getContext('2d')!;
    const grd = g2.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,236,210,0.9)');
    grd.addColorStop(0.15, 'rgba(200,210,255,0.35)');
    grd.addColorStop(0.5, 'rgba(110,120,255,0.08)');
    grd.addColorStop(1, 'rgba(80,60,200,0)');
    g2.fillStyle = grd;
    g2.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(3.4, 3.4, 1);
    galaxyGroup.add(glow);
    disposables.push(glowTex, glowMat);

    // ── Layer 4: star field (3 depth layers) ──
    const starLayers: THREE.ShaderMaterial[] = [];
    const starPalette = ['#ffffff', '#cfe3ff', '#a8c8ff', '#ffe9c9', '#d9ccff'].map(c => new THREE.Color(c));
    [
      { z: -60, spread: 140, depth: 0.15, size: [0.8, 1.6], frac: 0.55 },
      { z: -30, spread: 70, depth: 0.35, size: [1.0, 2.2], frac: 0.32 },
      { z: -8, spread: 26, depth: 0.8, size: [1.4, 3.0], frac: 0.13 },
    ].forEach(layer => {
      const n = Math.round(counts.stars * layer.frac);
      const pos = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const phase = new Float32Array(n);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (rand() - 0.5) * layer.spread * 1.8;
        pos[i * 3 + 1] = (rand() - 0.5) * layer.spread;
        pos[i * 3 + 2] = layer.z + (rand() - 0.5) * 4;
        size[i] = layer.size[0] + Math.pow(rand(), 3) * (layer.size[1] - layer.size[0]) * 2;
        phase[i] = rand();
        const c = starPalette[Math.floor(rand() * starPalette.length)];
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
      geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uPointer: { value: new THREE.Vector2() }, uDepth: { value: layer.depth } },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      scene.add(pts);
      starLayers.push(mat);
      disposables.push(geo, mat);
    });

    // Drifting cosmic dust (CPU-light: updated by a single uniform offset)
    const D = counts.dust;
    const dPos = new Float32Array(D * 3);
    const dSize = new Float32Array(D);
    const dPhase = new Float32Array(D);
    const dCol = new Float32Array(D * 3);
    for (let i = 0; i < D; i++) {
      dPos[i * 3] = (rand() - 0.5) * 22;
      dPos[i * 3 + 1] = (rand() - 0.5) * 12;
      dPos[i * 3 + 2] = 2 + rand() * 5;
      dSize[i] = 1 + rand() * 2.5;
      dPhase[i] = rand();
      const c = rand() < 0.5 ? new THREE.Color('#7dd3fc') : new THREE.Color('#c4b5fd');
      dCol[i * 3] = c.r * 0.35; dCol[i * 3 + 1] = c.g * 0.35; dCol[i * 3 + 2] = c.b * 0.35;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
    dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dPhase, 1));
    dustGeo.setAttribute('aColor', new THREE.BufferAttribute(dCol, 3));
    const dustMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uPointer: { value: new THREE.Vector2() }, uDepth: { value: 1.6 } },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    scene.add(dust);
    starLayers.push(dustMat);
    disposables.push(dustGeo, dustMat);

    // ── Layout: galaxy sits upper-right on wide screens, centred-high on mobile ──
    const layout = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      nebulaMat.uniforms.uRes.value.set(w, h);
      const wide = w / h > 1.1;
      // Mobile: galaxy rides high above the headline so copy stays readable
      galaxyGroup.position.set(wide ? 3.4 : 0.6, wide ? 2.3 : 5.6, -8);
      const s = wide ? 2.5 : 1.25;
      galaxyGroup.scale.setScalar(s);
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(host);

    // ── Pointer parallax (smoothed) ──
    const pointer = new THREE.Vector2();
    const pointerSmooth = new THREE.Vector2();
    const onPointer = (e: PointerEvent) => {
      pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    if (!reducedMotion) window.addEventListener('pointermove', onPointer, { passive: true });

    // ── Render loop ──
    const clock = new THREE.Timer();
    let raf = 0;
    let elapsed = 40; // start mid-rotation so the first frame looks settled
    const renderFrame = () => {
      nebulaMat.uniforms.uTime.value = elapsed;
      galaxyMat.uniforms.uTime.value = elapsed;
      for (const m of starLayers) {
        m.uniforms.uTime.value = elapsed;
        m.uniforms.uPointer.value.copy(pointerSmooth);
      }
      nebulaMat.uniforms.uPointer.value.copy(pointerSmooth);
      dust.position.x = Math.sin(elapsed * 0.02) * 0.6;
      dust.position.y = ((elapsed * 0.12) % 6) - 3;
      glowMat.opacity = 0.62 + 0.08 * Math.sin(elapsed * 0.25);
      camera.position.x = pointerSmooth.x * 0.25;
      camera.position.y = pointerSmooth.y * 0.15;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      clock.update(ts);
      const dt = Math.min(0.05, clock.getDelta());
      elapsed += dt * (reducedMotion ? 0.3 : 1);
      pointerSmooth.lerp(pointer, 1 - Math.exp(-dt * 2));
      renderFrame();
    };
    // Reduced motion: keep a slow ambient drift (no parallax), never a frozen frame
    raf = requestAnimationFrame(loop);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { clock.reset(); raf = requestAnimationFrame(loop); }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPointer);
      ro.disconnect();
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [supported, reducedMotion]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      {supported ? (
        <div ref={hostRef} className="absolute inset-0" />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 45% at 68% 35%, rgba(120,110,255,0.28), transparent 70%), radial-gradient(ellipse 40% 30% at 70% 38%, rgba(255,236,210,0.18), transparent 60%), radial-gradient(ellipse 80% 60% at 20% 90%, rgba(30,90,160,0.25), transparent 70%), #02040b',
          }}
        />
      )}
      {/* Layer 5: readability scrim — darkens behind the hero copy on the left and the page bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(2,4,11,0.78) 0%, rgba(2,4,11,0.45) 38%, rgba(2,4,11,0) 62%), linear-gradient(180deg, rgba(2,4,11,0) 55%, rgba(2,4,11,0.65) 100%)',
        }}
      />
    </div>
  );
};
