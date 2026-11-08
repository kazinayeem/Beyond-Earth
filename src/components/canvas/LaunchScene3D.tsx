'use client';

/**
 * 3D launch scene (Three.js, true scale: 1 world unit = 1 km).
 *
 *  • Spherical Earth: day map, night city lights, ocean specular, twilight band,
 *    independently rotating cloud shell, atmospheric rim (back-face scattering shell).
 *  • Local launch site: curved ground patch + pad, service tower, mount, lightning masts.
 *    It fades into the global sphere with altitude.
 *  • Rocket is a real 3D model placed from the ascent profile (altitude, downrange, pitch)
 *    on a great circle from the pad; stages and fairings detach into ballistic debris.
 *  • Logarithmic depth buffer lets metres-scale hardware and the planet share one scene.
 *  • Cameras: cinematic director, chase, free orbit (mouse/keyboard), side, cockpit, far.
 *    Every switch blends live poses with log-distance interpolation (no jumps).
 *
 * The parent drives the simulation via onFrame(dt) / getState(); one rAF loop.
 */

import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sampleAscent, EVENTS, type AscentSample } from '@/lib/flight/ascentProfile';
import { getMoonTextures } from '@/lib/planetTextures';

export interface LaunchViewState {
  sample: AscentSample;
  paused: boolean;
  speed: number;
  compression: number;
}

export type CameraMode = 'cinematic' | 'chase' | 'orbit' | 'side' | 'cockpit' | 'far';

