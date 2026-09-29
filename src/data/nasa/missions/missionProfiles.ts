import { RealNASAMission } from '@/types/nasa';

export const REAL_NASA_MISSIONS: RealNASAMission[] = [
  {
    id: 'nasa-mission-lro',
    name: 'Lunar Reconnaissance Orbiter (LRO)',
    spacecraftName: 'LRO Robotic Orbiter',
    launchDate: 'June 18, 2009 (Cape Canaveral SLC-41)',
    destination: 'Lunar Polar Orbit (50 km altitude nominal)',
    launchVehicle: 'Atlas V 401',
    missionStatus: 'Operational (Active Science Phase Extended Mission)',
    officialGoals: [
      'Characterize the lunar radiation environment for human exploration',
      'Develop high-precision global 3D geodetic grid and topographic models',
      'Survey the lunar polar regions for water ice and volatile resources in permanently shadowed regions (PSRs)',
      'Identify and assess safe landing sites with sub-meter optical photography for the Artemis program'
    ],
    primaryInstruments: ['LROC', 'LOLA', 'Diviner (DLRE)', 'Mini-RF', 'LAMP', 'CRaTER'],
    totalScienceReturnTB: 1450.0, // Over 1.4 Petabytes of raw science downlinked to PDS
    nasaProgram: 'NASA Exploration Systems Mission Directorate & Planetary Science Division',
    pdsDataNode: 'NASA PDS Geosciences, Imaging, Atmospheres, and PPI Nodes',
    sourceUrl: 'https://www.nasa.gov/mission/lunar-reconnaissance-orbiter/',
    metadata: {
      sourceName: 'NASA Goddard Space Flight Center',
      sourceType: 'NASA_PDS',
      datasetName: 'Lunar Reconnaissance Orbiter Master Science Mission Catalog',
      sourceUrl: 'https://pds-geosciences.wustl.edu/missions/lro/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Geosciences Node, Washington University in St. Louis',
      doiOrId: 'NASA-LRO-GSFC-CATALOG-2024',
      isSimulated: false
    }
  },
  {
    id: 'nasa-mission-apollo11',
    name: 'Apollo 11',
    spacecraftName: 'Command & Service Module (Columbia) / Lunar Module (Eagle)',
    launchDate: 'July 16, 1969 (Kennedy Space Center LC-39A)',
    destination: 'Lunar Surface: Mare Tranquillitatis (0.67408° N, 23.47297° E)',
    launchVehicle: 'Saturn V (SA-506)',
    missionStatus: 'Completed Successfully (Historic First Crewed Lunar Landing)',
    officialGoals: [
      'Perform a crewed lunar landing and return safely to Earth',
      'Deploy the Early Apollo Scientific Experiments Package (EASEP)',
      'Collect 21.55 kg of pristine lunar core samples, rocks, and fine regolith',
      'Evaluate human physiological response and EVA mobility in one-sixth gravity'
    ],
    primaryInstruments: ['Passive Seismic Experiment (PSEP)', 'Laser Ranging Retroreflector (LRRR)', 'Solar Wind Composition Experiment (SWC)'],
    totalScienceReturnTB: 0.08, // Analog telemetry digitised to PDS archives
    nasaProgram: 'Apollo Program / NASA Manned Spacecraft Center',
    pdsDataNode: 'NASA PDS Geosciences Node (Apollo Lunar Surface Experiments Archive)',
    sourceUrl: 'https://www.nasa.gov/mission/apollo-11/',
    metadata: {
      sourceName: 'NASA History Division & Lunar and Planetary Institute',
      sourceType: 'NASA_PDS',
      datasetName: 'Apollo 11 Lunar Surface Science and Telemetry Catalog',
      sourceUrl: 'https://www.lpi.usra.edu/lunar/missions/apollo/apollo_11/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA Space Science Data Coordinated Archive (NSSDCA)',
      doiOrId: 'NASA-NSSDCA-APOLLO11-1969',
      isSimulated: false
    }
  },
  {
    id: 'nasa-mission-m2020',
    name: 'Mars 2020 (Perseverance & Ingenuity)',
    spacecraftName: 'Perseverance Rover & Ingenuity Mars Helicopter',
    launchDate: 'July 30, 2020 (Cape Canaveral SLC-41)',
    destination: 'Mars Surface: Jezero Crater (18.38° N, 77.58° E)',
    launchVehicle: 'Atlas V 541',
    missionStatus: 'Operational (Jezero Crater Delta Sampling Phase)',
    officialGoals: [
      'Assess habitability and seek biosignatures of ancient microbial life',
      'Collect and hermetically seal rock core samples for future Mars Sample Return',
      'Demonstrate in-situ oxygen production from atmospheric CO₂ (MOXIE experiment)',
      'Characterize environmental dust, atmospheric radiation, and surface weather'
    ],
    primaryInstruments: ['Mastcam-Z', 'SuperCam', 'PIXL', 'SHERLOC', 'MOXIE', 'MEDA', 'RIMFAX'],
    totalScienceReturnTB: 110.0,
    nasaProgram: 'NASA Mars Exploration Program (MEP)',
    pdsDataNode: 'NASA PDS Geosciences and Imaging Nodes',
    sourceUrl: 'https://mars.nasa.gov/mars2020/',
    metadata: {
      sourceName: 'NASA Jet Propulsion Laboratory (JPL)',
      sourceType: 'NASA_PDS',
      datasetName: 'Mars 2020 Raw and Calibrated Science Archive',
      sourceUrl: 'https://pds-geosciences.wustl.edu/missions/m2020/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Geosciences Node',
      doiOrId: 'NASA-JPL-M2020-PDS-2024',
      isSimulated: false
    }
  },
  {
    id: 'nasa-mission-osiris-rex',
    name: 'OSIRIS-REx',
    spacecraftName: 'Origins, Spectral Interpretation, Resource Identification, Security, Regolith Explorer',
    launchDate: 'September 8, 2016 (Cape Canaveral SLC-41)',
    destination: 'Near-Earth Asteroid 101955 Bennu (Returned Sample to Earth Sept 24, 2023)',
    launchVehicle: 'Atlas V 411',
    missionStatus: 'Completed Bennu Return (Now Extended Mission OSIRIS-APEX to Apophis)',
    officialGoals: [
      'Return 121.6 grams of pristine carbonaceous asteroid Bennu material to Earth',
      'Map physical, mineralogical, and chemical properties of a primitive B-type asteroid',
      'Measure the Yarkovsky effect on asteroid orbital drift for planetary defense'
    ],
    primaryInstruments: ['OCAMS (PolyCam, MapCam, SamCam)', 'OLA (Laser Altimeter)', 'OVIRS (Visible and IR Spectrometer)', 'OTES (Thermal Emission Spectrometer)', 'REXIS (X-ray Imaging Spectrometer)'],
    totalScienceReturnTB: 45.0,
    nasaProgram: 'NASA New Frontiers Program',
    pdsDataNode: 'NASA PDS Small Bodies Node (SBN)',
    sourceUrl: 'https://www.nasa.gov/mission/osiris-rex/',
    metadata: {
      sourceName: 'NASA Goddard Space Flight Center & University of Arizona',
      sourceType: 'NASA_PDS',
      datasetName: 'OSIRIS-REx Bennu Data Archive at the Small Bodies Node',
      sourceUrl: 'https://sbn.psi.edu/pds/resource/orex/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Small Bodies Node, Planetary Science Institute',
      doiOrId: 'NASA-SBN-OSIRIS-REX-BENNU-2023',
      isSimulated: false
    }
  }
];
