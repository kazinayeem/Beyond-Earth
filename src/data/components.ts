import { SpacecraftComponent, SynergyBonus } from '@/types/game';

export const SPACECRAFT_COMPONENTS: SpacecraftComponent[] = [
  // --- STRUCTURE ---
  {
    id: 'struct-light',
    name: 'Carbon-Composite Bus',
    category: 'structure',
    costM: 35,
    massKg: 75,
    powerW: 10,
    riskModPct: -3,
    description: 'Ultra-light honeycomb composite core providing rigid mounting for avionics and payloads.',
    nasaRef: 'Standard satellite lightweight bus structure',
    iconName: 'Box'
  },
  {
    id: 'struct-heavy',
    name: 'Reinforced Titanium Bus',
    category: 'structure',
    costM: 65,
    massKg: 140,
    powerW: 15,
    riskModPct: -12,
    description: 'Heavy radiation-shielded chassis designed for intense interplanetary cosmic rays and debris protection.',
    nasaRef: 'Cassini/Galileo deep space shielded chassis',
    iconName: 'Shield'
  },

  // --- INSTRUMENTS ---
  {
    id: 'cam-basic',
    name: 'Basic Optical Camera',
    category: 'instruments',
    costM: 20,
    massKg: 30,
    powerW: 20,
    scienceValue: 10,
    riskModPct: 2,
    description: 'Standard visible spectrum imaging sensor for broad terrain reconnaissance.',
    nasaRef: 'Wide Angle Camera (LROC)',
    iconName: 'Camera'
  },
  {
    id: 'cam-hires',
    name: 'High-Resolution Multispectral Camera',
    category: 'instruments',
    costM: 60,
    massKg: 70,
    powerW: 50,
    scienceValue: 25,
    riskModPct: 4,
    description: 'Sub-meter resolution telescopic camera with multi-band color filter wheels for detailed crater and mineral analysis.',
    nasaRef: 'HiRISE & Narrow Angle Camera',
    iconName: 'Aperture'
  },
  {
    id: 'inst-spectrometer',
    name: 'Infrared / UV Spectrometer',
    category: 'instruments',
    costM: 80,
    massKg: 90,
    powerW: 70,
    scienceValue: 30,
    riskModPct: 5,
    description: 'Analyzes reflected light wavelengths to identify chemical composition, volatile water ice, and mineral elements.',
    nasaRef: 'Diviner Lunar Radiometer & CRISM',
    iconName: 'Sparkles'
  },
  {
    id: 'inst-radar',
    name: 'Synthetic Aperture Radar (SAR)',
    category: 'instruments',
    costM: 120,
    massKg: 150,
    powerW: 100,
    scienceValue: 35,
    riskModPct: 7,
    description: 'Active microwave radar penetrating dust and darkness to map subsurface structures and permanently shadowed polar craters.',
    nasaRef: 'Mini-RF / SHARAD radar sounder',
    iconName: 'Radio'
  },
  {
    id: 'inst-altimeter',
    name: 'Laser Altimeter (LIDAR)',
    category: 'instruments',
    costM: 45,
    massKg: 40,
    powerW: 35,
    scienceValue: 18,
    riskModPct: 3,
    description: 'Fires precision laser pulses at 28 pulses/sec to build millimetric 3D digital elevation models.',
    nasaRef: 'LOLA (Lunar Orbiter Laser Altimeter)',
    iconName: 'Scan'
  },
  {
    id: 'inst-magnetometer',
    name: 'Fluxgate Magnetometer Boom',
    category: 'instruments',
    costM: 25,
    massKg: 20,
    powerW: 15,
    scienceValue: 14,
    riskModPct: 1,
    description: 'Deployable 3-meter boom isolating sensitive magnetic field detectors from spacecraft electronics.',
    nasaRef: 'MESSENGER / Parker Solar Probe Magnetometer',
    iconName: 'Compass'
  },

  // --- POWER ---
  {
    id: 'pwr-solar-basic',
    name: 'Basic Solar Array',
    category: 'power',
    costM: 40,
    massKg: 80,
    powerW: 0,
    powerGeneratedW: 180,
    riskModPct: 3,
    description: 'Dual rigid silicon solar panels providing baseline electrical output in sunlight.',
    nasaRef: 'Standard Gallium Arsenide dual-wing array',
    iconName: 'Sun'
  },
  {
    id: 'pwr-solar-adv',
    name: 'Advanced UltraFlex Solar Array',
    category: 'power',
    costM: 90,
    massKg: 120,
    powerW: 0,
    powerGeneratedW: 380,
    riskModPct: 4,
    description: 'Circular accordion-deployable solar wings delivering high power-to-mass ratio even in distant orbit.',
    nasaRef: 'UltraFlex arrays used on Orion and Mars Phoenix',
    iconName: 'SunMedium'
  },
  {
    id: 'pwr-rtg',
    name: 'Radioisotope Thermoelectric Generator (RTG)',
    category: 'power',
    costM: 150,
    massKg: 140,
    powerW: 0,
    powerGeneratedW: 270,
    riskModPct: 2,
    description: 'Plutonium-238 decay heat generator providing continuous, uninterruptible electrical power independent of solar distance or planetary shadow.',
    nasaRef: 'MMRTG used on Curiosity & Perseverance',
    iconName: 'Zap'
  },
  {
    id: 'pwr-battery-std',
    name: 'Li-Ion Battery Storage (200Wh)',
    category: 'power',
    costM: 40,
    massKg: 60,
    powerW: 0,
    batteryCapacity: 200,
    riskModPct: 2,
    description: 'Rechargeable energy bank maintaining essential avionics during orbit eclipse transitions.',
    nasaRef: 'Space-rated high-cycle Li-Ion battery pack',
    iconName: 'BatteryCharging'
  },
  {
    id: 'pwr-battery-adv',
    name: 'High-Density Solid-State Battery (450Wh)',
    category: 'power',
    costM: 75,
    massKg: 90,
    powerW: 0,
    batteryCapacity: 450,
    riskModPct: 3,
    description: 'High-density energy storage allowing prolonged nighttime scientific sensor sweeps.',
    nasaRef: 'Next-gen solid-state satellite battery',
    iconName: 'Battery'
  },

  // --- COMMUNICATION ---
  {
    id: 'comm-basic',
    name: 'Omnidirectional Antenna (S-Band)',
    category: 'communication',
    costM: 30,
    massKg: 40,
    powerW: 30,
    commRangePct: 55,
    riskModPct: 5,
    description: 'Broad beam communication system capable of transmitting basic telemetry and emergency packets.',
    nasaRef: 'Low-gain S-band transponder system',
    iconName: 'Wifi'
  },
  {
    id: 'comm-high-gain',
    name: 'High-Gain Parabolic Dish (X/Ka-Band)',
    category: 'communication',
    costM: 70,
    massKg: 80,
    powerW: 70,
    commRangePct: 95,
    scienceValue: 6,
    riskModPct: -5,
    description: 'Gimbaled 1.5m parabolic dish transmitting high-bitrate science data streams to NASA Deep Space Network (DSN).',
    nasaRef: 'LRO Ka-band 100 Mbps high-gain reflector',
    iconName: 'RadioReceiver'
  },

  // --- PROPULSION ---
  {
    id: 'prop-small',
    name: 'Monopropellant Hydrazine Thrusters',
    category: 'propulsion',
    costM: 50,
    massKg: 100,
    powerW: 20,
    fuelCapacityPct: 30,
    riskModPct: 2,
    description: 'Compact RCS thruster pack suitable for attitude maintenance and small orbit trims.',
    nasaRef: 'Catalytic hydrazine monopropellant system',
    iconName: 'Flame'
  },
  {
    id: 'prop-medium',
    name: 'Bipropellant Chemical Engine',
    category: 'propulsion',
    costM: 100,
    massKg: 180,
    powerW: 40,
    fuelCapacityPct: 60,
    riskModPct: 4,
    description: 'Proven hypergolic rocket engine delivering decisive delta-V for translunar injection and orbital capture.',
    nasaRef: 'Leros-1b 450N bipropellant apogee motor',
    iconName: 'Rocket'
  },
  {
    id: 'prop-large',
    name: 'Heavy Dual-Mode Propulsion Unit',
    category: 'propulsion',
    costM: 160,
    massKg: 250,
    powerW: 60,
    fuelCapacityPct: 90,
    riskModPct: 6,
    description: 'Maximum capacity tankage and high-thrust main engine ensuring generous trajectory margins and orbit maintenance.',
    nasaRef: 'Deep Space multi-stage propulsion bus',
    iconName: 'Gauge'
  },

  // --- THERMAL ---
  {
    id: 'therm-blanket',
    name: 'Multi-Layer Insulation (MLI) Blanket',
    category: 'thermal',
    costM: 15,
    massKg: 20,
    powerW: 5,
    riskModPct: -8,
    description: 'Gold and kapton reflective foil isolating the spacecraft from solar heating and deep-space cryo-cooling.',
    nasaRef: 'Standard 20-layer aluminized Mylar/Kapton blanket',
    iconName: 'Layers'
  },
  {
    id: 'therm-radiator',
    name: 'Active Fluid Loop Radiator Panels',
    category: 'thermal',
    costM: 35,
    massKg: 50,
    powerW: 20,
    riskModPct: -16,
    description: 'Cooled louvers and heat pipes rejecting excess heat generated by high-power scientific sensors and radar.',
    nasaRef: 'Active pumped heat pipe radiator system',
    iconName: 'ThermometerSnowflake'
  },

  // --- NAVIGATION ---
  {
    id: 'nav-imu',
    name: 'Star Tracker & Inertial Measurement Unit',
    category: 'navigation',
    costM: 25,
    massKg: 15,
    powerW: 15,
    riskModPct: -10,
    description: 'Autonomous star pattern recognition cameras and ring laser gyroscopes for precise 3-axis orientation.',
    nasaRef: 'Sodern Hydra dual-head autonomous star tracker',
    iconName: 'Locate'
  },
  {
    id: 'nav-optical',
    name: 'Auto-Nav Optical Guidance Computer',
    category: 'navigation',
    costM: 55,
    massKg: 35,
    powerW: 30,
    scienceValue: 8,
    riskModPct: -22,
    description: 'Onboard computer utilizing terrain-relative navigation to compute instantaneous autonomous trajectory corrections.',
    nasaRef: 'NASA Autonomous Exploration Breadboard Navigation (AutoNav)',
    iconName: 'Cpu'
  }
];

