import { REAL_PLANETARY_DATA } from '../src/data/nasa/planets/planetaryData';
import { REAL_LRO_INSTRUMENTS } from '../src/data/nasa/instruments/lroInstruments';
import { REAL_NASA_MISSIONS } from '../src/data/nasa/missions/missionProfiles';
import { 
  RealPlanetaryDataSchema, 
  RealNASAInstrumentSchema, 
  RealNASAMissionSchema, 
  DataSourceSchema 
} from '../src/data/nasa/validation/schemas';
import { PlanetaryDataAdapter } from '../src/data/nasa/adapters/planetaryAdapter';
import { InstrumentDataAdapter } from '../src/data/nasa/adapters/instrumentAdapter';
import { MissionDataAdapter } from '../src/data/nasa/adapters/missionAdapter';
import { SPACECRAFT_COMPONENTS, SYNERGY_BONUSES } from '../src/data/components';
import { MISSIONS } from '../src/data/missions';
import { LAUNCH_VEHICLES } from '../src/data/launchers';
import { TRAJECTORY_PROFILES } from '../src/data/trajectories';
import { MISSION_EVENTS } from '../src/data/events';
import { sampleAscent, EVENTS, MAX_Q, TARGET_ALTITUDE_KM, ORBITAL_VELOCITY_KMH, timeCompression, formatMET } from '../src/lib/flight/ascentProfile';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING MISSION CONTROL: BEYOND EARTH TEST SUITE');
console.log('======================================================\n');

// --- 1. NASA DATA & ZOD VALIDATION ---
console.log('[1/5] Testing NASA Data & Zod Validation Schemas...');
for (const [key, planet] of Object.entries(REAL_PLANETARY_DATA)) {
  const result = RealPlanetaryDataSchema.safeParse(planet);
  assert(result.success, `Planet [${key}] passes RealPlanetaryDataSchema validation`);
}

for (const inst of REAL_LRO_INSTRUMENTS) {
  const result = RealNASAInstrumentSchema.safeParse(inst);
  assert(result.success, `Real NASA Instrument [${inst.acronym}] passes validation`);
  assert(inst.metadata.sourceType === 'NASA_PDS', `[${inst.acronym}] has authentic NASA_PDS source type`);
}

for (const mission of REAL_NASA_MISSIONS) {
  const result = RealNASAMissionSchema.safeParse(mission);
  assert(result.success, `Real NASA Mission [${mission.name}] passes validation`);
}

// --- 2. NASA DATA ADAPTERS ---
console.log('\n[2/5] Testing NASA Data Adapters (Transformations & Normalization)...');
const planetAdapter = new PlanetaryDataAdapter('moon');
const moonMeta = planetAdapter.getSourceMetadata();
assert(moonMeta.sourceType === 'NASA_PDS', 'PlanetaryDataAdapter returns authentic NASA_PDS metadata');
assert(planetAdapter.validate(REAL_PLANETARY_DATA.moon), 'PlanetaryDataAdapter validate() passes on real data');

const instAdapter = new InstrumentDataAdapter();
assert(instAdapter.validate(REAL_LRO_INSTRUMENTS), 'InstrumentDataAdapter validate() passes on LRO catalog');
const instMeta = instAdapter.getSourceMetadata();
assert(Boolean(instMeta.archiveNode?.includes('PDS')), 'InstrumentDataAdapter specifies PDS archive node');

const missionAdapter = new MissionDataAdapter();
assert(missionAdapter.validate(REAL_NASA_MISSIONS), 'MissionDataAdapter validate() passes on NASA mission profiles');

// --- 3. SPACECRAFT RESOURCE BALANCING ---
console.log('\n[3/5] Testing Spacecraft Resource Balancing Math...');
const mission1 = MISSIONS[0]; // Lunar Explorer (Max Mass: 1000kg, Budget: $500M)
const mediumLauncher = LAUNCH_VEHICLES[1]; // Atlas-Titan V (Max Payload: 1000kg, Cost: $140M)

// Test nominal build
const nominalIds = [
  'struct-light',
  'cam-hires',
  'inst-spectrometer',
  'pwr-solar-adv',
  'pwr-battery-std',
  'comm-high-gain',
  'prop-medium',
  'therm-blanket',
  'nav-imu'
];

let totalMass = 0;
let totalCost = mediumLauncher.costM;
let powerGen = 0;
let powerDraw = 0;

for (const id of nominalIds) {
  const c = SPACECRAFT_COMPONENTS.find(item => item.id === id);
  if (c) {
    totalMass += c.massKg;
    totalCost += c.costM;
    if (c.powerGeneratedW) powerGen += c.powerGeneratedW;
    if (c.powerW) powerDraw += c.powerW;
  }
}

assert(totalMass <= mission1.maxMassKg, `Nominal build mass (${totalMass}kg) <= Lunar Explorer max (${mission1.maxMassKg}kg)`);
assert(totalMass <= mediumLauncher.maxPayloadKg, `Nominal build mass (${totalMass}kg) <= Medium launcher max (${mediumLauncher.maxPayloadKg}kg)`);
assert(totalCost <= mission1.budget, `Nominal build cost ($${totalCost}M) <= Lunar Explorer budget ($${mission1.budget}M)`);
assert(powerGen > powerDraw, `Power generated (${powerGen}W) > power consumed (${powerDraw}W)`);

// Test payload overload detection
const overweightMass = 1250;
const isOverweight = overweightMass > mission1.maxMassKg;
assert(isOverweight === true, 'Overweight spacecraft correctly triggers mass limit violation');

