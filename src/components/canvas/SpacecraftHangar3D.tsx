'use client';

/**
 * Interactive 3D spacecraft assembly hangar (Three.js).
 *
 * Every installed component id maps to a physical part on an attachment point of the
 * bus. Parts animate in/out when the installed set changes, hovered parts glow, and a
 * hovered-but-not-installed part is previewed as a holographic ghost on its slot.
 * Units: metres. One render loop; GPU resources disposed on unmount.
 */

import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type HangarView = 'iso' | 'front' | 'side' | 'top';
export interface HangarApi {
  setView: (v: HangarView) => void;
  reset: () => void;
  scan: () => void;
}

interface Props {
  installedIds: string[];
  hoverId: string | null;
  reducedMotion?: boolean;
  apiRef?: React.Ref<HangarApi>;
  onPartClick?: (id: string) => void;
}

// ── Materials (cloned per part so highlights stay local) ──────────────────
const MAT = {
  carbon: () => new THREE.MeshStandardMaterial({ color: '#2a2f37', roughness: 0.55, metalness: 0.35 }),
  titanium: () => new THREE.MeshStandardMaterial({ color: '#9aa4b0', roughness: 0.32, metalness: 0.85 }),
  gold: () => new THREE.MeshStandardMaterial({ color: '#d6a63c', roughness: 0.32, metalness: 1.0 }),
  white: () => new THREE.MeshStandardMaterial({ color: '#e8ebef', roughness: 0.5, metalness: 0.05 }),
  black: () => new THREE.MeshStandardMaterial({ color: '#14171c', roughness: 0.45, metalness: 0.5 }),
  glass: () => new THREE.MeshStandardMaterial({ color: '#0b1430', roughness: 0.05, metalness: 1.0, emissive: '#06122e', emissiveIntensity: 0.6 }),
  copper: () => new THREE.MeshStandardMaterial({ color: '#7a4b2a', roughness: 0.3, metalness: 0.9 }),
  radiator: () => new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.25, metalness: 0.1 }),
};

let solarTex: THREE.CanvasTexture | null = null;
function solarMaterial() {
  if (!solarTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#132257';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 256; x += 32) {
        const grd = g.createLinearGradient(x, y, x + 32, y + 32);
        grd.addColorStop(0, '#1d3a8f');
        grd.addColorStop(1, '#0f1d4d');
        g.fillStyle = grd;
        g.fillRect(x + 1.5, y + 1.5, 29, 29);
      }
    }
    g.strokeStyle = 'rgba(190,200,220,0.35)';
    g.lineWidth = 1;
    for (let i = 0; i <= 256; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    solarTex = new THREE.CanvasTexture(c);
    solarTex.colorSpace = THREE.SRGBColorSpace;
    solarTex.wrapS = solarTex.wrapT = THREE.RepeatWrapping;
  }
  const t = solarTex.clone();
  t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.22, metalness: 0.65, emissive: '#0a1640', emissiveIntensity: 0.25 });
}

const box = (w: number, h: number, d: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt: number, rb: number, h: number, m: THREE.Material, seg = 32, open = false) =>
  new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m);

/** Barrel pointing along +Z, base at z=0 */
function barrel(r: number, len: number, body: THREE.Material, lens: THREE.Material) {
  const g = new THREE.Group();
  const b = cyl(r, r, len, body);
  b.rotation.x = Math.PI / 2;
  b.position.z = len / 2;
  g.add(b);
  const l = cyl(r * 0.8, r * 0.8, 0.02, lens);
  l.rotation.x = Math.PI / 2;
  l.position.z = len + 0.005;
  g.add(l);
  const hood = cyl(r * 1.08, r * 1.08, 0.06, MAT.black(), 32, true);
  hood.rotation.x = Math.PI / 2;
  hood.position.z = len - 0.02;
  g.add(hood);
  return g;
}

// Bus dimensions per structure choice
function busSize(ids: string[]) {
  if (ids.includes('struct-heavy')) return { w: 1.9, h: 1.6, d: 1.9 };
  return { w: 1.6, h: 1.4, d: 1.6 };
}