export const SYNERGY_BONUSES: SynergyBonus[] = [
  {
    id: 'syn-geo-imaging',
    name: 'Geological Imaging Synergy',
    requiredComponentIds: ['cam-hires', 'inst-spectrometer'],
    bonusScience: 18,
    bonusRiskReduction: 2,
    description: 'Correlating sub-meter photography with mineral spectrometry reveals mineralogical signatures and volcanic history.'
  },
  {
    id: 'syn-topo-mapping',
    name: '3D Topographic Mapping Synergy',
    requiredComponentIds: ['inst-radar', 'inst-altimeter'],
    bonusScience: 24,
    bonusRiskReduction: 3,
    description: 'Combining laser altimetry with Synthetic Aperture Radar creates unprecendented digital elevation models of craters.'
  },
  {
    id: 'syn-high-downlink',
    name: 'High-Throughput Downlink Synergy',
    requiredComponentIds: ['comm-high-gain', 'inst-radar'],
    bonusScience: 12,
    bonusRiskReduction: 2,
    description: 'High-gain X/Ka-band dish downlinks lossless raw radar synthetic aperture data without packet compression loss.'
  },
  {
    id: 'syn-smart-nav',
    name: 'Precision Orbital Survey Synergy',
    requiredComponentIds: ['nav-optical', 'inst-altimeter'],
    bonusScience: 14,
    bonusRiskReduction: 5,
    description: 'Real-time terrain-relative guidance dynamically aligns sensor suites to low-altitude interest points.'
  },
  {
    id: 'syn-grand-science',
    name: 'Full Discovery Science Suite',
    requiredComponentIds: ['cam-hires', 'inst-spectrometer', 'inst-radar', 'inst-altimeter'],
    bonusScience: 35,
    bonusRiskReduction: 4,
    description: 'Grand science instrumentation unlocks comprehensive planetary geoscience cataloging!'
  }
];
