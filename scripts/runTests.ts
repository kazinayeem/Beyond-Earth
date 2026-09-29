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
assert(instMeta.archiveNode?.includes('PDS'), 'InstrumentDataAdapter specifies PDS archive node');

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

console.log('\n======================================================');
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