/** Build the physical part for a component id. */
function buildPart(id: string, bus: { w: number; h: number; d: number }): THREE.Group {
  const g = new THREE.Group();
  const hw = bus.w / 2, hh = bus.h / 2, hd = bus.d / 2;
  switch (id) {
    case 'struct-light': {
      const body = box(bus.w, bus.h, bus.d, MAT.carbon());
      g.add(body);
      // edge frame
      const frameM = MAT.titanium();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const e = box(0.06, bus.h + 0.02, 0.06, frameM);
        e.position.set(sx * hw, 0, sz * hd);
        g.add(e);
      }
      break;
    }
    case 'struct-heavy': {
      const body = box(bus.w, bus.h, bus.d, MAT.titanium());
      g.add(body);
      const plateM = MAT.black();
      for (const sz of [-1, 1]) {
        const p = box(bus.w * 0.82, bus.h * 0.8, 0.04, plateM);
        p.position.set(0, 0, sz * (hd + 0.02));
        g.add(p);
      }
      break;
    }
    case 'therm-blanket': {
      // gold multi-layer insulation wrap (slightly crinkled scale)
      const wrap = box(bus.w + 0.04, bus.h + 0.04, bus.d + 0.04, MAT.gold());
      (wrap.material as THREE.MeshStandardMaterial).roughness = 0.42;
      g.add(wrap);
      break;
    }
    case 'therm-radiator': {
      const m = MAT.radiator();
      for (const sx of [-1, 1]) {
        const p = box(0.03, bus.h * 0.85, bus.d * 0.7, m);
        p.position.set(sx * (hw + 0.06), 0, -hd * 0.2);
        g.add(p);
        for (let i = -3; i <= 3; i++) {
          const fin = box(0.05, 0.015, bus.d * 0.7, MAT.titanium());
          fin.position.set(sx * (hw + 0.08), i * 0.17, -hd * 0.2);
          g.add(fin);
        }
      }
      break;
    }
    case 'pwr-solar-basic':
    case 'pwr-solar-adv': {
      const adv = id === 'pwr-solar-adv';
      const y = adv ? 0.18 : -0.18;
      for (const sx of [-1, 1]) {
        const boom = cyl(0.03, 0.03, 0.7, MAT.titanium(), 12);
        boom.rotation.z = Math.PI / 2;
        boom.position.set(sx * (hw + 0.35), y, 0);
        g.add(boom);
        if (adv) {
          // UltraFlex: circular fan-fold array
          const fan = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.03, 10), solarMaterial());
          fan.rotation.z = Math.PI / 2;
          fan.position.set(sx * (hw + 1.95), y, 0);
          g.add(fan);
          const hub = cyl(0.12, 0.12, 0.08, MAT.titanium(), 16);
          hub.rotation.z = Math.PI / 2;
          hub.position.copy(fan.position);
          g.add(hub);
        } else {
          for (let k = 0; k < 2; k++) {
            const panel = box(1.1, 0.03, 0.95, solarMaterial());
            panel.rotation.z = 0;
            panel.position.set(sx * (hw + 0.95 + k * 1.15), y, 0);
            g.add(panel);
          }
        }
      }
      break;
    }
    case 'pwr-rtg': {
      const boom = cyl(0.035, 0.035, 0.9, MAT.titanium(), 12);
      boom.rotation.x = Math.PI / 2 - 0.5;
      boom.position.set(-hw * 0.5, -hh * 0.3, -hd - 0.35);
      g.add(boom);
      const core = cyl(0.17, 0.17, 0.8, MAT.black(), 24);
      core.rotation.x = Math.PI / 2;
      core.position.set(-hw * 0.5, -hh * 0.3 - 0.4, -hd - 0.9);
      g.add(core);
      for (let i = 0; i < 8; i++) {
        const fin = box(0.02, 0.3, 0.75, MAT.black());
        const a = (i / 8) * Math.PI * 2;
        fin.position.set(core.position.x + Math.cos(a) * 0.27, core.position.y + Math.sin(a) * 0.27, core.position.z);
        fin.rotation.z = a + Math.PI / 2;
        g.add(fin);
      }
      const glow = new THREE.PointLight('#ff7a3a', 0.6, 1.5);
      glow.position.copy(core.position);
      g.add(glow);
      break;
    }
    case 'pwr-battery-std':
    case 'pwr-battery-adv': {
      const adv = id === 'pwr-battery-adv';
      const sx = adv ? -1 : 1;
      const b = box(0.12, adv ? 0.5 : 0.36, adv ? 0.62 : 0.46, MAT.white());
      b.position.set(sx * (hw + 0.06), -hh * 0.45, hd * 0.35);
      g.add(b);
      const stripe = box(0.13, 0.04, adv ? 0.5 : 0.36, new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#22d3ee', emissiveIntensity: 1.2 }));
      stripe.position.copy(b.position).add(new THREE.Vector3(sx * 0.005, 0.1, 0));
      g.add(stripe);
      break;
    }
    case 'comm-basic': {
      const whip = cyl(0.012, 0.012, 1.1, MAT.white(), 8);
      whip.position.set(hw * 0.6, hh + 0.55, -hd * 0.6);
      g.add(whip);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), MAT.white());
      tip.position.set(hw * 0.6, hh + 1.1, -hd * 0.6);
      g.add(tip);
      break;
    }
    case 'comm-high-gain': {
      const mast = cyl(0.05, 0.05, 0.5, MAT.titanium(), 12);
      mast.position.set(0, hh + 0.25, -hd * 0.15);
      g.add(mast);
      const prof: THREE.Vector2[] = [];
      for (let i = 0; i <= 16; i++) { const r = (i / 16) * 0.95; prof.push(new THREE.Vector2(r, r * r * 0.32)); }
      const dishM = MAT.white();
      dishM.side = THREE.DoubleSide;
      const dish = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), dishM);
      dish.position.set(0, hh + 0.55, -hd * 0.15);
      dish.rotation.x = -0.35;
      g.add(dish);
      const feed = cyl(0.025, 0.025, 0.36, MAT.black(), 8);
      feed.position.set(0, hh + 0.72, -hd * 0.15 + 0.06);
      feed.rotation.x = -0.35;
      g.add(feed);
      break;
    }
    case 'prop-small': {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const quad = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const n = cyl(0.025, 0.06, 0.12, MAT.copper(), 12, true);
          n.rotation.z = k === 0 ? Math.PI : k === 1 ? Math.PI / 2 : -Math.PI / 2;
          n.position.set(k === 1 ? -0.08 : k === 2 ? 0.08 : 0, k === 0 ? -0.08 : 0, 0);
          quad.add(n);
        }
        quad.position.set(sx * (hw - 0.05), -hh + 0.05, sz * (hd - 0.05));
        g.add(quad);
      }
      break;
    }
    case 'prop-medium':
    case 'prop-large': {
      const large = id === 'prop-large';
      const bellH = large ? 0.95 : 0.7;
      const bell = cyl(large ? 0.16 : 0.12, large ? 0.48 : 0.34, bellH, MAT.copper(), 32, true);
      bell.position.set(0, -hh - 0.12 - bellH / 2, 0);
      g.add(bell);
      const throat = cyl(0.18, 0.18, 0.18, MAT.black(), 16);
      throat.position.set(0, -hh - 0.06, 0);
      g.add(throat);
      const tanks = large ? [-0.55, 0.55] : [0];
      for (const tx of tanks) {
        const tank = new THREE.Mesh(new THREE.SphereGeometry(large ? 0.36 : 0.42, 32, 16), MAT.titanium());
        tank.position.set(tx, -hh - (large ? 0.3 : 0.2), large ? -0.45 : -0.55);
        tank.scale.y = 0.85;
        g.add(tank);
      }
      break;
    }
    case 'nav-imu': {
      for (const sx of [-1, 1]) {
        const st = barrel(0.07, 0.2, MAT.black(), MAT.glass());
        st.position.set(sx * 0.25, hh + 0.02, -hd + 0.1);
        st.rotation.x = -Math.PI / 2 - 0.5;
        st.rotation.y = sx * 0.4;
        g.add(st);
      }
      break;
    }
    case 'nav-optical': {
      const b = box(0.24, 0.18, 0.24, MAT.black());
      b.position.set(-hw * 0.55, hh + 0.09, hd * 0.55);
      g.add(b);
      const lens = barrel(0.06, 0.12, MAT.titanium(), MAT.glass());
      lens.position.set(-hw * 0.55, hh + 0.09, hd * 0.55 + 0.12);
      g.add(lens);
      break;
    }
    // ── Instruments (built around the slot origin, facing +Z) ──
    case 'cam-basic':
      g.add(box(0.26, 0.22, 0.16, MAT.white()));
      g.add(barrel(0.09, 0.28, MAT.black(), MAT.glass()).translateZ(0.08));
      break;
    case 'cam-hires':
    case 'nasa-inst-lroc': {
      const twin = id === 'nasa-inst-lroc';
      g.add(box(twin ? 0.42 : 0.3, 0.26, 0.18, MAT.white()));
      const xs = twin ? [-0.11, 0.11] : [0];
      for (const x of xs) {
        const bar = barrel(twin ? 0.09 : 0.13, twin ? 0.55 : 0.45, MAT.white(), MAT.glass());
        bar.position.set(x, 0, 0.09);
        g.add(bar);
        const ring = cyl(twin ? 0.095 : 0.135, twin ? 0.095 : 0.135, 0.04, MAT.gold());
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 0, 0.2);
        g.add(ring);
      }
      break;
    }
    case 'inst-spectrometer':
    case 'nasa-inst-lamp': {
      const s = id === 'nasa-inst-lamp' ? 0.7 : 1;
      g.add(box(0.36 * s, 0.3 * s, 0.32 * s, MAT.gold()));
      const ap = cyl(0.07 * s, 0.07 * s, 0.06, MAT.glass());
      ap.rotation.x = Math.PI / 2;
      ap.position.z = 0.17 * s;
      g.add(ap);
      break;
    }
    case 'inst-altimeter':
    case 'nasa-inst-lola': {
      g.add(box(0.28, 0.28, 0.12, MAT.black()));
      const tube = barrel(0.12, 0.22, MAT.titanium(), MAT.glass());
      tube.position.z = 0.06;
      g.add(tube);
      if (id === 'nasa-inst-lola') {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const l = cyl(0.025, 0.025, 0.02, new THREE.MeshStandardMaterial({ color: '#34d399', emissive: '#34d399', emissiveIntensity: 1.5 }));
          l.rotation.x = Math.PI / 2;
          l.position.set(Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0.29);
          g.add(l);
        }
      }
      break;
    }
    case 'nasa-inst-diviner': {
      g.add(box(0.34, 0.24, 0.2, MAT.white()));
      const drum = cyl(0.11, 0.11, 0.3, MAT.black());
      drum.rotation.z = Math.PI / 2;
      drum.position.set(0, 0, 0.16);
      g.add(drum);
      break;
    }
    case 'nasa-inst-crater':
      g.add(barrel(0.08, 0.2, MAT.titanium(), MAT.glass()));
      break;
    case 'inst-magnetometer': {
      const boom = cyl(0.018, 0.018, 2.4, MAT.white(), 8);
      boom.rotation.z = -Math.PI / 4;
      boom.position.set(hw + 0.85, hh + 0.85, -hd * 0.5);
      g.add(boom);
      const sensor = box(0.14, 0.14, 0.14, MAT.black());
      sensor.position.set(hw + 1.7, hh + 1.7, -hd * 0.5);
      g.add(sensor);
      break;
    }
    case 'inst-radar':
    case 'nasa-inst-minirf': {
      const big = id === 'inst-radar';
      const panel = box(big ? 2.2 : 1.3, 0.05, big ? 0.7 : 0.45, new THREE.MeshStandardMaterial({ color: '#cfd5dd', roughness: 0.4, metalness: 0.3 }));
      g.add(panel);
      for (let i = -4; i <= 4; i++) {
        const strip = box(0.02, 0.055, big ? 0.66 : 0.42, MAT.black());
        strip.position.x = i * (big ? 0.24 : 0.14);
        g.add(strip);
      }
      break;
    }
    default:
      g.add(box(0.25, 0.25, 0.25, MAT.white()));
  }
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// Instruments that occupy front-deck slots (others have bespoke mounts)
const DECK_SLOT_IDS = new Set(['cam-basic', 'cam-hires', 'inst-spectrometer', 'inst-altimeter', 'nasa-inst-lroc', 'nasa-inst-lola', 'nasa-inst-diviner', 'nasa-inst-lamp', 'nasa-inst-crater']);
const PANEL_IDS = ['inst-radar', 'nasa-inst-minirf'];