export interface LaunchCameraApi {
  setMode: (m: CameraMode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

interface Props {
  getState: () => LaunchViewState;
  onFrame?: (dt: number) => void;
  reducedMotion?: boolean;
  mode: CameraMode;
  onModeChange?: (m: CameraMode) => void;
  apiRef?: React.Ref<LaunchCameraApi>;
  vehicleLabel?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────
const R = 6371;                 // km
const LAT = 28.6;               // launch site latitude (Florida coast)
const LON = -80.6;
const MOUNT_H = 0.012;          // 12 m launch mount
const M = 0.001;                // metres → km
const EARTH_SPIN = 0.0012;      // rad per real second (visual, ~1.5 h per turn)
const CLOUD_DRIFT = 0.0005;
const SUN_DIR = new THREE.Vector3(1, 0.26, 0.3).normalize(); // early morning: sun ~14° above the eastern horizon

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const sstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Pad-frame position of the vehicle (x = east/downrange, y = up at pad, z = south). */
function vehicleLocal(s: AscentSample, out = new THREE.Vector3()) {
  const th = s.downrangeKm / R;
  const r = R + s.altitudeKm + MOUNT_H;
  return out.set(Math.sin(th) * r, Math.cos(th) * r - R, 0);
}
/** Pad-frame unit vectors at the vehicle. */
function vehicleBasis(s: AscentSample) {
  const th = s.downrangeKm / R;
  const up = new THREE.Vector3(Math.sin(th), Math.cos(th), 0);
  const east = new THREE.Vector3(Math.cos(th), -Math.sin(th), 0);
  const p = (s.pitchDeg * Math.PI) / 180;
  const axis = up.clone().multiplyScalar(Math.cos(p)).addScaledVector(east, Math.sin(p)).normalize();
  return { up, east, axis };
}

// ── Shaders ───────────────────────────────────────────────────────────────
const EARTH_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
  }
`;
const EARTH_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform vec3 sunDir;
  uniform float uDetail;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    #include <logdepthbuf_fragment>
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float ndl = dot(N, sunDir);
    float day = smoothstep(-0.10, 0.20, ndl);
    vec3 albedo = texture2D(dayMap, vUv).rgb;
    // Close to the surface the 2K map is magnified: add multi-octave terrain detail
    if (uDetail > 0.0) {
      vec3 q = vW * 0.08;
      float d = n3(q) * 0.5 + n3(q * 2.7) * 0.3 + n3(q * 7.9) * 0.2;
      albedo *= mix(1.0, 0.72 + 0.56 * d, uDetail);
    }
    vec3 col = albedo * (max(ndl, 0.0) * 1.15 + 0.015);
    // twilight band
    float band = smoothstep(0.28, 0.0, abs(ndl)) * day;
    col += vec3(1.0, 0.42, 0.18) * band * 0.10;
    // ocean glint
    float ocean = texture2D(specMap, vUv).r;
    vec3 H = normalize(sunDir + V);
    col += vec3(1.0, 0.92, 0.8) * pow(max(dot(N, H), 0.0), 70.0) * ocean * 0.7 * day;
    // city lights on the night side
    vec3 lights = texture2D(nightMap, vUv).rgb;
    col += lights * vec3(1.0, 0.78, 0.5) * (1.0 - day) * 1.5;
    // atmospheric haze toward the limb
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col = mix(col, vec3(0.32, 0.58, 1.0) * (0.05 + day * 0.75), fres * 0.45);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const CLOUD_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  uniform float opacity;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 N = normalize(vN);
    float ndl = dot(N, sunDir);
    vec2 px = vec2(1.0 / 4096.0, 1.0 / 2048.0);
    float a = texture2D(cloudMap, vUv).r * 0.4
      + (texture2D(cloudMap, vUv + vec2(px.x, 0.0)).r + texture2D(cloudMap, vUv - vec2(px.x, 0.0)).r
      +  texture2D(cloudMap, vUv + vec2(0.0, px.y)).r + texture2D(cloudMap, vUv - vec2(0.0, px.y)).r) * 0.15;
    a = smoothstep(0.08, 0.85, a);
    float lit = smoothstep(-0.15, 0.35, ndl);
    vec3 col = mix(vec3(0.02, 0.03, 0.05), vec3(1.0), lit);
    col = mix(col, vec3(1.0, 0.6, 0.38), smoothstep(0.3, 0.0, abs(ndl)) * lit * 0.5);
    gl_FragColor = vec4(col, pow(a, 1.5) * opacity * (0.25 + 0.75 * lit));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const ATMO_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 sunDir;
  uniform float opacity;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float rim = pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), 3.5);
    float sun = smoothstep(-0.35, 0.45, dot(N, sunDir));
    float band = smoothstep(0.35, 0.0, abs(dot(N, sunDir)));
    vec3 col = mix(vec3(0.25, 0.55, 1.0), vec3(1.0, 0.5, 0.25), band * 0.6);
    gl_FragColor = vec4(col * (0.15 + sun * 1.4), rim * opacity * (0.2 + sun));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const SKY_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vDir;
  void main() {
    vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;
const SKY_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 sunDir;
  uniform vec3 localUp;
  uniform float density;
  varying vec3 vDir;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 d = normalize(vDir);
    float elev = dot(d, localUp);
    float toSun = max(dot(d, sunDir), 0.0);
    vec3 horizon = mix(vec3(0.16, 0.24, 0.42), vec3(0.95, 0.52, 0.26), pow(toSun, 3.0));
    vec3 zenith = vec3(0.012, 0.035, 0.1);
    vec3 col = mix(horizon, zenith, pow(clamp(elev, 0.0, 1.0), 0.42));
    col += vec3(1.0, 0.75, 0.5) * pow(toSun, 60.0) * 1.5;   // sun disc glow
    col = mix(col, vec3(0.08, 0.1, 0.14), smoothstep(0.0, -0.25, elev));
    gl_FragColor = vec4(col, density);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const POINTS_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute float aSize;
  attribute float aAlpha;
  attribute float aHeat;
  uniform float uScale;
  varying float vAlpha;
  varying float vHeat;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * uScale / max(-mv.z, 1e-4), 0.0, 1024.0);
    vAlpha = aAlpha;
    vHeat = aHeat;
    #include <logdepthbuf_vertex>
  }
`;
const SMOKE_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 litColor;
  varying float vAlpha;
  varying float vHeat;
  void main() {
    #include <logdepthbuf_fragment>
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    float n = 0.85 + 0.15 * sin(c.x * 23.0 + c.y * 17.0);
    vec3 col = mix(litColor, vec3(1.0, 0.55, 0.22), vHeat);
    gl_FragColor = vec4(col * n, a * a * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const FIRE_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  varying float vAlpha;
  varying float vHeat;
  void main() {
    #include <logdepthbuf_fragment>
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.95, 0.8), vHeat);
    gl_FragColor = vec4(col * 1.6, a * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const PLUME_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
  }
`;
const PLUME_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uCore;
  uniform vec3 uEdge;
  uniform float uDiamonds;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    #include <logdepthbuf_fragment>
    float along = 1.0 - vUv.y;           // 0 at nozzle, 1 at tail
    vec3 V = normalize(cameraPosition - vW);
    float facing = abs(dot(normalize(vN), V));
    float body = pow(facing, 1.4);
    float flick = 0.88 + 0.12 * sin(uTime * 63.0 + along * 30.0);
    float fade = pow(1.0 - along, 1.6);
    float diamonds = uDiamonds * smoothstep(0.55, 1.0, 0.5 + 0.5 * cos(along * 40.0)) * (1.0 - smoothstep(0.0, 0.45, along));
    vec3 col = mix(uEdge, uCore, clamp(body * (1.0 - along) + diamonds, 0.0, 1.0));
    float a = (body * 0.85 + 0.15) * fade * flick * uIntensity;
    gl_FragColor = vec4(col * (1.0 + diamonds), a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w * 0.999999;
    gl_PointSize = aSize;
    vTw = 0.7 + 0.3 * sin(uTime * (0.7 + aPhase * 2.0) + aPhase * 50.0);
  }
`;
const STAR_FRAG = /* glsl */ `
  uniform float uVisible;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 2.0) * vTw * uVisible;
    gl_FragColor = vec4(vec3(0.92, 0.95, 1.0), a);
  }
`;

// ── Procedural textures ───────────────────────────────────────────────────
function groundTexture() {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  // land
  g.fillStyle = '#28301f';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 4 + Math.random() * 26;
    g.fillStyle = `rgba(${30 + Math.random() * 30},${38 + Math.random() * 28},${22 + Math.random() * 18},0.35)`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // lagoon west of the pad
  g.fillStyle = '#12304a';
  g.beginPath();
  g.moveTo(S * 0.38, 0);
  for (let y = 0; y <= S; y += 16) g.lineTo(S * 0.38 + Math.sin(y * 0.02) * 14 + Math.sin(y * 0.071) * 6, y);
  for (let y = S; y >= 0; y -= 16) g.lineTo(S * 0.42 + Math.sin(y * 0.017) * 12, y);
  g.fill();
  // Atlantic east of the coastline
  g.fillStyle = '#0b2540';
  g.beginPath();
  g.moveTo(S, 0);
  for (let y = 0; y <= S; y += 8) g.lineTo(S * 0.535 + Math.sin(y * 0.013) * 22 + Math.sin(y * 0.05) * 5, y);
  g.lineTo(S, S);
  g.fill();
  // surf line
  g.strokeStyle = 'rgba(220,230,240,0.35)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let y = 0; y <= S; y += 8) {
    const x = S * 0.535 + Math.sin(y * 0.013) * 22 + Math.sin(y * 0.05) * 5;
    if (y === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  // roads + crawlerway
  g.strokeStyle = 'rgba(150,150,140,0.5)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(S * 0.5, S * 0.5); g.lineTo(S * 0.3, S * 0.95); g.stroke();
  g.beginPath(); g.moveTo(S * 0.5, S * 0.5); g.lineTo(S * 0.47, S * 0.05); g.stroke();
  // pad apron
  g.fillStyle = '#7d7f80';
  g.beginPath(); g.arc(S / 2, S / 2, 5, 0, Math.PI * 2); g.fill();
  // town lights (warm) on the mainland
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * S * 0.36, y = Math.random() * S;
    g.fillStyle = `rgba(255,${190 + Math.random() * 50},${120 + Math.random() * 60},${0.3 + Math.random() * 0.6})`;
    g.fillRect(x, y, 1.6, 1.6);
  }
  // radial alpha fade so the patch melts into the global sphere
  const out = document.createElement('canvas');
  out.width = out.height = S;
  const o = out.getContext('2d')!;
  o.drawImage(c, 0, 0);
  o.globalCompositeOperation = 'destination-in';
  const rg = o.createRadialGradient(S / 2, S / 2, S * 0.22, S / 2, S / 2, S * 0.5);
  rg.addColorStop(0, 'rgba(0,0,0,1)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = rg;
  o.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function latticeTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 512;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 64, 512);
  g.strokeStyle = '#9c3b33';
  g.lineWidth = 4;
  g.strokeRect(2, 0, 60, 512);
  g.lineWidth = 2.5;
  for (let y = 0; y < 512; y += 32) {
    g.beginPath(); g.moveTo(2, y); g.lineTo(62, y + 32); g.moveTo(62, y); g.lineTo(2, y + 32); g.stroke();
    g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── Rocket model (built in metres, scaled to km) ──────────────────────────
function buildRocket() {
  const white = new THREE.MeshStandardMaterial({ color: '#eef1f5', roughness: 0.5, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: '#16191f', roughness: 0.7, metalness: 0.2 });
  const metal = new THREE.MeshStandardMaterial({ color: '#4a4038', roughness: 0.35, metalness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d4a03c', roughness: 0.3, metalness: 0.9, emissive: '#2a1a00' });
  const panel = new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.3, metalness: 0.6 });
  const rad = 1.85;

  const root = new THREE.Group();
  root.scale.setScalar(M);

  // Stage 1 (origin at base of the tank section)
  const s1 = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 42, 32), white);
  tank.position.y = 21;
  s1.add(tank);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.04, rad * 1.08, 2.4, 32), dark);
  skirt.position.y = 1.0;
  s1.add(skirt);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.005, rad * 1.005, 1.2, 32), dark);
  band.position.y = 30;
  s1.add(band);
  const inter = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.01, rad * 1.01, 6.5, 32), dark);
  inter.position.y = 45.25;
  s1.add(inter);
  // 9 engine bells
  const bellGeo = new THREE.CylinderGeometry(0.28, 0.48, 2.2, 16, 1, true);
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(bellGeo, metal);
    const a = (i / 8) * Math.PI * 2;
    const rr = i === 8 ? 0 : 1.15;
    b.position.set(Math.cos(a) * rr, -1.1, Math.sin(a) * rr);
    s1.add(b);
  }
  // Grid fins
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.08), dark);
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    fin.position.set(Math.cos(a) * (rad + 0.55), 40.5, Math.sin(a) * (rad + 0.55));
    fin.lookAt(fin.position.x * 3, 40.5, fin.position.z * 3);
    s1.add(fin);
  }
  root.add(s1);

  // Stage 2 + payload
  const s2 = new THREE.Group();
  s2.position.y = 48.5;
  const s2tank = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 11, 32), white);
  s2tank.position.y = 5.5;
  s2.add(s2tank);
  const mvac = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.5, 4.5, 24, 1, true), metal);
  mvac.position.y = -2.25;
  s2.add(mvac);
  const payload = new THREE.Group();
  const bus = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 2.0), gold);
  bus.position.y = 13.4;
  payload.add(bus);
  for (const side of [-1, 1]) {
    const arr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 1.6), panel);
    arr.position.set(side * 1.1, 13.4, 0);
    payload.add(arr);
  }
  s2.add(payload);
  // Fairing halves (lathe, half revolution each)
  const prof: THREE.Vector2[] = [];
  const fr = 2.6;
  prof.push(new THREE.Vector2(rad * 1.02, 0));
  prof.push(new THREE.Vector2(fr, 1.5));
  prof.push(new THREE.Vector2(fr, 7.5));
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    prof.push(new THREE.Vector2(fr * Math.cos(a), 7.5 + Math.sin(a) * 6.5));
  }
  const fairings: THREE.Mesh[] = [];
  for (let k = 0; k < 2; k++) {
    const geo = new THREE.LatheGeometry(prof, 24, k * Math.PI, Math.PI);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#f1f3f6', roughness: 0.45, side: THREE.DoubleSide }));
    m.position.y = 11;
    s2.add(m);
    fairings.push(m);
  }
  root.add(s2);

  // Plumes (cones pointing down, apex trimmed). Geometry spans y ∈ [-1, 0]: scaled per frame.
  const plumeGeo = new THREE.CylinderGeometry(0.15, 1, 1, 32, 12, true);
  plumeGeo.translate(0, -0.5, 0);
  const mkPlume = (core: string, edge: string) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uIntensity: { value: 0 }, uDiamonds: { value: 0 },
        uCore: { value: new THREE.Color(core) }, uEdge: { value: new THREE.Color(edge) },
      },
      vertexShader: PLUME_VERT, fragmentShader: PLUME_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
  const plume1Mat = mkPlume('#fff3d6', '#ff7a2a');
  const plume1 = new THREE.Mesh(plumeGeo, plume1Mat);
  plume1.position.y = -2.2;
  plume1.frustumCulled = false;
  s1.add(plume1);
  const plume2Mat = mkPlume('#ffe0b8', '#6f86ff');
  const plume2 = new THREE.Mesh(plumeGeo, plume2Mat);
  plume2.position.y = -4.5;
  plume2.frustumCulled = false;
  s2.add(plume2);

  return { root, s1, s2, fairings, plume1, plume1Mat, plume2, plume2Mat };
}

