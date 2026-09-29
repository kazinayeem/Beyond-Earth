import { RealNASAInstrument } from '@/types/nasa';

export const REAL_LRO_INSTRUMENTS: RealNASAInstrument[] = [
  {
    id: 'nasa-inst-lroc',
    acronym: 'LROC',
    fullName: 'Lunar Reconnaissance Orbiter Camera',
    missionName: 'Lunar Reconnaissance Orbiter (LRO)',
    principalInvestigator: 'Dr. Mark Robinson',
    leadInstitution: 'Arizona State University (ASU)',
    realMassKg: 19.2,
    realPowerW: 34.0,
    realScienceDescription: 'System of three cameras: two Narrow Angle Cameras (NAC) capturing high-resolution black-and-white 0.5-meter images of surface geology and Apollo landing sites, and one Wide Angle Camera (WAC) providing multispectral 100-meter color mapping in 7 wavelengths.',
    scientificPhenomenon: 'Optical albedo reflection, regolith distribution, micro-crater morphometry, and surface roughness.',
    pdsDatasetId: 'LRO-L-LROC-2-EDR-V1.0',
    pdsArchiveUrl: 'https://pds-imaging.jpl.nasa.gov/data/lro/',
    gameMapping: {
      category: 'instruments',
      gameCostM: 60,
      gameScienceValue: 28,
      gameRiskModPct: 3,
      gameEffectSummary: 'Provides high-resolution photographic mapping and mineral albedo analysis.'
    },
    metadata: {
      sourceName: 'NASA Planetary Data System (PDS) Imaging Node',
      sourceType: 'NASA_PDS',
      datasetName: 'LRO LROC Experiment Data Records (EDR) Archive',
      sourceUrl: 'https://lroc.sese.asu.edu/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Imaging Node, Jet Propulsion Laboratory',
      doiOrId: 'PDS-IMG-LRO-LROC-2024',
      isSimulated: false
    }
  },
  {
    id: 'nasa-inst-lola',
    acronym: 'LOLA',
    fullName: 'Lunar Orbiter Laser Altimeter',
    missionName: 'Lunar Reconnaissance Orbiter (LRO)',
    principalInvestigator: 'Dr. David E. Smith',
    leadInstitution: 'NASA Goddard Space Flight Center (GSFC)',
    realMassKg: 11.2,
    realPowerW: 30.8,
    realScienceDescription: 'Pulses a single Nd:YAG laser beam (1064 nm) split by a diffractive optical element into 5 separate beams at 28 pulses/sec. Measures two-way flight time to generate the most precise global 3D topographic grid of any planetary body in the Solar System.',
    scientificPhenomenon: 'Precision laser time-of-flight rangefinding, surface elevation, slope, and laser backscatter reflectance.',
    pdsDatasetId: 'LRO-L-LOLA-3-RDR-V1.0',
    pdsArchiveUrl: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/',
    gameMapping: {
      category: 'instruments',
      gameCostM: 45,
      gameScienceValue: 22,
      gameRiskModPct: 2,
      gameEffectSummary: 'Builds millimetric 3D digital elevation models and identifies safe landing zones.'
    },
    metadata: {
      sourceName: 'NASA Planetary Data System (PDS) Geosciences Node',
      sourceType: 'NASA_PDS',
      datasetName: 'LRO LOLA Reduced Data Records (RDR) Topography',
      sourceUrl: 'https://imbrium.mit.edu/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Geosciences Node, Washington University in St. Louis',
      doiOrId: 'PDS-GEO-LRO-LOLA-3-RDR',
      isSimulated: false
    }
  },
  {
    id: 'nasa-inst-diviner',
    acronym: 'DLRE',
    fullName: 'Diviner Lunar Radiometer Experiment',
    missionName: 'Lunar Reconnaissance Orbiter (LRO)',
    principalInvestigator: 'Dr. David A. Paige',
    leadInstitution: 'University of California, Los Angeles (UCLA)',
    realMassKg: 13.0,
    realPowerW: 24.7,
    realScienceDescription: 'Nine-channel infrared filter radiometer spanning 0.3 to >200 micrometers. Continuously maps day and night surface temperatures, measuring extreme polar cold traps below 30 Kelvin (-243°C) capable of preserving billions-of-years-old water ice deposits.',
    scientificPhenomenon: 'Thermal emission, radiative cooling, dielectric thermal inertia, and silicate mineral absorption bands.',
    pdsDatasetId: 'LRO-L-DLRE-4-RDR-V1.0',
    pdsArchiveUrl: 'https://pds-geosciences.wustl.edu/missions/lro/diviner.htm',
    gameMapping: {
      category: 'instruments',
      gameCostM: 80,
      gameScienceValue: 32,
      gameRiskModPct: 4,
      gameEffectSummary: 'Measures daytime heat retention and maps deep cryogenic volatile ice reservoirs.'
    },
    metadata: {
      sourceName: 'NASA Planetary Data System (PDS) Geosciences Node',
      sourceType: 'NASA_PDS',
      datasetName: 'LRO Diviner Lunar Radiometer Experiment (DLRE) Thermal Data',
      sourceUrl: 'https://www.diviner.ucla.edu/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Geosciences Node, Washington University in St. Louis',
      doiOrId: 'PDS-GEO-LRO-DLRE-4-RDR',
      isSimulated: false
    }
  },
  {
    id: 'nasa-inst-minirf',
    acronym: 'Mini-RF',
    fullName: 'Miniature Radio Frequency Synthetic Aperture Radar',
    missionName: 'Lunar Reconnaissance Orbiter (LRO)',
    principalInvestigator: 'Dr. Ben Bussey',
    leadInstitution: 'Johns Hopkins Applied Physics Laboratory (JHU/APL)',
    realMassKg: 15.6,
    realPowerW: 90.0,
    realScienceDescription: 'Advanced synthetic aperture radar operating at S-band (2.38 GHz) and X-band (7.14 GHz). Uses circular polarization ratio (CPR) to penetrate subsurface regolith and detect anomalous volume scattering characteristic of buried water ice inside permanently shadowed craters.',
    scientificPhenomenon: 'Microwave subsurface backscatter, circular polarization ratio (CPR), dielectric permittivity of water ice.',
    pdsDatasetId: 'LRO-L-MRFLRO-4-CDR-V1.0',
    pdsArchiveUrl: 'https://pds-geosciences.wustl.edu/missions/lro/minirf.htm',
    gameMapping: {
      category: 'instruments',
      gameCostM: 110,
      gameScienceValue: 38,
      gameRiskModPct: 6,
      gameEffectSummary: 'Penetrates lunar dust to map subsurface layers and polar ice deposits.'
    },
    metadata: {
      sourceName: 'NASA Planetary Data System (PDS) Geosciences Node',
      sourceType: 'NASA_PDS',
      datasetName: 'LRO Mini-RF Calibrated Data Records (CDR) Synthetic Aperture Radar',
      sourceUrl: 'https://pds-geosciences.wustl.edu/missions/lro/minirf.htm',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Geosciences Node, Washington University in St. Louis',
      doiOrId: 'PDS-GEO-LRO-MINIRF-4-CDR',
      isSimulated: false
    }
  },
  {
    id: 'nasa-inst-lamp',
    acronym: 'LAMP',
    fullName: 'Lyman-Alpha Mapping Project',
    missionName: 'Lunar Reconnaissance Orbiter (LRO)',
    principalInvestigator: 'Dr. Kurt Retherford',
    leadInstitution: 'Southwest Research Institute (SwRI)',
    realMassKg: 6.1,
    realPowerW: 4.5,
    realScienceDescription: 'Far-ultraviolet imaging spectrograph (57–196 nm). Utilizes the faint ultraviolet glow of interplanetary hydrogen Lyman-alpha emissions and stellar ultraviolet light to &ldquo;see in the dark&rdquo; inside permanently shadowed polar craters.',
    scientificPhenomenon: 'Far-UV reflectance, water frost absorption edge at 165 nm, and interplanetary Lyman-alpha glow.',
    pdsDatasetId: 'LRO-L-LAMP-2-EDR-V1.0',
    pdsArchiveUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/LRO/lamp.html',
    gameMapping: {
      category: 'instruments',
      gameCostM: 50,
      gameScienceValue: 24,
      gameRiskModPct: 3,
      gameEffectSummary: 'Leverages interplanetary starlight to map frost in permanently shadowed craters.'
    },
    metadata: {
      sourceName: 'NASA Planetary Data System (PDS) Atmospheres Node',
      sourceType: 'NASA_PDS',
      datasetName: 'LRO LAMP Ultraviolet Spectrograph Calibrated Science Data',
      sourceUrl: 'https://www.swri.org/newsroom/press-release/swri-lamp-lunar-water',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Atmospheres Node, New Mexico State University',
      doiOrId: 'PDS-ATM-LRO-LAMP-2-EDR',
      isSimulated: false
    }
  },
  {
    id: 'nasa-inst-crater',
    acronym: 'CRaTER',
    fullName: 'Cosmic Ray Telescope for the Effects of Radiation',
    missionName: 'Lunar Reconnaissance Orbiter (LRO)',
    principalInvestigator: 'Dr. Nathan Schwadron',
    leadInstitution: 'University of New Hampshire (UNH)',
    realMassKg: 5.4,
    realPowerW: 7.3,
    realScienceDescription: 'Solid-state silicon detector stack integrated with tissue-equivalent plastic (TEP) absorbers. Measures linear energy transfer (LET) spectra of galactic cosmic rays and solar energetic protons, quantifying radiation risks for future Artemis astronauts.',
    scientificPhenomenon: 'Linear energy transfer (LET), galactic cosmic ray ionizing radiation dose, and solar energetic proton flux.',
    pdsDatasetId: 'LRO-L-CRAT-2-EDR-V1.0',
    pdsArchiveUrl: 'https://pds-ppi.igpp.ucla.edu/mission/LRO/CRAT/',
    gameMapping: {
      category: 'instruments',
      gameCostM: 35,
      gameScienceValue: 20,
      gameRiskModPct: -8, // directly reduces flight risk by predicting radiation storms!
      gameEffectSummary: 'Measures deep-space radiation dosage and reduces mission uncertainty risk.'
    },
    metadata: {
      sourceName: 'NASA Planetary Data System (PDS) Planetary Plasma Interactions (PPI) Node',
      sourceType: 'NASA_PDS',
      datasetName: 'LRO CRaTER Calibrated Radiation Exposure Archive',
      sourceUrl: 'https://crater.unh.edu/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS PPI Node, University of California Los Angeles',
      doiOrId: 'PDS-PPI-LRO-CRATER-2-EDR',
      isSimulated: false
    }
  }
];