/** Mount transform for a part. Deck instruments fill a 3×3 grid on the +Z (nadir) face. */
function mountFor(id: string, installed: string[], bus: { w: number; h: number; d: number }) {
  const pos = new THREE.Vector3();
  const rot = new THREE.Euler();
  const out = new THREE.Vector3(0, 0, 1); // direction parts fly in from
  if (DECK_SLOT_IDS.has(id)) {
    const deck = installed.filter(i => DECK_SLOT_IDS.has(i));
    const k = Math.max(0, deck.indexOf(id));
    const col = k % 3, row = Math.floor(k / 3);
    pos.set((col - 1) * bus.w * 0.3, bus.h * 0.28 - row * bus.h * 0.3, bus.d / 2 + 0.02);
    return { pos, rot, out };
  }
  if (PANEL_IDS.includes(id)) {
    const k = installed.filter(i => PANEL_IDS.includes(i)).indexOf(id);
    pos.set(0, -bus.h / 2 - 0.05 - k * 0.12, bus.d / 2 + (k === 0 ? 0.45 : 0.3));
    rot.set(-0.25, 0, 0);
    out.set(0, -0.6, 1).normalize();
    return { pos, rot, out };
  }
  if (id.startsWith('pwr-solar') || id === 'therm-radiator' || id === 'pwr-battery-std') out.set(1, 0, 0);
  if (id === 'pwr-battery-adv') out.set(-1, 0, 0);
  if (id.startsWith('comm') || id.startsWith('nav') || id === 'inst-magnetometer') out.set(0, 1, 0);
  if (id.startsWith('prop')) out.set(0, -1, 0);
  if (id === 'pwr-rtg') out.set(0, 0, -1);
  return { pos, rot, out };
}