// ── Particle pool (pad-frame coordinates, km) ─────────────────────────────
class Pool {
  n: number;
  pos: Float32Array; vel: Float32Array;
  size: Float32Array; grow: Float32Array;
  alpha: Float32Array; a0: Float32Array;
  heat: Float32Array; cool: Float32Array;
  life: Float32Array; max: Float32Array;
  drag: Float32Array;
  idx = 0;
  geo: THREE.BufferGeometry;
  constructor(n: number) {
    this.n = n;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3);
    this.size = new Float32Array(n); this.grow = new Float32Array(n);
    this.alpha = new Float32Array(n); this.a0 = new Float32Array(n);
    this.heat = new Float32Array(n); this.cool = new Float32Array(n);
    this.life = new Float32Array(n); this.max = new Float32Array(n).fill(0);
    this.drag = new Float32Array(n);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aHeat', new THREE.BufferAttribute(this.heat, 1).setUsage(THREE.DynamicDrawUsage));
  }
  spawn(p: THREE.Vector3, v: THREE.Vector3, size: number, grow: number, life: number, alpha: number, heat: number, cool: number, drag: number) {
    const i = this.idx;
    this.idx = (this.idx + 1) % this.n;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    this.vel[i * 3] = v.x; this.vel[i * 3 + 1] = v.y; this.vel[i * 3 + 2] = v.z;
    this.size[i] = size; this.grow[i] = grow; this.life[i] = 0; this.max[i] = life;
    this.a0[i] = alpha; this.alpha[i] = alpha; this.heat[i] = heat; this.cool[i] = cool; this.drag[i] = drag;
  }
  update(dt: number, buoyancy: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.max[i] <= 0) continue;
      this.life[i] += dt;
      if (this.life[i] >= this.max[i]) { this.max[i] = 0; this.alpha[i] = 0; continue; }
      const k = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k + buoyancy * dt; this.vel[i * 3 + 2] *= k;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] += this.grow[i] * dt;
      const lt = this.life[i] / this.max[i];
      this.alpha[i] = this.a0[i] * (1 - lt) * Math.min(1, this.life[i] * 5);
      this.heat[i] = Math.max(0, this.heat[i] - this.cool[i] * dt);
    }
    for (const n of ['position', 'aSize', 'aAlpha', 'aHeat']) (this.geo.getAttribute(n) as THREE.BufferAttribute).needsUpdate = true;
  }
}

interface Pose { pos: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3; fov: number }

