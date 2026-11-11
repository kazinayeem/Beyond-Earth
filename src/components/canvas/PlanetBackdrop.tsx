'use client';

/**
 * Full-screen backdrop that shows the active mission's destination:
 * the Moon, Mars, an asteroid, or Earth from orbit. One WebGL context.
 *
 * Moon, Mars and the asteroid are procedural (noise + crater fields with
 * screen-space bump lighting), so no extra image downloads are needed. Earth
 * reuses the textures already in /public/textures.
 *
 * Switching destination fades the new body in. Reduced motion renders a
 * still frame. Falls back to a CSS gradient without WebGL.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { MissionData } from '@/types/game';

type Target = MissionData['target'];

const NOISE = /* glsl */ `
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
// Crater field: bowl + raised rim around random cell centres
float craters(vec3 p) {
  vec3 i = floor(p), f = fract(p); float h = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = vec3(hash(i + g), hash(i + g + 31.1), hash(i + g + 71.7));
    float r = 0.25 + 0.3 * hash(i + g + 5.3);
    float d = length(g + o - f) / r;
    if (hash(i + g + 13.0) > 0.55 && d < 1.3) h += (d < 1.0 ? (d * d - 1.0) * 0.6 : 0.0) + smoothstep(1.3, 1.0, d) * smoothstep(0.75, 1.0, d) * 0.35;
  }
  return h;
}
`;