interface PartState {
  id: string;
  obj: THREE.Group;
  state: 'in' | 'idle' | 'out';
  t: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  rot: THREE.Euler;
}

const easeOutBack = (x: number) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

const VIEWS: Record<HangarView, [number, number, number]> = {
  iso: [5.2, 3.4, 5.6],
  front: [0, 0.8, 9.5],
  side: [10.5, 0.8, 0.01],
  top: [0.01, 10.5, 0.6],
};

export const SpacecraftHangar3D: React.FC<Props> = ({ installedIds, hoverId, reducedMotion = false, apiRef, onPartClick }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const installedRef = useRef(installedIds);
  const hoverRef = useRef(hoverId);
  const reducedRef = useRef(reducedMotion);
  const clickRef = useRef(onPartClick);
  const apiInner = useRef<HangarApi | null>(null);
  useEffect(() => {
    installedRef.current = installedIds;
    hoverRef.current = hoverId;
    reducedRef.current = reducedMotion;
    clickRef.current = onPartClick;
  });
  useImperativeHandle(apiRef, () => ({
    setView: v => apiInner.current?.setView(v),
    reset: () => apiInner.current?.reset(),
    scan: () => apiInner.current?.scan(),
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const lowEnd = (host.clientWidth || 800) < 700 || (navigator.hardwareConcurrency || 4) <= 4;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      host.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font:13px monospace">3D preview unavailable (WebGL disabled)</div>';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !lowEnd;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Spacecraft 3D preview. Drag to rotate, scroll to zoom, right-drag to pan.');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Image-based reflections so metals (gold MLI, titanium, copper) read correctly
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();
    scene.fog = new THREE.FogExp2('#050a18', 0.035);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
    camera.position.set(...VIEWS.iso);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.2;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI * 0.86;
    controls.target.set(0, 0.1, 0);
    controls.autoRotate = !reducedRef.current;
    controls.autoRotateSpeed = 0.45;
    let idleTimer = 0;
    controls.addEventListener('start', () => { controls.autoRotate = false; idleTimer = 0; camAnim = null; });

    // ── Lights: key, cyan rim, violet fill ──
    const key = new THREE.DirectionalLight('#fff3e6', 2.6);
    key.position.set(5, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight('#5eead4', 1.6);
    rim.position.set(-6, 3, -6);
    scene.add(rim);
    const fill = new THREE.DirectionalLight('#8b5cf6', 0.9);
    fill.position.set(6, -1, -3);
    scene.add(fill);
    scene.add(new THREE.HemisphereLight('#6b8cc7', '#0a0d16', 0.5));

    // ── Hangar: grid floor, holographic platform rings, light bars, dust ──
    const FLOOR_Y = -2.15;
    const floorMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform float uTime; varying vec3 vP;
        float line(float c, float w){ float f = abs(fract(c - 0.5) - 0.5) / fwidth(c); return 1.0 - min(f / w, 1.0); }
        void main(){
          vec2 p = vP.xy;
          float r = length(p);
          float g = max(line(p.x * 1.0, 1.0), line(p.y * 1.0, 1.0)) * 0.35 + max(line(p.x * 4.0, 0.8), line(p.y * 4.0, 0.8)) * 0.08;
          float ring = smoothstep(0.03, 0.0, abs(r - 2.6)) * 0.9 + smoothstep(0.02, 0.0, abs(r - 2.95)) * 0.4;
          float sweep = smoothstep(0.25, 0.0, abs(fract(r * 0.18 - uTime * 0.12) - 0.5)) * 0.08;
          float fade = smoothstep(14.0, 2.0, r);
          vec3 col = vec3(0.13, 0.75, 0.93) * (g + sweep) + vec3(0.36, 0.9, 1.0) * ring;
          gl_FragColor = vec4(col, (g * 0.8 + ring + sweep) * fade);
        }`,
      depthWrite: false,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    scene.add(floor);
    const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.45 }));
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = FLOOR_Y + 0.002;
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);
    // holographic pedestal beam
    const beamMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.018, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 4.2, 64, 1, true), beamMat);
    beam.position.y = FLOOR_Y + 2.1;
    scene.add(beam);
    // distant light bars (assembly-bay architecture)
    const barMat = new THREE.MeshBasicMaterial({ color: '#1e3a5f' });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 9, 0.08), barMat);
      bar.position.set(Math.cos(a) * 15, 2, Math.sin(a) * 15);
      scene.add(bar);
    }
    // floating dust
    const DUST = lowEnd ? 160 : 320;
    const dpos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      dpos[i * 3] = (Math.random() - 0.5) * 16;
      dpos[i * 3 + 1] = FLOOR_Y + Math.random() * 7;
      dpos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#7dd3fc', size: 0.03, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust);

    // Scan plane (engineering scan effect)
    const scanMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uA: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.6, r) * (0.25 + 0.75 * smoothstep(0.02, 0.0, abs(r - 0.92))); gl_FragColor = vec4(0.3, 0.9, 1.0, a * uA); }',
    });
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), scanMat);
    scan.rotation.x = -Math.PI / 2;
    scan.visible = false;
    scene.add(scan);
    let scanT = -1;

    // ── Spacecraft assembly ──
    const craft = new THREE.Group();
    scene.add(craft);
    const parts = new Map<string, PartState>();
    let ghost: { id: string; obj: THREE.Group } | null = null;
    let lastKey = '';
    let busDims = busSize(installedRef.current);
    // Placeholder bus when no structure is installed (holographic frame)
    const ghostBusMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', wireframe: true, transparent: true, opacity: 0.25 });
    const ghostBus = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6, 2, 2, 2), ghostBusMat);
    craft.add(ghostBus);

    const disposeObj = (o: THREE.Object3D) => {
      o.traverse(c => {
        const m = c as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach(mm => { (mm as THREE.MeshStandardMaterial).map?.dispose(); mm.dispose(); });
      });
    };

    const sync = (animate: boolean) => {
      const ids = installedRef.current;
      const newBus = busSize(ids);
      const busChanged = newBus.w !== busDims.w;
      busDims = newBus;
      ghostBus.visible = !ids.some(i => i.startsWith('struct-'));
      // remove parts no longer installed
      for (const [id, p] of parts) {
        if (!ids.includes(id) && p.state !== 'out') { p.state = 'out'; p.t = 0; }
      }
      // add or re-mount
      for (const id of ids) {
        const m = mountFor(id, ids, busDims);
        let p = parts.get(id);
        if (!p || busChanged) {
          if (p) { craft.remove(p.obj); disposeObj(p.obj); }
          const obj = buildPart(id, busDims);
          craft.add(obj);
          const from = m.pos.clone().addScaledVector(m.out, 2.2);
          p = { id, obj, state: animate && !busChanged ? 'in' : 'idle', t: 0, from, to: m.pos.clone(), rot: m.rot.clone() };
          obj.position.copy(p.state === 'in' ? from : m.pos);
          obj.rotation.copy(m.rot);
          if (p.state === 'in') obj.scale.setScalar(0.4);
          parts.set(id, p);
        } else {
          if (p.state === 'out') { p.state = 'idle'; p.obj.scale.setScalar(1); }
          if (!p.to.equals(m.pos)) { p.from = p.obj.position.clone(); p.to = m.pos.clone(); p.state = 'in'; p.t = 0.35; }
        }
      }
    };
    sync(false);
    lastKey = installedRef.current.join('|');

    // ── Camera transitions ──
    let camAnim: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; t: number } | null = null;
    const setView = (v: HangarView) => {
      controls.autoRotate = false;
      camAnim = { from: camera.position.clone(), to: new THREE.Vector3(...VIEWS[v]), tFrom: controls.target.clone(), t: reducedRef.current ? 1 : 0 };
    };
    apiInner.current = {
      setView,
      reset: () => { setView('iso'); idleTimer = 0; },
      scan: () => { scanT = 0; },
    };

    // ── Click picking ──
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downAt = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) return; // was a drag
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([...parts.values()].map(p => p.obj), true);
      if (!hits.length) return;
      let o: THREE.Object3D | null = hits[0].object;
      while (o && o.parent !== craft) o = o.parent;
      for (const [id, p] of parts) if (p.obj === o) { clickRef.current?.(id); break; }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    // ── Layout ──
    const layout = () => {
      const w = host.clientWidth || 600, h = host.clientHeight || 400;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(host);

    // ── Loop ──
    let raf = 0;
    let last = performance.now();
    let time = 0;
    const cyan = new THREE.Color('#22d3ee');
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const reduced = reducedRef.current;

      const key2 = installedRef.current.join('|');
      if (key2 !== lastKey) {
        lastKey = key2;
        sync(!reduced);
        scanT = 0;
      }

      // part animations
      for (const [id, p] of parts) {
        if (p.state === 'in') {
          p.t = Math.min(1, p.t + dt / 0.7);
          const e = easeOutBack(p.t);
          p.obj.position.lerpVectors(p.from, p.to, e);
          p.obj.scale.setScalar(0.4 + 0.6 * Math.min(1, e));
          if (p.t >= 1) { p.state = 'idle'; p.obj.position.copy(p.to); p.obj.scale.setScalar(1); }
        } else if (p.state === 'out') {
          p.t = Math.min(1, p.t + dt / (reduced ? 0.01 : 0.4));
          const e = easeInOut(p.t);
          const outDir = mountFor(id, [id], busDims).out;
          p.obj.position.copy(p.to).addScaledVector(outDir, e * 2.0);
          p.obj.scale.setScalar(1 - 0.7 * e);
          if (p.t >= 1) { craft.remove(p.obj); disposeObj(p.obj); parts.delete(id); }
        }
      }

      // hover: glow installed part, or show a ghost for an uninstalled one
      const hv = hoverRef.current;
      const pulse = 0.55 + 0.45 * Math.sin(time * 5);
      for (const [id, p] of parts) {
        const on = id === hv;
        p.obj.traverse(o => {
          const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (!m || !('emissive' in m)) return;
          if (m.userData.baseEmissive === undefined) {
            m.userData.baseEmissive = m.emissive.clone();
            m.userData.baseIntensity = m.emissiveIntensity;
          }
          if (on) { m.emissive.copy(cyan); m.emissiveIntensity = 0.35 * pulse; }
          else { m.emissive.copy(m.userData.baseEmissive); m.emissiveIntensity = m.userData.baseIntensity; }
        });
      }
      const wantGhost = hv && !installedRef.current.includes(hv) ? hv : null;
      if ((ghost?.id ?? null) !== wantGhost) {
        if (ghost) { craft.remove(ghost.obj); disposeObj(ghost.obj); ghost = null; }
        if (wantGhost) {
          const obj = buildPart(wantGhost, busDims);
          const gm = new THREE.MeshBasicMaterial({ color: '#67e8f9', wireframe: true, transparent: true, opacity: 0.55, depthWrite: false });
          obj.traverse(o => {
            const m = o as THREE.Mesh;
            if (m.isMesh) { (Array.isArray(m.material) ? m.material : [m.material]).forEach(mm => mm.dispose()); m.material = gm; m.castShadow = false; }
            if ((o as THREE.PointLight).isPointLight) o.visible = false;
          });
          const mt = mountFor(wantGhost, [...installedRef.current, wantGhost], busDims);
          obj.position.copy(mt.pos);
          obj.rotation.copy(mt.rot);
          craft.add(obj);
          ghost = { id: wantGhost, obj };
        }
      }
      if (ghost) ghost.obj.traverse(o => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined; if (m && (o as THREE.Mesh).isMesh) m.opacity = 0.3 + 0.35 * pulse; });

      // gentle hover float
      if (!reduced) craft.position.y = Math.sin(time * 0.8) * 0.05;

      // scan sweep (top → bottom) after any configuration change
      if (scanT >= 0) {
        scanT += dt / 1.3;
        scan.visible = scanT < 1;
        scan.position.y = 2.4 - scanT * 4.8;
        scanMat.uniforms.uA.value = Math.sin(Math.min(1, scanT) * Math.PI);
        if (scanT >= 1) scanT = -1;
      }

      // camera preset tween
      if (camAnim) {
        camAnim.t = Math.min(1, camAnim.t + dt / 0.9);
        const e = easeInOut(camAnim.t);
        camera.position.lerpVectors(camAnim.from, camAnim.to, e);
        controls.target.lerpVectors(camAnim.tFrom, new THREE.Vector3(0, 0.1, 0), e);
        if (camAnim.t >= 1) camAnim = null;
      }
      // resume slow turntable after 8 s idle
      if (!controls.autoRotate && !reduced && !camAnim) {
        idleTimer += dt;
        if (idleTimer > 8) controls.autoRotate = true;
      }

      floorMat.uniforms.uTime.value = time;
      dust.rotation.y += dt * 0.02;
      dust.position.y = Math.sin(time * 0.2) * 0.15;
      controls.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(t => { last = t; frame(t); });
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      ro.disconnect();
      controls.dispose();
      disposeObj(scene);
      envTex.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      apiInner.current = null;
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
};