export const LaunchScene3D: React.FC<Props> = ({
  getState, onFrame, reducedMotion = false, mode, onModeChange, apiRef, vehicleLabel = 'VEHICLE',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<HTMLDivElement | null>(null);
  const getStateRef = useRef(getState);
  const onFrameRef = useRef(onFrame);
  const reducedRef = useRef(reducedMotion);
  const modeRef = useRef<CameraMode>(mode);
  const onModeRef = useRef(onModeChange);
  const ctrlRef = useRef<LaunchCameraApi | null>(null);
  useEffect(() => {
    getStateRef.current = getState;
    onFrameRef.current = onFrame;
    reducedRef.current = reducedMotion;
    onModeRef.current = onModeChange;
  });
  // Mode changes from the parent (toolbar / keyboard)
  useEffect(() => {
    if (modeRef.current !== mode) ctrlRef.current?.setMode(mode);
  }, [mode]);

  useImperativeHandle(apiRef, () => ({
    setMode: m => ctrlRef.current?.setMode(m),
    zoomIn: () => ctrlRef.current?.zoomIn(),
    zoomOut: () => ctrlRef.current?.zoomOut(),
    reset: () => ctrlRef.current?.reset(),
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const w0 = host.clientWidth || 800;
    const lowEnd = w0 < 700 || (navigator.hardwareConcurrency || 4) <= 4;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.75);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowEnd, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
    } catch {
      host.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font:13px monospace">WebGL unavailable — telemetry continues below</div>';
      return;
    }
    renderer.setPixelRatio(pixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D launch view. Drag to orbit, scroll to zoom.');
    renderer.domElement.setAttribute('role', 'img');
    host.appendChild(renderer.domElement);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    // Background pass (stars + sky) is rendered first, then depth is cleared for the world
    const bgScene = new THREE.Scene();
    renderer.autoClear = false;
    const camera = new THREE.PerspectiveCamera(50, 1, 0.0004, 3e6);

    // ── Planet frame: pivot at Earth centre, pad frame at the surface ──
    const pivot = new THREE.Group();
    pivot.position.set(0, -R, 0);
    scene.add(pivot);
    const pad = new THREE.Group();
    pad.position.set(0, R, 0);
    pivot.add(pad);
    const phi = (LAT * Math.PI) / 180;
    const spinAxis = new THREE.Vector3(0, Math.sin(phi), -Math.cos(phi)).normalize();

    // Sphere orientation so (LAT, LON) faces pivot +Y, east → +X, north → −Z
    const sphereDir = (lat: number, lon: number) => {
      const u = (lon + 180) / 360;
      const ph = u * Math.PI * 2;
      const th = ((90 - lat) * Math.PI) / 180;
      return new THREE.Vector3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
    };
    const U = sphereDir(LAT, LON);
    const Nn = new THREE.Vector3(0, 1, 0).addScaledVector(U, -U.y).normalize();
    const E = new THREE.Vector3().crossVectors(Nn, U).normalize();
    const L = new THREE.Matrix4().makeBasis(E, U, Nn.clone().negate());
    const earthQuat = new THREE.Quaternion().setFromRotationMatrix(L.clone().transpose());

    const loader = new THREE.TextureLoader();
    const tex = (url: string, srgb: boolean) => {
      const t = loader.load(url);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = maxAniso;
      return t;
    };
    const dayMap = tex('/textures/earth_surface_2k.jpg', true);
    const nightMap = tex('/textures/earth_lights_2k.png', true);
    const specMap = tex('/textures/earth_specular_2k.jpg', false);
    const cloudMap = tex('/textures/earth_clouds_4k.png', false);

    const segs = lowEnd ? 128 : 224;
    const earthGeo = new THREE.SphereGeometry(R, segs, segs / 2);
    const earthMat = new THREE.ShaderMaterial({
      uniforms: { dayMap: { value: dayMap }, nightMap: { value: nightMap }, specMap: { value: specMap }, sunDir: { value: SUN_DIR.clone() }, uDetail: { value: 0 } },
      vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.quaternion.copy(earthQuat);
    pivot.add(earth);

    const cloudGeo = new THREE.SphereGeometry(R + 9, segs, segs / 2);
    const cloudMat = new THREE.ShaderMaterial({
      uniforms: { cloudMap: { value: cloudMap }, sunDir: { value: SUN_DIR.clone() }, opacity: { value: 0 } },
      vertexShader: EARTH_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    clouds.quaternion.copy(earthQuat);
    pivot.add(clouds);

    const atmoGeo = new THREE.SphereGeometry(R + 110, 128, 64);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { sunDir: { value: SUN_DIR.clone() }, opacity: { value: 0 } },
      vertexShader: EARTH_VERT, fragmentShader: ATMO_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    pivot.add(atmo);

    // ── Launch site (pad frame) ──
    const groundGeo = new THREE.PlaneGeometry(90, 90, 96, 96);
    groundGeo.rotateX(-Math.PI / 2);
    {
      const p = groundGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        p.setY(i, -(x * x + z * z) / (2 * R) + 0.002);
      }
      groundGeo.computeVertexNormals();
    }
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.92, metalness: 0, transparent: true, depthWrite: true });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    pad.add(ground);

    const concrete = new THREE.MeshStandardMaterial({ color: '#5e6166', roughness: 0.95 });
    const steel = new THREE.MeshStandardMaterial({ color: '#59606b', roughness: 0.6, metalness: 0.5 });
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.003, 48), concrete);
    apron.position.y = 0.0015;
    pad.add(apron);
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.014, MOUNT_H, 0.014), steel);
    mount.position.y = MOUNT_H / 2 + 0.002;
    pad.add(mount);
    const trench = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.0015, 0.11), new THREE.MeshStandardMaterial({ color: '#0b0c0e', roughness: 1 }));
    trench.position.y = 0.0032;
    pad.add(trench);
    const towerTex = latticeTexture();
    const towerMat = new THREE.MeshStandardMaterial({ map: towerTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.085, 0.009), towerMat);
    tower.position.set(0, 0.0445, -0.016); // north of the vehicle: cameras on the south side see the rocket clear of the tower
    pad.add(tower);
    const arms: THREE.Mesh[] = [];
    for (const h of [0.03, 0.06]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.0012, 0.010), steel);
      arm.geometry.translate(0, 0, 0.005);
      arm.position.set(0, h, -0.0115);
      pad.add(arm);
      arms.push(arm);
    }
    for (const sx of [-0.11, 0.11]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0012, 0.18, 8), steel);
      mast.position.set(sx, 0.09, -0.04);
      pad.add(mast);
    }

    // Low cloud puffs around the site (2–7 km) give a sense of climb speed
    const cloudPool = new Pool(lowEnd ? 90 : 160);
    {
      const v0 = new THREE.Vector3();
      for (let i = 0; i < cloudPool.n; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 35;
        const p = new THREE.Vector3(Math.cos(a) * r, 2 + Math.random() * 5, Math.sin(a) * r);
        cloudPool.spawn(p, v0, 0.8 + Math.random() * 2.2, 0, 1e9, 0.55, 0, 0, 0);
      }
      cloudPool.update(0.0001, 0);
    }
    const lowCloudMat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 }, litColor: { value: new THREE.Color('#c9cfdb') } },
      vertexShader: POINTS_VERT, fragmentShader: SMOKE_FRAG, transparent: true, depthWrite: false,
    });
    const lowClouds = new THREE.Points(cloudPool.geo, lowCloudMat);
    lowClouds.frustumCulled = false;
    pad.add(lowClouds);

    // ── Rocket ──
    const rk = buildRocket();
    pad.add(rk.root);

    // ── Particles ──
    const smoke = new Pool(lowEnd ? 1400 : 3200);
    const fire = new Pool(lowEnd ? 500 : 1100);
    const smokeMat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 }, litColor: { value: new THREE.Color('#d9dde6') } },
      vertexShader: POINTS_VERT, fragmentShader: SMOKE_FRAG, transparent: true, depthWrite: false,
    });
    const fireMat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 } },
      vertexShader: POINTS_VERT, fragmentShader: FIRE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const smokePts = new THREE.Points(smoke.geo, smokeMat);
    const firePts = new THREE.Points(fire.geo, fireMat);
    smokePts.frustumCulled = false;
    firePts.frustumCulled = false;
    pad.add(smokePts, firePts);

    // ── Trajectory + parking orbit (visible from afar) ──
    const trajPts: THREE.Vector3[] = [];
    for (let t = 0; t <= EVENTS.SECO; t += 2) trajPts.push(vehicleLocal(sampleAscent(t)));
    const trajGeo = new THREE.BufferGeometry().setFromPoints(trajPts);
    const trajMat = new THREE.LineBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0 });
    const traj = new THREE.Line(trajGeo, trajMat);
    traj.frustumCulled = false;
    pad.add(traj);
    const flownGeo = new THREE.BufferGeometry().setFromPoints(trajPts);
    const flownMat = new THREE.LineBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0 });
    const flown = new THREE.Line(flownGeo, flownMat);
    flown.frustumCulled = false;
    pad.add(flown);
    const orbitPts: THREE.Vector3[] = [];
    const ro = R + 200 + MOUNT_H;
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.sin(a) * ro, Math.cos(a) * ro - R, 0));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineDashedMaterial({ color: '#67e8f9', dashSize: 120, gapSize: 80, transparent: true, opacity: 0 });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    orbitLine.frustumCulled = false;
    pad.add(orbitLine);

    // ── Distant celestial objects: Moon ──
    const moonTex = getMoonTextures();
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1737 * 0.45, 48, 24),
      new THREE.MeshStandardMaterial({ map: moonTex.map, bumpMap: moonTex.bumpMap, bumpScale: 2, roughness: 1 }),
    );
    moon.position.copy(new THREE.Vector3(-0.55, 0.42, -0.72).normalize().multiplyScalar(170000));
    scene.add(moon);

    // ── Star field (follows camera; infinitely far) ──
    const STARS = lowEnd ? 2200 : 4200;
    const sp = new Float32Array(STARS * 3);
    const ss = new Float32Array(STARS);
    const sph = new Float32Array(STARS);
    for (let i = 0; i < STARS; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      // concentrate ~35% of stars into a Milky-Way band
      const band = i % 3 === 0;
      const y = band ? (Math.random() - 0.5) * 0.25 : u;
      const rr = band ? Math.sqrt(1 - y * y) : r;
      sp[i * 3] = Math.cos(a) * rr * 1000; sp[i * 3 + 1] = y * 1000; sp[i * 3 + 2] = Math.sin(a) * rr * 1000;
      ss[i] = (0.6 + Math.pow(Math.random(), 4) * 2.6) * pixelRatio;
      sph[i] = Math.random();
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(ss, 1));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(sph, 1));
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uVisible: { value: 0 } },
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, depthTest: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    stars.rotation.set(0.6, 0.2, 1.1);
    stars.renderOrder = -10;
    stars.frustumCulled = false;
    bgScene.add(stars);

    // ── Sky dome (near ground) ──
    const skyMat = new THREE.ShaderMaterial({
      uniforms: { sunDir: { value: SUN_DIR.clone() }, localUp: { value: new THREE.Vector3(0, 1, 0) }, density: { value: 1 } },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), skyMat);
    sky.renderOrder = -9;
    sky.frustumCulled = false;
    bgScene.add(sky);

    // ── Lights ──
    const sun = new THREE.DirectionalLight('#fff1e0', 3.2);
    sun.position.copy(SUN_DIR).multiplyScalar(1e5);
    scene.add(sun);
    const hemi = new THREE.HemisphereLight('#6d88b8', '#1a1510', 0.45);
    scene.add(hemi);
    const engineLight = new THREE.PointLight('#ff9a4a', 0, 0.9, 1.2);
    pad.add(engineLight);

    // ── Debris (detached stages) ──
    interface Debris { obj: THREE.Object3D; vel: THREE.Vector3; spin: THREE.Vector3; age: number }
    const debris: Debris[] = [];

    // ── Camera control ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.025;
    controls.maxDistance = 60000;
    controls.zoomSpeed = 1.1;
    controls.screenSpacePanning = true;
    controls.enabled = false;
    let zoom = 1;
    let curMode: CameraMode = modeRef.current;
    let blendFrom: Pose | null = null;
    let blendT = 1;
    let blendDur = 2.2;
    let shotId = '';
    let shotFrom: Pose | null = null;
    let shotT = 1;
    const lastPose: Pose = { pos: new THREE.Vector3(0.3, 0.05, 0.3), target: new THREE.Vector3(0, 0.04, 0), up: new THREE.Vector3(0, 1, 0), fov: 50 };
    const prevRocketW = new THREE.Vector3();
    let freeInit = false;
    const keys = new Set<string>();

    const clonePose = (p: Pose): Pose => ({ pos: p.pos.clone(), target: p.target.clone(), up: p.up.clone(), fov: p.fov });

    const setMode = (m: CameraMode) => {
      if (m === curMode) return;
      blendFrom = clonePose(lastPose);
      blendT = 0;
      blendDur = reducedRef.current ? 0.01 : m === 'far' || curMode === 'far' ? 3.0 : 1.8;
      curMode = m;
      modeRef.current = m;
      controls.enabled = m === 'orbit';
      freeInit = false;
      onModeRef.current?.(m);
    };
    ctrlRef.current = {
      setMode,
      zoomIn: () => {
        if (curMode === 'orbit') { tmpV.subVectors(camera.position, controls.target).multiplyScalar(0.75); camera.position.copy(controls.target).add(tmpV); }
        else zoom = clamp(zoom * 0.75, 0.25, 12);
      },
      zoomOut: () => {
        if (curMode === 'orbit') { tmpV.subVectors(camera.position, controls.target).multiplyScalar(1.33); camera.position.copy(controls.target).add(tmpV); }
        else zoom = clamp(zoom * 1.33, 0.25, 12);
      },
      reset: () => { zoom = 1; setMode('cinematic'); },
    };

    // Dragging the view in a preset hands control to the free camera (capture phase → before OrbitControls)
    const onPointerDown = (e: PointerEvent) => {
      if (curMode !== 'orbit' && (e.button === 0 || e.button === 2)) setMode('orbit');
    };
    const onWheel = (e: WheelEvent) => {
      if (curMode !== 'orbit') {
        e.preventDefault();
        zoom = clamp(zoom * Math.exp(e.deltaY * 0.0012), 0.25, 12);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown, { capture: true });
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(k)) {
        keys.add(k);
        if (curMode !== 'orbit') setMode('orbit');
      } else if (k === 'r') {
        ctrlRef.current?.reset();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Pose helpers (world space)
    const toWorld = (v: THREE.Vector3) => v.applyMatrix4(pad.matrixWorld);
    const dirWorld = (v: THREE.Vector3) => v.transformDirection(pad.matrixWorld);

    const posePreset = (m: CameraMode | string, s: AscentSample, P: THREE.Vector3, b: { up: THREE.Vector3; east: THREE.Vector3; axis: THREE.Vector3 }, time: number): Pose => {
      const Uw = dirWorld(b.up.clone());
      const Ew = dirWorld(b.east.clone());
      const Aw = dirWorld(b.axis.clone());
      const Nw = dirWorld(new THREE.Vector3(0, 0, -1));
      let B = Uw.clone().addScaledVector(Aw, -Uw.dot(Aw));
      B = B.lengthSq() < 1e-6 ? Ew.clone().negate() : B.normalize(); // "away from Earth" ⟂ to the body axis
      const C = new THREE.Vector3().setFromMatrixPosition(pivot.matrixWorld);
      const alt = s.altitudeKm;
      const z = zoom;
      const pose: Pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), up: Uw.clone(), fov: 50 };
      switch (m) {
        case 'chase': {
          // Near the ground the "behind" position would be underground: use a low south-side chase instead
          const g = sstep(0.3, 4, alt);
          const behind = Aw.clone().multiplyScalar(-0.16).addScaledVector(Nw, 0.05).addScaledVector(B, 0.03);
          const low = Nw.clone().multiplyScalar(-0.13).addScaledVector(Aw, -0.035).addScaledVector(Ew, 0.03);
          pose.pos.copy(P).addScaledVector(low.lerp(behind, g), z);
          pose.target.copy(P).addScaledVector(Aw, 0.035);
          pose.fov = 55;
          break;
        }
        case 'side': {
          const d = (0.45 + alt * 0.9) * z;
          pose.pos.copy(P).addScaledVector(Nw, d).addScaledVector(Uw, d * 0.12);
          pose.target.copy(P).addScaledVector(Uw, -alt * 0.18);
          pose.fov = 45;
          break;
        }
        case 'cockpit': {
          pose.pos.copy(P).addScaledVector(Aw, 0.0705).addScaledVector(B, 0.0032);
          const look = Aw.clone().addScaledVector(B, -0.55).normalize();
          pose.target.copy(pose.pos).addScaledVector(look, 1);
          pose.up.copy(B);
          pose.fov = 68;
          break;
        }
        case 'far': {
          const dir = Uw.clone().multiplyScalar(1).addScaledVector(Nw, 0.55).addScaledVector(Ew, -0.25).normalize();
          pose.pos.copy(C).addScaledVector(dir, R * 2.7 * z);
          pose.target.copy(C).lerp(P, 0.45);
          pose.up.copy(Nw);
          pose.fov = 40;
          break;
        }
        // ── Cinematic shots ──
        case 'pad-orbit': {
          // slow arc across the south side of the pad (tower stays behind the vehicle)
          const a = Math.PI / 2 + Math.sin(time * 0.07) * 0.85;
          const padW = toWorld(new THREE.Vector3(0, 0, 0));
          const off = Ew.clone().multiplyScalar(Math.cos(a) * 0.24).addScaledVector(Nw, -Math.sin(a) * 0.24).addScaledVector(Uw, 0.022);
          pose.pos.copy(padW).addScaledVector(off, z);
          pose.target.copy(P).addScaledVector(Uw, 0.04);
          pose.fov = 42;
          break;
        }
        case 'ground-track': {
          pose.pos.copy(toWorld(new THREE.Vector3(0.2 * z, 0.006, 0.26 * z)));
          pose.target.copy(P).addScaledVector(Aw, 0.03);
          pose.fov = clamp(40 - s.altitudeKm * 4, 18, 40);
          break;
        }
        case 'low-chase':
          pose.pos.copy(P).addScaledVector(Aw, -0.22 * z).addScaledVector(Nw, 0.09 * z).addScaledVector(Ew, -0.04 * z);
          pose.target.copy(P).addScaledVector(Aw, 0.05);
          pose.fov = 50;
          break;
        case 'reveal': {
          const d = (0.7 + alt * 0.75) * z;
          pose.pos.copy(P).addScaledVector(Nw, d).addScaledVector(Aw, -d * 0.35).addScaledVector(B, d * 0.15);
          pose.target.copy(P).addScaledVector(Uw, -alt * 0.22);
          pose.fov = 48;
          break;
        }
        case 'staging':
          pose.pos.copy(P).addScaledVector(Nw, 0.32 * z).addScaledVector(Aw, -0.1 * z).addScaledVector(B, 0.1 * z);
          pose.target.copy(P).addScaledVector(Aw, -0.04);
          pose.fov = 46;
          break;
        case 'upper': {
          // trailing camera above the flight path: vehicle centred, Earth's limb fills the lower frame
          const k = sstep(EVENTS.SES1 + 10, EVENTS.INSERTION_START, s.t);
          const d = (0.25 + k * 0.45) * z;
          pose.pos.copy(P).addScaledVector(Aw, -d).addScaledVector(Uw, d * 0.35).addScaledVector(Nw, d * 0.25);
          pose.target.copy(P).addScaledVector(Aw, d * 0.6);
          pose.fov = 55;
          break;
        }
        case 'orbital': {
          const d = 2600 * z;
          pose.pos.copy(P).addScaledVector(Uw, d * 0.55).addScaledVector(Nw, d * 0.8).addScaledVector(Aw, -d * 0.35);
          pose.target.copy(P).lerp(C, 0.4);
          pose.up.copy(Uw);
          pose.fov = 45;
          break;
        }
      }
      return pose;
    };

    const cinematicShot = (s: AscentSample) => {
      if (s.t < -3) return 'pad-orbit';
      if (s.t < 10) return 'ground-track';
      if (s.t < 48) return 'low-chase';
      if (s.t < EVENTS.MECO - 6) return 'reveal';
      if (s.t < EVENTS.SES1 + 14) return 'staging';
      if (s.t < EVENTS.INSERTION_START) return 'upper';
      return 'orbital';
    };

    /** Blend two poses; position interpolates in log-distance around the rocket (smooth pull-backs). */
    const blendPose = (a: Pose, b: Pose, w: number, P: THREE.Vector3): Pose => {
      const da = tmpV.subVectors(a.pos, P);
      const db = tmpV2.subVectors(b.pos, P);
      const la = Math.max(1e-5, da.length()), lb = Math.max(1e-5, db.length());
      const dir = da.clone().divideScalar(la).lerp(db.clone().divideScalar(lb), w);
      if (dir.lengthSq() < 1e-8) dir.copy(db).normalize();
      dir.normalize();
      const len = Math.exp(Math.log(la) + (Math.log(lb) - Math.log(la)) * w);
      return {
        pos: P.clone().addScaledVector(dir, len),
        target: a.target.clone().lerp(b.target, w),
        up: a.up.clone().lerp(b.up, w).normalize(),
        fov: a.fov + (b.fov - a.fov) * w,
      };
    };

    // ── Layout ──
    const layout = () => {
      const w = host.clientWidth || 800, h = host.clientHeight || 450;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    layout();
    const roObs = new ResizeObserver(layout);
    roObs.observe(host);

    // ── Loop ──
    let raf = 0;
    let last = performance.now();
    let wall = 0;
    let spin = 0;
    let cloudSpin = 0;
    const cloudQ = new THREE.Quaternion();
    let prevStage: 1 | 2 = 1;
    let prevFairing = true;
    let prevT = -999;
    let shake = 0;
    const lastNozzle = new THREE.Vector3();
    let hasLastNozzle = false;
    const v = new THREE.Vector3();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dtReal = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      onFrameRef.current?.(dtReal);
      const st = getStateRef.current();
      const s = st.sample;
      const reduced = reducedRef.current;
      const dt = st.paused ? 0 : dtReal * Math.min(st.speed, 4);
      wall += dtReal;

      // Planet spin (pad, rocket and trajectory ride along in the pad frame)
      spin += dt * EARTH_SPIN;
      pivot.quaternion.setFromAxisAngle(spinAxis, spin);
      // clouds drift independently on top of the planet's spin
      cloudSpin += dtReal * CLOUD_DRIFT;
      cloudQ.setFromAxisAngle(spinAxis, cloudSpin);
      clouds.quaternion.copy(earthQuat).premultiply(cloudQ);
      scene.updateMatrixWorld();

      // Vehicle placement
      const b = vehicleBasis(s);
      const Pl = vehicleLocal(s);
      rk.root.position.copy(Pl);
      rk.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.axis);
      rk.root.updateMatrixWorld(true);

      // Swing arms retract before liftoff
      const armA = s.t > -2 ? Math.min(1, (s.t + 2) / 1.5) : 0;
      arms.forEach((a, i) => { a.rotation.y = armA * (i === 0 ? 1.3 : 1.1); });

      // Stage separation → detached ballistic stage
      const velLocal = vehicleLocal(sampleAscent(s.t + 0.5)).sub(Pl).multiplyScalar(2); // km per flight-second
      if (prevStage === 1 && s.stage === 2 && rk.s1.parent === rk.root) {
        pad.attach(rk.s1);
        debris.push({ obj: rk.s1, vel: velLocal.clone().addScaledVector(b.axis, -0.003), spin: new THREE.Vector3(0.02, 0, 0.05), age: 0 });
        shake += 0.6;
      }
      if (prevFairing && !s.fairingAttached) {
        rk.fairings.forEach((f, i) => {
          pad.attach(f);
          const side = new THREE.Vector3(0, 0, i === 0 ? 1 : -1).cross(b.axis).normalize();
          debris.push({ obj: f, vel: velLocal.clone().addScaledVector(side, i === 0 ? 0.006 : -0.006), spin: new THREE.Vector3(0.6, 0.2, i === 0 ? 0.5 : -0.5), age: 0 });
        });
        shake += 0.2;
      }
      if (prevT < 0 && s.t >= 0) shake += 0.9;
      prevStage = s.stage; prevFairing = s.fairingAttached; prevT = s.t;
      const flightDt = st.paused ? 0 : dtReal * st.compression * st.speed;
      for (const d of debris) {
        d.age += flightDt;
        // gravity toward Earth centre (pad frame centre at (0,−R,0)), km/s²
        tmpV.set(0, -R, 0).sub(d.obj.position).normalize().multiplyScalar(0.0098 * flightDt);
        d.vel.add(tmpV);
        d.obj.position.addScaledVector(d.vel, flightDt);
        d.obj.rotation.x += d.spin.x * dt; d.obj.rotation.y += d.spin.y * dt; d.obj.rotation.z += d.spin.z * dt;
        d.obj.visible = d.age < 120;
      }

      // Plumes
      const thr = s.throttle;
      const vac = 1 - s.atmosphere;
      const flick = 0.9 + 0.1 * Math.sin(wall * 47);
      rk.plume1Mat.uniforms.uTime.value = wall;
      rk.plume2Mat.uniforms.uTime.value = wall;
      const p1 = s.stage === 1 && s.engineRunning ? thr : 0;
      rk.plume1Mat.uniforms.uIntensity.value = p1 * (0.85 + 0.15 * flick);
      rk.plume1Mat.uniforms.uDiamonds.value = sstep(0.3, 0.8, s.atmosphere);
      rk.plume1.scale.set(1.6 + 26 * Math.pow(vac, 1.5), 32 + 120 * vac, 1.6 + 26 * Math.pow(vac, 1.5));
      rk.plume1.visible = p1 > 0.01;
      const p2 = s.stage === 2 && s.engineRunning ? thr : 0;
      rk.plume2Mat.uniforms.uIntensity.value = p2 * 0.3;
      rk.plume2.scale.set(26, 120, 26);
      rk.plume2.visible = p2 > 0.01;

      // Engine light on the pad, smoke, ground
      const nozzleLocal = new THREE.Vector3().copy(Pl).addScaledVector(b.axis, s.stage === 1 ? -0.0028 : 0.044);
      engineLight.position.copy(nozzleLocal).addScaledVector(b.axis, -0.01);
      engineLight.intensity = s.engineRunning && s.stage === 1 ? 6 * thr * (0.85 + 0.15 * flick) * (0.3 + s.atmosphere) : 0;

      // Emit particles (sub-stepped along the nozzle path so fast trails stay continuous)
      if (dt > 0) {
        if (s.t < 0) {
          // Cryogenic vent plumes from the LOX tank
          if (Math.random() < 0.6) {
            const side = Math.random() < 0.5 ? 1 : -1;
            smoke.spawn(tmpV.copy(Pl).add(v.set(side * 0.002, 0.03 + Math.random() * 0.012, (Math.random() - 0.5) * 0.002)),
              v.set(side * 0.004, -0.001, (Math.random() - 0.5) * 0.002), 0.003, 0.004, 3, 0.35, 0, 0, 0.4);
          }
        }
        if (s.phase === 'ENGINE_START' || (s.engineRunning && s.stage === 1)) {
          const atm = s.atmosphere;
          const nearGround = Pl.y < 0.2;
          const from = hasLastNozzle ? lastNozzle : nozzleLocal;
          const count = Math.round((reduced ? 5 : 12) * Math.max(0.3, thr) * (0.3 + atm));
          for (let i = 0; i < count; i++) {
            const f = (i + Math.random()) / count;
            const np = tmpV.copy(from).lerp(nozzleLocal, f);
            if (nearGround && s.t < 14) {
              // flame trench: exhaust is deflected sideways along the ground
              const side = Math.random() < 0.5 ? 1 : -1;
              smoke.spawn(v.set(side * (0.05 + Math.random() * 0.02), 0.004 + Math.random() * 0.006, (Math.random() - 0.5) * 0.012),
                tmpV2.set(side * (0.05 + Math.random() * 0.06), 0.004 + Math.random() * 0.01, (Math.random() - 0.5) * 0.02),
                0.012 + Math.random() * 0.01, 0.012, 9 + Math.random() * 4, 0.6, 0.9, 1.4, 0.35);
            } else if (atm > 0.04) {
              smoke.spawn(np, tmpV2.set((Math.random() - 0.5) * 0.004, (Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.004).addScaledVector(b.axis, -0.02),
                0.008 + Math.random() * 0.008 + vac * 0.03, 0.006 + vac * 0.03, 10 + atm * 6, 0.6 * Math.min(1, atm * 2.5), 0.8, 2.2, 0.5);
            }
            if (i % 2 === 0 && s.t >= -1) {
              fire.spawn(nozzleLocal, tmpV2.copy(b.axis).multiplyScalar(-0.12 - Math.random() * 0.08).add(v.set((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.02)),
                0.004 + Math.random() * 0.004 + vac * 0.01, 0.02, 0.28, 0.75, 1, 3, 0.5);
            }
          }
          if (s.phase === 'ENGINE_START') {
            for (let i = 0; i < 3; i++) {
              const side = Math.random() < 0.5 ? 1 : -1;
              fire.spawn(v.set(side * 0.05, 0.004, 0), tmpV2.set(side * 0.06, 0.03 * Math.random(), (Math.random() - 0.5) * 0.03), 0.0015, 0, 0.6, 1, 1, 1, 0.8);
            }
          }
        }
        lastNozzle.copy(nozzleLocal);
        hasLastNozzle = true;
      }
      smoke.update(dt, 0.0008);
      fire.update(dt, 0);

      // ── Camera ──
      const P = toWorld(Pl.clone().addScaledVector(b.axis, 0.03));
      let pose: Pose;
      if (curMode === 'orbit') {
        // Free camera: follow the vehicle by translating camera + target with it
        if (!freeInit) {
          controls.target.copy(lastPose.target);
          camera.position.copy(lastPose.pos);
          camera.up.copy(lastPose.up);
          freeInit = true;
          prevRocketW.copy(P);
        }
        const delta = tmpV.subVectors(P, prevRocketW);
        camera.position.add(delta);
        controls.target.add(delta);
        prevRocketW.copy(P);
        if (keys.size) {
          const dist = camera.position.distanceTo(controls.target);
          const spd = dist * 0.9 * dtReal;
          const fwd = tmpV2.subVectors(controls.target, camera.position).normalize();
          const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
          const mv = new THREE.Vector3();
          if (keys.has('w')) mv.addScaledVector(fwd, spd);
          if (keys.has('s')) mv.addScaledVector(fwd, -spd);
          if (keys.has('d')) mv.addScaledVector(right, spd);
          if (keys.has('a')) mv.addScaledVector(right, -spd);
          if (keys.has('e')) mv.addScaledVector(camera.up, spd);
          if (keys.has('q')) mv.addScaledVector(camera.up, -spd);
          // W/S dolly toward the target without passing it
          camera.position.add(mv);
          if (!keys.has('w') && !keys.has('s')) controls.target.add(mv);
        }
        controls.update();
        pose = { pos: camera.position.clone(), target: controls.target.clone(), up: camera.up.clone(), fov: 50 };
        if (blendFrom && blendT < 1) {
          blendT = Math.min(1, blendT + dtReal / blendDur);
          const bp = blendPose(blendFrom, pose, easeInOut(blendT), P);
          camera.position.copy(bp.pos);
          if (blendT >= 1) blendFrom = null;
        }
      } else {
        let target: Pose;
        if (curMode === 'cinematic') {
          const id = cinematicShot(s);
          if (id !== shotId) {
            shotFrom = shotId ? clonePose(lastPose) : null;
            shotId = id;
            shotT = 0;
          }
          target = posePreset(id, s, P, b, wall);
          if (shotFrom && shotT < 1) {
            const dur = reduced ? 0.01 : id === 'orbital' ? 4.5 : 2.4;
            shotT = Math.min(1, shotT + dtReal / dur);
            target = blendPose(shotFrom, target, easeInOut(shotT), P);
          }
        } else {
          target = posePreset(curMode, s, P, b, wall);
        }
        pose = target;
        if (blendFrom && blendT < 1) {
          blendT = Math.min(1, blendT + dtReal / blendDur);
          pose = blendPose(blendFrom, target, easeInOut(blendT), P);
          if (blendT >= 1) blendFrom = null;
        }
        camera.position.copy(pose.pos);
        camera.up.copy(pose.up);
        camera.lookAt(pose.target);
      }
      // Keep the camera above the ground
      const Cw = new THREE.Vector3().setFromMatrixPosition(pivot.matrixWorld);
      const fromC = tmpV.subVectors(camera.position, Cw);
      if (fromC.length() < R + 0.004) camera.position.copy(Cw).addScaledVector(fromC.normalize(), R + 0.004);
      if (camera.fov !== pose.fov) { camera.fov += (pose.fov - camera.fov) * Math.min(1, dtReal * 4); camera.updateProjectionMatrix(); }
      lastPose.pos.copy(camera.position);
      lastPose.target.copy(pose.target);
      lastPose.up.copy(camera.up);
      lastPose.fov = camera.fov;

      // Camera shake: ignition, liftoff, max-Q buffet, staging (near shots only)
      const camDist = camera.position.distanceTo(P);
      shake = Math.max(0, shake - dtReal * 1.4);
      const qn = s.dynamicPressureKPa / 37;
      const buffet = s.engineRunning ? (s.t < 10 ? 0.35 * thr : 0) + Math.max(0, qn - 0.6) * 0.8 : 0;
      const amp = reduced || st.paused || curMode === 'orbit' ? 0 : (shake + buffet) * 0.0012 * clamp(camDist / 0.2, 0.2, 2) * (camDist < 3 ? 1 : 0);
      if (amp > 0) {
        camera.position.x += (Math.random() - 0.5) * amp;
        camera.position.y += (Math.random() - 0.5) * amp;
        camera.position.z += (Math.random() - 0.5) * amp;
      }

      // ── Altitude-dependent environment ──
      const camAlt = Math.max(0, camera.position.distanceTo(Cw) - R);
      const camUp = tmpV.subVectors(camera.position, Cw).normalize();
      skyMat.uniforms.localUp.value.copy(camUp);
      skyMat.uniforms.density.value = 1 - sstep(12, 75, camAlt);
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);
      starMat.uniforms.uTime.value = wall;
      starMat.uniforms.uVisible.value = 0.08 + 0.92 * sstep(15, 70, camAlt);
      groundMat.opacity = 1 - sstep(60, 220, camAlt);
      ground.visible = groundMat.opacity > 0.01;
      cloudMat.uniforms.opacity.value = 0.75 * sstep(10, 30, camAlt) * (0.35 + 0.65 * sstep(150, 700, camAlt));
      earthMat.uniforms.uDetail.value = 1 - sstep(300, 1500, camAlt);
      atmoMat.uniforms.opacity.value = sstep(20, 160, camAlt);
      lowClouds.visible = camAlt < 120;
      const traveled = Math.min(trajPts.length, Math.max(0, Math.floor(s.t / 2) + 1));
      flownGeo.setDrawRange(0, traveled);
      const lineA = sstep(20, 200, camDist);
      trajMat.opacity = 0.35 * lineA;
      flownMat.opacity = 0.9 * lineA;
      orbitMat.opacity = 0.4 * lineA * sstep(EVENTS.INSERTION_START - 60, EVENTS.SECO, s.t);
      hemi.intensity = 0.15 + 0.35 * (1 - sstep(10, 80, camAlt));

      // Point sizes are in km → px scale for the current viewport
      const pxScale = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
      smokeMat.uniforms.uScale.value = pxScale;
      fireMat.uniforms.uScale.value = pxScale;
      lowCloudMat.uniforms.uScale.value = pxScale;

      renderer.clear();
      renderer.render(bgScene, camera);
      renderer.clearDepth();
      renderer.render(scene, camera);

      // Vehicle marker when the rocket is too small to see
      const mk = markerRef.current;
      if (mk) {
        const pr = P.clone().project(camera);
        const visible = pr.z < 1 && camDist > 25;
        if (visible) {
          const w = host.clientWidth, h = host.clientHeight;
          mk.style.opacity = '1';
          mk.style.transform = `translate(${((pr.x + 1) / 2) * w}px, ${((1 - pr.y) / 2) * h}px)`;
        } else {
          mk.style.opacity = '0';
        }
      }
    };
    raf = requestAnimationFrame(t => { last = t; frame(t); });
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown, { capture: true });
      renderer.domElement.removeEventListener('wheel', onWheel);
      roObs.disconnect();
      controls.dispose();
      [scene, bgScene].forEach(sc => sc.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          for (const v2 of Object.values(mat as unknown as Record<string, unknown>)) if (v2 instanceof THREE.Texture) v2.dispose();
          const sm = mat as THREE.ShaderMaterial;
          if (sm.uniforms) for (const u of Object.values(sm.uniforms)) if (u.value instanceof THREE.Texture) u.value.dispose();
          mat.dispose();
        }
      }));
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      ctrlRef.current = null;
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={hostRef} className="absolute inset-0" />
      <div ref={markerRef} className="absolute left-0 top-0 pointer-events-none transition-opacity duration-300" style={{ opacity: 0 }} aria-hidden>
        <div className="-translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="block w-3.5 h-3.5 rounded-full border-2 border-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
          <span className="font-mono text-[10px] tracking-widest text-cyan-100 bg-black/50 px-1.5 py-0.5 rounded">{vehicleLabel}</span>
        </div>
      </div>
    </div>
  );
};
