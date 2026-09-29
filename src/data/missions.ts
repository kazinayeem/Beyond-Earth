import { MissionData } from '@/types/game';

export const MISSIONS: MissionData[] = [
  {
    id: 'mission-01',
    code: 'ART-L1',
    name: 'Lunar Explorer',
    subtitle: 'Moon Orbit & Regolith Mapping',
    target: 'Moon',
    targetDistanceKm: 384400,
    objective: 'Enter stable lunar polar orbit and collect at least 70 Science Points while maintaining spacecraft safety & communication.',
    difficulty: 'Easy',
    rewardCredits: 1000,
    unlocked: true,
    budget: 700, // $700M (Flagship exploration envelope)
    maxMassKg: 1000,
    maxPowerW: 500,
    missionWindowDays: 28,
    minScienceRequired: 70,
    recommendedStrategy: 'Focus on balanced camera and spectrometer instrumentation with a reliable medium launcher. Ensure solar arrays generate sufficient wattage during lunar transit.',
    description: 'The Moon is Earth’s closest celestial companion, but its polar craters harbor critical water ice reserves and ancient regolith secrets. Design a robotic orbiter to map the lunar South Pole Aitken basin.',
    targetDetails: {
      gravity: '1.62 m/s² (0.166 g)',
      atmosphere: 'Trace exosphere (practically vacuum)',
      avgTemp: '-130°C to +120°C',
      radiation: 'High cosmic ray exposure',
      orbitalPeriod: '27.3 Earth days'
    },
    nasaInspiration: 'Inspired by NASA Lunar Reconnaissance Orbiter (LRO) and the Artemis scientific robotic precursor program.'
  },
  {
    id: 'mission-02',
    code: 'MR-02',
    name: 'Mars Pathfinder',
    subtitle: 'Red Planet Atmospheric & Surface Scout',
    target: 'Mars',
    targetDistanceKm: 225000000,
    objective: 'Survive deep space cruise, execute Mars Orbit Insertion (MOI), and gather 110+ Science Points on Martian geology and atmospheric loss.',
    difficulty: 'Medium',
    rewardCredits: 2500,
    unlocked: true,
    budget: 850, // $850M
    maxMassKg: 1600,
    maxPowerW: 750,
    missionWindowDays: 210,
    minScienceRequired: 110,
    recommendedStrategy: 'Deep space transit requires high-gain antenna arrays and thermal radiators. Invest in high-ISP ion propulsion or heavy booster for fuel margin.',
    description: 'Mars presents extreme challenges: solar irradiance drops to 43% of Earth levels, communication delays span up to 20 minutes, and orbital insertion burns demand pinpoint navigational precision.',
    targetDetails: {
      gravity: '3.72 m/s² (0.38 g)',
      atmosphere: '0.006 atm (95% CO₂)',
      avgTemp: '-63°C',
      radiation: 'Severe solar particle events',
      orbitalPeriod: '687 Earth days'
    },
    nasaInspiration: 'Inspired by NASA Mars Global Surveyor and Mars 2020 Perseverance mission architecture.'
  },
  {
    id: 'mission-03',
    code: 'NEO-3',
    name: 'Asteroid Surveyor',
    subtitle: 'Carbonaceous Near-Earth Object Intercept',
    target: 'Asteroid',
    targetDistanceKm: 140000000,
    objective: 'Rendezvous with near-Earth asteroid 101955 Bennu, complete close-proximity laser topography, and collect 140+ Science Points.',
    difficulty: 'Hard',
    rewardCredits: 4000,
    unlocked: true,
    budget: 700, // $700M
    maxMassKg: 1200,
    maxPowerW: 600,
    missionWindowDays: 180,
    minScienceRequired: 140,
    recommendedStrategy: 'Micro-gravity maneuvering requires sensitive reaction control thrusters and laser altimetry for obstacle avoidance.',
    description: 'Primitive carbonaceous asteroids hold the pristine building blocks of our solar system. Navigating around a kilometer-sized body with virtually zero gravity demands exquisite autonomous guidance.',
    targetDetails: {
      gravity: '0.00001 m/s²',
      atmosphere: 'None',
      avgTemp: '-70°C',
      radiation: 'Extreme unshielded solar wind',
      orbitalPeriod: '436 Earth days'
    },
    nasaInspiration: 'Inspired by NASA OSIRIS-REx and DART planetary defense missions.'
  },
  {
    id: 'mission-04',
    code: 'EO-4',
    name: 'Earth Observer',
    subtitle: 'Sun-Synchronous Climate Sentinel',
    target: 'Earth Orbit',
    targetDistanceKm: 700,
    objective: 'Deploy in 700km Sun-Synchronous Orbit to monitor Earth’s ice sheet thickness, deforestation, and atmospheric greenhouse gas concentrations.',
    difficulty: 'Medium',
    rewardCredits: 1500,
    unlocked: true,
    budget: 350, // $350M
    maxMassKg: 800,
    maxPowerW: 450,
    missionWindowDays: 14,
    minScienceRequired: 80,
    recommendedStrategy: 'Leverage Synthetic Aperture Radar (SAR) and multispectral imagers. With short transmission distance, communications require minimal dish power.',
    description: 'Observing our home planet from low orbit provides critical data for global climate science, severe weather warnings, and planetary resource stewardship.',
    targetDetails: {
      gravity: '9.5 m/s² (LEO)',
      atmosphere: 'Thermosphere drag decay zone',
      avgTemp: '-50°C to +80°C in eclipse',
      radiation: 'Van Allen belt inner radiation',
      orbitalPeriod: '98 minutes'
    },
    nasaInspiration: 'Inspired by NASA/ESA Sentinel satellites and Landsat 9 Earth Observation mission.'
  }
];
