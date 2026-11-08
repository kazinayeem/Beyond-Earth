/**
 * Ascent flight model — two-stage medium-lift launcher to a 200 km parking orbit.
 *
 * SIMULATION MODEL (not real vehicle telemetry):
 *  • Altitude, velocity and pitch follow keyframes shaped after typical published
 *    two-stage kerosene/LOX ascent profiles (Max-Q ≈ T+70 s / 12 km, MECO ≈ T+155 s,
 *    SECO ≈ T+520 s at ~7.8 km/s), joined with monotone cubic (PCHIP) interpolation
 *    so every value is continuous and smooth.
 *  • Dynamic pressure is COMPUTED, not scripted: q = ½·ρ(h)·v² with an exponential
 *    atmosphere (ρ₀ = 1.225 kg/m³, scale height 8.5 km). Max-Q therefore emerges from
 *    the profile itself.
 *  • Acceleration (g-load) is derived from dv/dt plus the gravity component along the
 *    flight path, so it is consistent with the velocity curve.
 *  • Propellant is integrated from a throttle schedule (Max-Q throttle bucket, stage-2
 *    burn), so fuel only decreases while an engine is burning.
 *
 * All times are FLIGHT seconds (T+). The game compresses time with `timeCompression()`
 * so the ascent plays in ~40 s at 1x; the HUD shows the compression factor.
 */

export type AscentPhase =
  | 'PRELAUNCH'
  | 'ENGINE_START'
  | 'IGNITION'
  | 'LIFTOFF'
  | 'PAD_CLEARANCE'
  | 'ASCENT'
  | 'MAX_Q'
  | 'HIGH_ALTITUDE'
  | 'STAGE_SEPARATION'
  | 'UPPER_STAGE'
  | 'ORBIT_INSERTION'
  | 'ORBIT_ACHIEVED';

export interface AscentSample {
  t: number;                 // flight time, s (T+)
  phase: AscentPhase;
  altitudeKm: number;
  velocityKmh: number;
  velocityMs: number;
  mach: number;
  accelerationG: number;     // sensed acceleration (thrust/drag), in g
  dynamicPressureKPa: number;
  pitchDeg: number;          // 0 = vertical, 90 = horizontal
  downrangeKm: number;
  stage: 1 | 2;
  stage1PropPct: number;
  stage2PropPct: number;
  throttle: number;          // 0..1 thrust fraction of the active engine
  engineRunning: boolean;
  atmosphere: number;        // 0..1 ambient pressure relative to sea level
  fairingAttached: boolean;
}

// ── Event timeline (flight seconds) ─────────────────────────────────────────
export const EVENTS = {
  LIFTOFF: 0,
  TOWER_CLEAR: 8,
  PITCH_PROGRAM: 12,
  MAX_Q_START: 55,
  MAX_Q_END: 85,
  MECO: 155,
  STAGE_SEP: 158,
  SES1: 166,
  FAIRING_SEP: 200,
  INSERTION_START: 480,
  SECO: 520,
} as const;

export const TARGET_ALTITUDE_KM = 200;
export const ORBITAL_VELOCITY_KMH = 27900; // circular velocity at 200 km ≈ 7.78 km/s

// ── Keyframes ───────────────────────────────────────────────────────────────
const ALT_KF: [number, number][] = [
  [0, 0], [10, 0.15], [30, 1.6], [60, 8], [72, 11.5], [100, 24], [155, 68],
  [166, 76], [200, 105], [260, 145], [340, 177], [430, 194], [520, 200],
];
const VEL_KF: [number, number][] = [
  [0, 0], [10, 60], [30, 420], [60, 1350], [72, 1750], [100, 2900], [155, 8100],
  [166, 7980], [200, 9100], [260, 11800], [340, 15600], [430, 21000], [520, ORBITAL_VELOCITY_KMH],
];
const PITCH_KF: [number, number][] = [
  [0, 0], [12, 0], [60, 18], [155, 42], [250, 62], [400, 81], [520, 88],
];

// ── Monotone cubic (Fritsch–Carlson PCHIP) interpolation ────────────────────
function buildPchip(points: [number, number][]) {
  const n = points.length;
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    d[i] = (ys[i + 1] - ys[i]) / h[i];
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (x: number): number => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h[i] * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h[i] * m[i + 1]
    );
  };
}

