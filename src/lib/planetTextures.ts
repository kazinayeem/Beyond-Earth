import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// REAL EARTH CARTOGRAPHIC TEXTURES
// Source: three.js examples (mrdoob/three.js GitHub repository)
//   • earth_atmos_2048.jpg  — NASA Blue Marble composite (true-color Earth)
//   • earth_specular_2048.jpg — Ocean specular / land matte mask
//   • earth_normal_2048.jpg — Surface elevation normal map
// Cloud texture:
//   • earth_clouds_4k.png   — Real atmospheric cloud map
//     (source: turban/webgl-earth / NASA imagery composite)
//
// These textures represent real cartographic data of Earth's surface and
// atmosphere. All textures are served from local /public/textures/ to avoid
// CORS issues and ensure reliable offline availability.
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_SURFACE   = '/textures/earth_surface_2k.jpg';   // NASA Blue Marble
const EARTH_SPECULAR  = '/textures/earth_specular_2k.jpg';  // Ocean specular mask
const EARTH_NORMAL    = '/textures/earth_normal_2k.jpg';    // Normal/bump map
const EARTH_CLOUDS    = '/textures/earth_clouds_4k.png';    // Real cloud layer

// ─── Singleton texture loader + module-level cache ───────────────────────────
const loader = new THREE.TextureLoader();

let cachedEarthMap:      THREE.Texture | null = null;
let cachedEarthSpecular: THREE.Texture | null = null;
let cachedEarthNormal:   THREE.Texture | null = null;
let cachedEarthClouds:   THREE.Texture | null = null;

let cachedMoonMap:  THREE.CanvasTexture | null = null;
let cachedMoonBump: THREE.CanvasTexture | null = null;

let cachedMarsMap:  THREE.CanvasTexture | null = null;
let cachedMarsBump: THREE.CanvasTexture | null = null;