export const BODY_VERT = /* glsl */ `
varying vec3 vObj; varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
void main() {
  vObj = position; vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// kind: 0 moon, 1 mars, 2 asteroid
export const BODY_FRAG = /* glsl */ `
uniform int kind; uniform vec3 sunDir; uniform float fade;
varying vec3 vObj; varying vec3 vNormal; varying vec3 vView;
${NOISE}
void main() {
  vec3 p = normalize(vObj) * (kind == 2 ? length(vObj) : 1.0);
  float h; vec3 albedo;
  if (kind == 1) {
    float n = fbm(p * 3.0);
    float dark = smoothstep(0.52, 0.62, fbm(p * 1.6 + 4.0));
    albedo = mix(vec3(0.74, 0.36, 0.18), vec3(0.88, 0.55, 0.32), n);
    albedo = mix(albedo, vec3(0.36, 0.18, 0.11), dark * 0.75);
    float cap = smoothstep(0.86, 0.93, abs(p.y) + 0.04 * n);
    albedo = mix(albedo, vec3(0.95, 0.93, 0.9), cap);
    h = n * 0.8 + fbm(p * 9.0) * 0.25 + craters(p * 5.0) * 0.06;
  } else {
    float n = fbm(p * 4.0);
    float maria = kind == 0 ? smoothstep(0.5, 0.6, fbm(p * 1.4 + 2.0)) : 0.0;
    vec3 base = kind == 0 ? vec3(0.62, 0.61, 0.6) : vec3(0.42, 0.38, 0.34);
    albedo = mix(base * 0.8, base * 1.15, n);
    albedo = mix(albedo, base * 0.45, maria * 0.8);
    h = n * 0.35 + craters(p * (kind == 0 ? 6.0 : 4.0)) + craters(p * 15.0) * 0.4;
  }
  albedo = pow(albedo, vec3(2.2));
  // screen-space bump (Mikkelsen) from the height field
  vec3 N = normalize(vNormal);
  vec3 dpx = dFdx(vView), dpy = dFdy(vView);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  N = normalize(abs(det) * N - grad * (kind == 1 ? 0.6 : 1.4));
  float diff = max(dot(N, sunDir), 0.0);
  float term = smoothstep(-0.05, 0.25, dot(normalize(vNormal), sunDir));
  vec3 col = albedo * (0.01 + 1.35 * diff * term);
  // thin dusty atmosphere on Mars
  if (kind == 1) {
    float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(cameraPosition - vView)), 0.0), 3.0);
    col += vec3(0.9, 0.35, 0.15) * rim * 0.3 * smoothstep(-0.2, 0.4, dot(normalize(vNormal), sunDir));
  }
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), fade);
}
`;

const EARTH_FRAG = /* glsl */ `
uniform sampler2D day; uniform sampler2D night; uniform sampler2D clouds; uniform vec3 sunDir; uniform float fade; uniform float t;
varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
void main() {
  vec3 N = normalize(vNormal);
  float l = dot(N, sunDir);
  float dayMix = smoothstep(-0.15, 0.2, l);
  vec3 dayCol = texture2D(day, vUv).rgb * (0.08 + 1.1 * max(l, 0.0));
  float c = texture2D(clouds, vUv + vec2(t * 0.002, 0.0)).r;
  dayCol = mix(dayCol, vec3(1.0) * max(l, 0.0) * 1.1, c * 0.55);
  vec3 nightCol = texture2D(night, vUv).rgb * vec3(1.0, 0.8, 0.55) * 1.4 * (1.0 - c);
  vec3 col = mix(nightCol, dayCol, dayMix);
  float rim = pow(1.0 - max(dot(N, normalize(cameraPosition - vView)), 0.0), 2.5);
  col += vec3(0.3, 0.6, 1.0) * rim * 0.9 * smoothstep(-0.3, 0.5, l);
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)) * fade, 1.0);
}
`;

function hasWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

/** Lumpy, potato-shaped asteroid: an icosphere displaced by low-frequency noise. */
export function asteroidGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const lump = (x: number, y: number, z: number) =>
    Math.sin(x * 1.7 + 1.3) * Math.cos(y * 2.1 - 0.4) * 0.16 + Math.sin(z * 2.9 + x * 1.1) * 0.08 + Math.cos(y * 4.3 + z * 3.7) * 0.04;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const r = 1 + lump(v.x, v.y, v.z);
    pos.setXYZ(i, v.x * r * 1.35, v.y * r * 0.85, v.z * r);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Procedural Moon (0), Mars (1) or asteroid (2) surface. `fade` is the alpha,
 * so the body can fade in over a starfield. Shared with the launch scene.
 */
export function createBodyMaterial(kind: 0 | 1 | 2, sunDir: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    vertexShader: BODY_VERT, fragmentShader: BODY_FRAG, transparent: true,
    uniforms: { kind: { value: kind }, sunDir: { value: sunDir }, fade: { value: 1 } },
  });
}

interface Props { target: Target; reducedMotion: boolean }

export function PlanetBackdrop({ target, reducedMotion }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{ setTarget: (t: Target) => void } | null>(null);
  const targetRef = useRef(target);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !hasWebGL2()) return; // the CSS gradient stays visible

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }) // keeps the last frame when reduced motion skips redraws;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    camera.position.set(0, 0, 12);
    const sunDir = new THREE.Vector3(-0.8, 0.35, 0.55).normalize();

    // background stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1400 * 3);
    for (let i = 0; i < 1400; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 40);
      starPos.set([v.x, v.y, -Math.abs(v.z)], i * 3);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfe3ff, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.85 }));
    scene.add(stars);

    const loader = new THREE.TextureLoader();
    const disposables: { dispose: () => void }[] = [starGeo, stars.material as THREE.Material];
    const sphere = new THREE.SphereGeometry(1, 128, 96);
    disposables.push(sphere);

    let body: THREE.Mesh | null = null;
    let fade = 0;
    let current: Target | null = null;

    const build = (t: Target) => {
      if (body) { scene.remove(body); (body.material as THREE.Material).dispose(); if (body.geometry !== sphere) body.geometry.dispose(); }
      current = t;
      fade = reducedMotion ? 1 : 0;
      if (t === 'Earth Orbit') {
        const tex = (u: string, srgb = true) => { const x = loader.load(u); if (srgb) x.colorSpace = THREE.SRGBColorSpace; disposables.push(x); return x; };
        const mat = new THREE.ShaderMaterial({
          vertexShader: BODY_VERT, fragmentShader: EARTH_FRAG,
          uniforms: { day: { value: tex('/textures/earth_surface_2k.jpg') }, night: { value: tex('/textures/earth_lights_2k.png') }, clouds: { value: tex('/textures/earth_clouds_4k.png', false) }, sunDir: { value: sunDir }, fade: { value: fade }, t: { value: 0 } },
        });
        body = new THREE.Mesh(sphere, mat);
      } else {
        const kind = t === 'Moon' ? 0 : t === 'Mars' ? 1 : 2;
        const mat = createBodyMaterial(kind, sunDir);
        mat.uniforms.fade.value = fade;
        body = new THREE.Mesh(kind === 2 ? asteroidGeometry() : sphere, mat);
      }
      // Earth starts with South Asia facing the viewer
      body.rotation.set(t === 'Asteroid' ? 0.4 : 0.15, t === 'Earth Orbit' ? 4.2 : 0, t === 'Mars' ? 0.44 : 0.1);
      scene.add(body);
      layout();
    };

    // Big body low on the right (desktop) or bottom-centre (portrait), partly off-screen
    const layout = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!body) return;
      const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const visW = visH * camera.aspect;
      const portrait = w / h < 0.9;
      const r = (portrait ? visW * 0.55 : visH * 0.42) * (current === 'Asteroid' ? 0.7 : 1);
      body.scale.setScalar(r);
      body.position.set(portrait ? 0 : visW * 0.3, portrait ? -visH * 0.42 : -visH * 0.12, 0);
    };

    build(targetRef.current);
    apiRef.current = { setTarget: t => { if (t !== current) build(t); } };

    const ro = new ResizeObserver(layout);
    ro.observe(host);

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let still = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; elapsed += dt;
      if (body) {
        fade = Math.min(1, fade + dt * 1.2);
        const m = body.material as THREE.ShaderMaterial;
        m.uniforms.fade.value = fade;
        if (m.uniforms.t) m.uniforms.t.value = elapsed;
        if (!reducedMotion) {
          body.rotation.y += dt * (current === 'Asteroid' ? 0.08 : 0.025);
          if (current === 'Asteroid') body.rotation.x += dt * 0.02;
        }
      }
      if (!reducedMotion) stars.rotation.y += dt * 0.003;
      // reduced motion: the scene is static, so after the first ~4 s (textures uploading) redraw only every 10th frame
      if (!reducedMotion || ++still % 10 === 1 || still < 240) renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    // Reduced motion keeps the loop but nothing moves (rotation and fades are skipped in frame)
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
      if (body) { (body.material as THREE.Material).dispose(); if (body.geometry !== sphere) body.geometry.dispose(); }
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      apiRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    targetRef.current = target;
    apiRef.current?.setTarget(target);
  }, [target]);

  const tint = target === 'Mars' ? 'rgba(180,80,40,0.22)' : target === 'Earth Orbit' ? 'rgba(40,110,200,0.22)' : target === 'Asteroid' ? 'rgba(120,100,80,0.16)' : 'rgba(150,160,180,0.16)';
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 transition-[background] duration-700" style={{ background: `radial-gradient(ellipse 55% 50% at 78% 70%, ${tint}, transparent 70%), #02040b` }} />
      <div ref={hostRef} className="absolute inset-0" />
      {/* readability scrim behind content on the left */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(2,4,11,0.82) 0%, rgba(2,4,11,0.55) 45%, rgba(2,4,11,0.1) 75%)' }} />
    </div>
  );
}