const altAt = buildPchip(ALT_KF);
const velAt = buildPchip(VEL_KF);
const pitchAt = buildPchip(PITCH_KF);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

// ── Atmosphere ──────────────────────────────────────────────────────────────
export function airDensity(altKm: number): number {
  return 1.225 * Math.exp(-Math.max(0, altKm) / 8.5);
}
export function speedOfSound(altKm: number): number {
  // Linear troposphere lapse to 11 km, constant above (simplified ISA)
  const T = altKm < 11 ? 288.15 - 6.5 * altKm : 216.65;
  return Math.sqrt(1.4 * 287.05 * T);
}

// ── Throttle schedule ───────────────────────────────────────────────────────
export function throttleAt(t: number): number {
  if (t < 0) return 0;
  if (t < EVENTS.MECO) {
    // Throttle bucket through Max-Q, then full thrust; tail-off just before MECO
    const bucket = 1 - 0.28 * (smoothstep(48, 58, t) - smoothstep(80, 92, t));
    const tail = 1 - 0.35 * smoothstep(EVENTS.MECO - 6, EVENTS.MECO, t);
    return bucket * tail;
  }
  if (t < EVENTS.SES1) return 0;
  if (t < EVENTS.SECO) {
    const ramp = smoothstep(EVENTS.SES1, EVENTS.SES1 + 2, t);
    const tail = 1 - 0.25 * smoothstep(EVENTS.SECO - 30, EVENTS.SECO, t);
    return ramp * tail;
  }
  return 0;
}

// ── Pre-integrated tables (propellant, downrange) at 0.5 s resolution ──────
const DT = 0.5;
const T_END = EVENTS.SECO + 20;
const N = Math.ceil(T_END / DT) + 1;
const s1Burn = new Float64Array(N);
const s2Burn = new Float64Array(N);
const downrange = new Float64Array(N);
(() => {
  let a = 0;
  let b = 0;
  let x = 0;
  for (let i = 1; i < N; i++) {
    const t = i * DT;
    const thr = throttleAt(t - DT / 2);
    if (t <= EVENTS.MECO) a += thr * DT;
    else if (t > EVENTS.SES1 && t <= EVENTS.SECO) b += thr * DT;
    const vMs = velAt(t) / 3.6;
    x += (vMs * Math.sin((pitchAt(t) * Math.PI) / 180) * DT) / 1000;
    s1Burn[i] = a;
    s2Burn[i] = b;
    downrange[i] = x;
  }
})();
const S1_TOTAL = s1Burn[Math.round(EVENTS.MECO / DT)];
const S2_TOTAL = s2Burn[Math.round(EVENTS.SECO / DT)];
const S1_RESIDUAL = 4;  // % propellant left in stage 1 at MECO
const S2_RESIDUAL = 7;  // % left in stage 2 at SECO

function table(arr: Float64Array, t: number) {
  const f = clamp(t, 0, T_END) / DT;
  const i = Math.floor(f);
  const j = Math.min(N - 1, i + 1);
  return arr[i] + (arr[j] - arr[i]) * (f - i);
}

// ── Phase from time ─────────────────────────────────────────────────────────
export function phaseAt(t: number): AscentPhase {
  if (t < -3) return 'PRELAUNCH';
  if (t < 0) return 'ENGINE_START';
  if (t < 2) return 'LIFTOFF';
  if (t < 20) return 'PAD_CLEARANCE';
  if (t < EVENTS.MAX_Q_START) return 'ASCENT';
  if (t < EVENTS.MAX_Q_END) return 'MAX_Q';
  if (t < EVENTS.MECO) return 'HIGH_ALTITUDE';
  if (t < EVENTS.SES1) return 'STAGE_SEPARATION';
  if (t < EVENTS.INSERTION_START) return 'UPPER_STAGE';
  if (t < EVENTS.SECO) return 'ORBIT_INSERTION';
  return 'ORBIT_ACHIEVED';
}