// ─── Texture load helper with sRGB + repeat settings ─────────────────────────
function loadEarthTexture(url: string, sRGB = false): THREE.Texture {
  const tex = loader.load(url);
  tex.colorSpace = sRGB ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Returns real NASA Earth cartographic textures.
 *
 * Surface:  NASA Blue Marble 2K equirectangular (earth_atmos_2048.jpg)
 * Specular: Ocean/land reflectivity mask        (earth_specular_2048.jpg)
 * Normal:   Surface elevation bump              (earth_normal_2048.jpg)
 * Clouds:   Real atmospheric cloud map          (earth_clouds_4k.png)
 */
export function getEarthTextures(): {
  map:         THREE.Texture;
  specularMap: THREE.Texture;
  normalMap:   THREE.Texture;
  cloudsMap:   THREE.Texture;
} {
  if (cachedEarthMap && cachedEarthSpecular && cachedEarthNormal && cachedEarthClouds) {
    return {
      map:         cachedEarthMap,
      specularMap: cachedEarthSpecular,
      normalMap:   cachedEarthNormal,
      cloudsMap:   cachedEarthClouds
    };
  }

  cachedEarthMap      = loadEarthTexture(EARTH_SURFACE,  true);
  cachedEarthSpecular = loadEarthTexture(EARTH_SPECULAR, false);
  cachedEarthNormal   = loadEarthTexture(EARTH_NORMAL,   false);
  cachedEarthClouds   = loadEarthTexture(EARTH_CLOUDS,   false);

  return {
    map:         cachedEarthMap,
    specularMap: cachedEarthSpecular,
    normalMap:   cachedEarthNormal,
    cloudsMap:   cachedEarthClouds
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MOON — procedural (still good, no real public-domain texture bundled)
// Based on NASA LRO LROC/LOLA data visual style
// ─────────────────────────────────────────────────────────────────────────────

export function getMoonTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  if (cachedMoonMap && cachedMoonBump) {
    return { map: cachedMoonMap, bumpMap: cachedMoonBump };
  }

  const W = 1024;
  const H = 512;

  // --- 1. Lunar Surface Color Map ---
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = W;
  mapCanvas.height = H;
  const ctx = mapCanvas.getContext('2d')!;

  ctx.fillStyle = '#8c95a0';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(120, 130, 142, 0.45)';
  for (let i = 0; i < 800; i++) {
    const x = (i * 127) % W;
    const y = (i * 89) % H;
    const r = (i % 7) + 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const drawMare = (cx: number, cy: number, rx: number, ry: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    const grad = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx);
    grad.addColorStop(0, '#2d3339');
    grad.addColorStop(0.7, '#383f47');
    grad.addColorStop(1, '#666e77');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawMare(W * 0.42, H * 0.42, 95, 120, 0.15);
  drawMare(W * 0.50, H * 0.30, 68, 60, -0.1);
  drawMare(W * 0.59, H * 0.32, 45, 40, 0.05);
  drawMare(W * 0.61, H * 0.44, 52, 44, -0.2);
  drawMare(W * 0.70, H * 0.38, 34, 30, 0.0);
  drawMare(W * 0.65, H * 0.56, 45, 35, 0.1);
  drawMare(W * 0.48, H * 0.62, 55, 42, -0.15);

  const drawCraterWithRays = (cx: number, cy: number, craterR: number, rayCount: number, rayLength: number) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + (i % 3) * 0.1;
      const len = rayLength * (0.7 + (i % 5) * 0.1);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, craterR * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#23272c';
    ctx.beginPath();
    ctx.arc(cx, cy, craterR * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, craterR * 0.3, 0, Math.PI * 2);
    ctx.fill();
  };

  drawCraterWithRays(W * 0.48, H * 0.78, 12, 24, 280);
  drawCraterWithRays(W * 0.47, H * 0.42, 10, 16, 120);
  drawCraterWithRays(W * 0.38, H * 0.44,  7, 12,  70);
  drawCraterWithRays(W * 0.37, H * 0.32,  9, 14,  85);

  for (let i = 0; i < 90; i++) {
    const rx = (i * 137) % W;
    const ry = (i * 91) % H;
    const rad = 2.5 + (i % 6);
    ctx.fillStyle = 'rgba(240, 243, 246, 0.65)';
    ctx.beginPath();
    ctx.arc(rx, ry, rad * 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40, 45, 52, 0.85)';
    ctx.beginPath();
    ctx.arc(rx, ry, rad * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  cachedMoonMap = new THREE.CanvasTexture(mapCanvas);
  cachedMoonMap.wrapS = THREE.RepeatWrapping;
  cachedMoonMap.wrapT = THREE.ClampToEdgeWrapping;

  // --- 2. Lunar Bump Map ---
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bCtx = bumpCanvas.getContext('2d')!;

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, W, H);

  const drawMareDepression = (cx: number, cy: number, rx: number, ry: number) => {
    const grad = bCtx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    grad.addColorStop(0, '#383838');
    grad.addColorStop(0.8, '#505050');
    grad.addColorStop(1, '#808080');
    bCtx.fillStyle = grad;
    bCtx.beginPath();
    bCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    bCtx.fill();
  };

  drawMareDepression(W * 0.42, H * 0.42, 95, 120);
  drawMareDepression(W * 0.50, H * 0.30, 68, 60);
  drawMareDepression(W * 0.59, H * 0.32, 45, 40);
  drawMareDepression(W * 0.61, H * 0.44, 52, 44);
  drawMareDepression(W * 0.70, H * 0.38, 34, 30);
  drawMareDepression(W * 0.48, H * 0.62, 55, 42);

  const drawCraterBump = (cx: number, cy: number, r: number) => {
    bCtx.strokeStyle = '#ffffff';
    bCtx.lineWidth = Math.max(2, r * 0.4);
    bCtx.beginPath();
    bCtx.arc(cx, cy, r, 0, Math.PI * 2);
    bCtx.stroke();
    bCtx.fillStyle = '#1a1a1a';
    bCtx.beginPath();
    bCtx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
    bCtx.fill();
    if (r > 6) {
      bCtx.fillStyle = '#e0e0e0';
      bCtx.beginPath();
      bCtx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
      bCtx.fill();
    }
  };

  drawCraterBump(W * 0.48, H * 0.78, 14);
  drawCraterBump(W * 0.47, H * 0.42, 12);
  drawCraterBump(W * 0.38, H * 0.44,  8);
  drawCraterBump(W * 0.37, H * 0.32, 10);

  for (let i = 0; i < 90; i++) {
    const rx = (i * 137) % W;
    const ry = (i * 91) % H;
    drawCraterBump(rx, ry, 3 + (i % 6));
  }

  cachedMoonBump = new THREE.CanvasTexture(bumpCanvas);
  cachedMoonBump.wrapS = THREE.RepeatWrapping;
  cachedMoonBump.wrapT = THREE.ClampToEdgeWrapping;

  return { map: cachedMoonMap, bumpMap: cachedMoonBump };
}

// ─────────────────────────────────────────────────────────────────────────────
// MARS — procedural (NASA MGS MOLA data visual style)
// ─────────────────────────────────────────────────────────────────────────────

export function getMarsTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  if (cachedMarsMap && cachedMarsBump) {
    return { map: cachedMarsMap, bumpMap: cachedMarsBump };
  }

  const W = 1024;
  const H = 512;

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = W;
  mapCanvas.height = H;
  const ctx = mapCanvas.getContext('2d')!;

  ctx.fillStyle = '#c2410c';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.ellipse(W * 0.65, H * 0.45, 65, 45, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(W * 0.35, H * 0.35, 75, 40, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#291003';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(W * 0.25, H * 0.55);
  ctx.lineTo(W * 0.48, H * 0.58);
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(W * 0.18, H * 0.42, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.06, W * 0.25, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.95, W * 0.18, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  cachedMarsMap = new THREE.CanvasTexture(mapCanvas);
  cachedMarsMap.wrapS = THREE.RepeatWrapping;
  cachedMarsMap.wrapT = THREE.ClampToEdgeWrapping;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bCtx = bumpCanvas.getContext('2d')!;

  bCtx.fillStyle = '#707070';
  bCtx.fillRect(0, 0, W, H);

  const oGrad = bCtx.createRadialGradient(W * 0.18, H * 0.42, 2, W * 0.18, H * 0.42, 28);
  oGrad.addColorStop(0, '#ffffff');
  oGrad.addColorStop(1, '#707070');
  bCtx.fillStyle = oGrad;
  bCtx.beginPath();
  bCtx.arc(W * 0.18, H * 0.42, 28, 0, Math.PI * 2);
  bCtx.fill();

  bCtx.strokeStyle = '#101010';
  bCtx.lineWidth = 6;
  bCtx.beginPath();
  bCtx.moveTo(W * 0.25, H * 0.55);
  bCtx.lineTo(W * 0.48, H * 0.58);
  bCtx.stroke();

  cachedMarsBump = new THREE.CanvasTexture(bumpCanvas);
  cachedMarsBump.wrapS = THREE.RepeatWrapping;
  cachedMarsBump.wrapT = THREE.ClampToEdgeWrapping;

  return { map: cachedMarsMap, bumpMap: cachedMarsBump };
}