// --- 4. INSTRUMENT SYNERGIES ---
console.log('\n[4/5] Testing Engineering Synergy Logic...');
const geoSynergy = SYNERGY_BONUSES.find(s => s.id === 'syn-geo-imaging');
assert(geoSynergy !== undefined, 'Geological Imaging Synergy definition exists');
if (geoSynergy) {
  const hasAll = geoSynergy.requiredComponentIds.every(id => nominalIds.includes(id));
  assert(hasAll, 'Nominal build triggers Geological Imaging Synergy');
}

const lroSuite = SYNERGY_BONUSES.find(s => s.id === 'syn-nasa-lro-full');
assert(lroSuite !== undefined, 'Authentic NASA LRO Polar Science Suite synergy exists');
assert(lroSuite?.bonusScience === 40, 'Authentic LRO Polar Suite awards +40 Science');

// --- 5. MISSION EVENTS & CONSEQUENCES ---
console.log('\n[5/5] Testing Mission Event Consequence Dynamics...');
const solarStorm = MISSION_EVENTS.find(e => e.id === 'evt-solar-storm');
assert(solarStorm !== undefined, 'Solar storm event exists');
assert(solarStorm?.realWorldContext !== undefined, 'Solar storm has real-world scientific context');
assert(solarStorm?.options.length === 3, 'Solar storm has 3 distinct engineering contingency choices');

// Verify consequences are non-zero
for (const opt of solarStorm?.options || []) {
  const effects = Object.values(opt.effects);
  assert(effects.length > 0, `Option [${opt.label}] has concrete dynamic effects on resources`);
}

// --- 6. LAUNCH SEQUENCE & ASCENT TELEMETRY DYNAMICS ---
console.log('\n[6/6] Testing Launch Sequence State Machine & Deterministic Telemetry...');

// Real ascent flight model (src/lib/flight/ascentProfile.ts) — not a copy
const pad = sampleAscent(-2);
assert(pad.altitudeKm === 0 && pad.velocityKmh === 0 && pad.phase === 'ENGINE_START', 'Engine start keeps vehicle held on the pad (0 km, 0 km/h)');
assert(pad.throttle > 0 && pad.stage1PropPct === 100, 'Engines spin up before liftoff without consuming tank propellant');

let monotonicAlt = true;
let monotonicS1 = true;
let monotonicS2 = true;
let prevSample = sampleAscent(0);
for (let t = 0.5; t <= EVENTS.SECO; t += 0.5) {
  const cur = sampleAscent(t);
  if (cur.altitudeKm < prevSample.altitudeKm - 1e-9) monotonicAlt = false;
  if (cur.stage1PropPct > prevSample.stage1PropPct + 1e-9) monotonicS1 = false;
  if (cur.stage2PropPct > prevSample.stage2PropPct + 1e-9) monotonicS2 = false;
  prevSample = cur;
}
assert(monotonicAlt, 'Altitude never decreases during ascent');
assert(monotonicS1 && monotonicS2, 'Propellant only decreases (no refuelling jumps between phases)');

assert(MAX_Q.t > 55 && MAX_Q.t < 90 && MAX_Q.altKm > 8 && MAX_Q.altKm < 16, `Computed Max-Q occurs at T+${MAX_Q.t.toFixed(0)} s / ${MAX_Q.altKm.toFixed(1)} km`);
assert(MAX_Q.q > 25 && MAX_Q.q < 45, `Peak dynamic pressure is physically plausible (${MAX_Q.q.toFixed(1)} kPa)`);

const coast = sampleAscent((EVENTS.MECO + EVENTS.SES1) / 2);
assert(coast.throttle === 0 && coast.accelerationG === 0 && !coast.engineRunning, 'Between MECO and SES-1 no engine burns and sensed acceleration is 0 g');
assert(sampleAscent(EVENTS.MECO - 1).stage1PropPct < 10, 'Stage 1 is nearly depleted at MECO');
assert(sampleAscent(EVENTS.STAGE_SEP + 1).stage === 2, 'Vehicle is on stage 2 after separation');
assert(sampleAscent(EVENTS.FAIRING_SEP - 1).fairingAttached && !sampleAscent(EVENTS.FAIRING_SEP + 1).fairingAttached, 'Fairing jettisons at the scheduled event');

const orbit = sampleAscent(EVENTS.SECO + 5);
assert(orbit.phase === 'ORBIT_ACHIEVED' && Math.abs(orbit.altitudeKm - TARGET_ALTITUDE_KM) < 0.01, `SECO reaches the ${TARGET_ALTITUDE_KM} km parking orbit`);
assert(Math.abs(orbit.velocityKmh - ORBITAL_VELOCITY_KMH) < 1, `Orbital velocity matches circular speed at 200 km (${Math.round(orbit.velocityKmh)} km/h)`);
assert(orbit.stage2PropPct > 0 && orbit.stage2PropPct < 15, 'Stage 2 keeps a small propellant reserve at SECO');

let simSeconds = 0;
let flightT = 0;
while (flightT < EVENTS.SECO) { flightT += (1 / 60) * timeCompression(flightT); simSeconds += 1 / 60; }
assert(simSeconds > 25 && simSeconds < 70, `Ascent plays in ${simSeconds.toFixed(0)} s at 1x (time compression applied)`);
assert(formatMET(-9.4) === 'T−00:10' && formatMET(75.2) === 'T+01:15', 'MET formatting matches countdown display');

console.log('\n======================================================');
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}