/** Full vehicle state at flight time t (seconds, may be negative during countdown). */
export function sampleAscent(t: number): AscentSample {
  const tc = Math.max(0, Math.min(t, EVENTS.SECO));
  const altitudeKm = t <= 0 ? 0 : altAt(tc);
  const velocityKmh = t <= 0 ? 0 : velAt(tc);
  const velocityMs = velocityKmh / 3.6;
  const pitchDeg = t <= 0 ? 0 : pitchAt(tc);
  const rho = airDensity(altitudeKm);
  const q = (0.5 * rho * velocityMs * velocityMs) / 1000;

  // Sensed acceleration = dv/dt + g·cos(pitch-from-vertical) (gravity loss along path)
  let accelerationG = 1.0; // on the pad the vehicle (and sensors) feel 1 g
  const thr = throttleAt(t);
  if (t > 0 && t < EVENTS.SECO) {
    if (thr <= 0.001) {
      accelerationG = 0.0; // coast: free fall, ~0 g sensed
    } else {
      const dvdt = (velAt(tc + 0.5) - velAt(tc - 0.5)) / 3.6; // m/s²
      const gravityComp = 9.81 * Math.cos((pitchDeg * Math.PI) / 180);
      accelerationG = clamp((dvdt + gravityComp) / 9.81, 0, 6);
    }
  } else if (t >= EVENTS.SECO) {
    accelerationG = 0;
  } else if (t > -3 && t <= 0) {
    accelerationG = 1.0;
  }

  const s1 = t <= 0 ? 100 : 100 - (100 - S1_RESIDUAL) * (table(s1Burn, t) / S1_TOTAL);
  const s2 = t <= EVENTS.SES1 ? 100 : 100 - (100 - S2_RESIDUAL) * (table(s2Burn, t) / S2_TOTAL);

  let throttle = thr;
  if (t > -3 && t <= 0) throttle = smoothstep(-3, 0, t) * 0.95; // spin-up while held down

  return {
    t,
    phase: phaseAt(t),
    altitudeKm,
    velocityKmh,
    velocityMs,
    mach: velocityMs / speedOfSound(altitudeKm),
    accelerationG,
    dynamicPressureKPa: q,
    pitchDeg,
    downrangeKm: t <= 0 ? 0 : table(downrange, t),
    stage: t < EVENTS.STAGE_SEP ? 1 : 2,
    stage1PropPct: clamp(s1, 0, 100),
    stage2PropPct: clamp(s2, 0, 100),
    throttle,
    engineRunning: throttle > 0.01,
    atmosphere: clamp(rho / 1.225, 0, 1),
    fairingAttached: t < EVENTS.FAIRING_SEP,
  };
}

/** Peak dynamic pressure of the profile (computed once). */
export const MAX_Q = (() => {
  let best = { t: 0, q: 0, altKm: 0 };
  for (let t = 0; t < EVENTS.MECO; t += 0.5) {
    const s = sampleAscent(t);
    if (s.dynamicPressureKPa > best.q) best = { t, q: s.dynamicPressureKPa, altKm: s.altitudeKm };
  }
  return best;
})();

/**
 * Time compression (flight seconds per real second at 1x). Liftoff and staging
 * play close to real time so they read cinematically; long burns are compressed.
 */
export function timeCompression(t: number): number {
  if (t < 0) return 1;
  const base = 1.2 + 18.8 * smoothstep(5, 55, t);
  const stagingDip = 1 - 0.8 * (smoothstep(EVENTS.MECO - 12, EVENTS.MECO - 2, t) - smoothstep(EVENTS.SES1 + 4, EVENTS.SES1 + 20, t));
  const fairingDip = 1 - 0.55 * (smoothstep(EVENTS.FAIRING_SEP - 6, EVENTS.FAIRING_SEP - 1, t) - smoothstep(EVENTS.FAIRING_SEP + 3, EVENTS.FAIRING_SEP + 12, t));
  const secoDip = 1 - 0.7 * smoothstep(EVENTS.SECO - 45, EVENTS.SECO - 10, t);
  return base * stagingDip * fairingDip * secoDip;
}

/** Format flight time as T±MM:SS */
export function formatMET(t: number): string {
  const sign = t < 0 ? '−' : '+';
  const a = t < 0 ? Math.ceil(-t) : t;
  const mm = Math.floor(a / 60);
  const ss = Math.floor(a % 60);
  return `T${sign}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
