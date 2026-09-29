import { ProvenanceRecord } from '@/types/nasa';

export const NASA_PROVENANCE_CATALOG: ProvenanceRecord[] = [
  {
    title: 'Lunar Constants & Physical Characteristics',
    datasetName: 'NASA Planetary Fact Sheet - Moon',
    mission: 'General Planetary Science & LRO Compilation',
    archive: 'NASA Goddard Space Flight Center (NSSDC)',
    lastRetrieved: '2026-09-29',
    dataType: 'geometry',
    officialSourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
    notes: 'Informs real Moon mass, radius, surface gravity (1.62 m/s²), escape velocity, and orbit distance in the mission simulator.'
  },
  {
    title: 'LRO LOLA Digital Elevation Model (DEM)',
    datasetName: 'LRO-L-LOLA-3-RDR-V1.0 (Topography Gridded Data Record)',
    mission: 'Lunar Reconnaissance Orbiter (LRO)',
    archive: 'NASA PDS Geosciences Node',
    lastRetrieved: '2026-09-29',
    dataType: 'science',
    officialSourceUrl: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
    notes: 'Supplies real-world topographic elevation context and informs the Laser Altimeter instrument modeling.'
  },
  {
    title: 'LROC Narrow Angle & Wide Angle Camera Archives',
    datasetName: 'LRO-L-LROC-2-EDR-V1.0 & RDR Products',
    mission: 'Lunar Reconnaissance Orbiter (LRO)',
    archive: 'NASA PDS Imaging Node / Arizona State University',
    lastRetrieved: '2026-09-29',
    dataType: 'image',
    officialSourceUrl: 'https://lroc.sese.asu.edu/',
    notes: 'High-resolution lunar surface imagery and optical reconnaissance context used in the Lunar Explorer mission briefing.'
  },
  {
    title: 'Diviner Lunar Radiometer Experiment (DLRE) Thermal Maps',
    datasetName: 'LRO-L-DLRE-4-RDR-V1.0 (Calibrated Radiance & Brightness Temp)',
    mission: 'Lunar Reconnaissance Orbiter (LRO)',
    archive: 'NASA PDS Geosciences Node / UCLA',
    lastRetrieved: '2026-09-29',
    dataType: 'science',
    officialSourceUrl: 'https://www.diviner.ucla.edu/',
    notes: 'Used to model real extreme temperature swings (-130°C to +120°C) and polar volatile cold-traps.'
  },
  {
    title: 'Mini-RF Synthetic Aperture Radar (SAR) Polar Ice Data',
    datasetName: 'LRO-L-MRFLRO-4-CDR-V1.0',
    mission: 'Lunar Reconnaissance Orbiter (LRO)',
    archive: 'NASA PDS Geosciences Node / JHU-APL',
    lastRetrieved: '2026-09-29',
    dataType: 'science',
    officialSourceUrl: 'https://pds-geosciences.wustl.edu/missions/lro/minirf.htm',
    notes: 'Informs Synthetic Aperture Radar sensor mechanics and subsurface crater ice reflection anomalies.'
  },
  {
    title: 'CRaTER Cosmic Ray Radiation Measurement Stream',
    datasetName: 'LRO-L-CRAT-2-EDR-V1.0 (Linear Energy Transfer Spectra)',
    mission: 'Lunar Reconnaissance Orbiter (LRO)',
    archive: 'NASA PDS Planetary Plasma Interactions (PPI) Node / UNH',
    lastRetrieved: '2026-09-29',
    dataType: 'telemetry',
    officialSourceUrl: 'https://crater.unh.edu/',
    notes: 'Grounds the in-flight solar storm and radiation exposure crisis events in real physical cosmic ray dosage physics.'
  },
  {
    title: 'NASA Space Weather Prediction Center (SWPC) Solar Flare Models',
    datasetName: 'NOAA/NASA SWPC Real-Time Solar Wind & X-Ray Flare Catalog',
    mission: 'GOES & SOHO / NASA Heliophysics System Observatory',
    archive: 'NASA Space Weather Database of Notifications, Knowledge, Information (DONKI)',
    lastRetrieved: '2026-09-29',
    dataType: 'telemetry',
    officialSourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    notes: 'Provides real scientific context for Class-X coronal mass ejection events affecting deep-space avionics.'
  },
  {
    title: 'Deep Space Network (DSN) Now Telemetry Service',
    datasetName: 'NASA DSN Real-Time Telemetry Interface XML/JSON Feeds',
    mission: 'NASA Deep Space Network (Goldstone, Madrid, Canberra)',
    archive: 'NASA JPL DSN Ground Operations',
    lastRetrieved: '2026-09-29',
    dataType: 'telemetry',
    officialSourceUrl: 'https://eyes.nasa.gov/dsn/dsn.html',
    notes: 'Informs 8.4 GHz X/Ka-band signal carrier locks, ground receiver dishes, and carrier drop recovery procedures.'
  },
  {
    title: 'NASA Blue Marble Earth Cartographic Textures',
    datasetName: 'earth_atmos_2048.jpg / earth_specular_2048.jpg / earth_normal_2048.jpg',
    mission: 'NASA Earth Observing System (EOS) / Terra & Aqua (MODIS Blue Marble)',
    archive: 'three.js examples — mrdoob/three.js (GitHub, MIT License) — original data: NASA Earth Observatory / Visible Earth (GSFC)',
    lastRetrieved: '2026-09-29',
    dataType: 'image',
    officialSourceUrl: 'https://visibleearth.nasa.gov/collection/1484/blue-marble',
    notes: 'Real 2K equirectangular Earth surface texture (earth_atmos_2048.jpg), ocean specular mask (earth_specular_2048.jpg), and surface normal map (earth_normal_2048.jpg) served from /public/textures/. Source imagery is NASA Blue Marble composite derived from MODIS Terra & Aqua observations. Files distributed via three.js example assets.'
  },
  {
    title: 'Real Earth Atmospheric Cloud Layer',
    datasetName: 'fair_clouds_4k.png',
    mission: 'NASA/NOAA meteorological composite',
    archive: 'turban/webgl-earth (GitHub, MIT License) — cloud alpha map derived from NASA GOES / NOAA satellite imagery composites',
    lastRetrieved: '2026-09-29',
    dataType: 'image',
    officialSourceUrl: 'https://github.com/turban/webgl-earth',
    notes: 'Real 4K equirectangular cloud layer texture used as alphaMap on the separate cloud sphere (radius 1.012 × Earth). Opacity 0.28 — transparent thin atmospheric layer, not painted onto the surface. Served from /public/textures/earth_clouds_4k.png.'
  },
  {
    title: 'NASA LRO WAC Global Lunar Cartographic Mosaic',
    datasetName: 'LRO-L-LROC-5-RDR-V1.0 (Wide Angle Camera Global Mosaic)',
    mission: 'Lunar Reconnaissance Orbiter (LRO)',
    archive: 'NASA PDS Cartography and Imaging Sciences Node (USGS/ASU)',
    lastRetrieved: '2026-09-29',
    dataType: 'image',
    officialSourceUrl: 'https://astrogeology.usgs.gov/search/map/Moon/LRO/LROC/WAC_Global',
    notes: 'Provides high-accuracy lunar maria (Sea of Tranquility), crater rays (Tycho/Copernicus), and regolith albedo mapping.'
  },
  {
    title: 'NASA MGS MOLA & MRO MARCI Mars Global Topography & Color',
    datasetName: 'MGS-M-MOLA-5-MEGDR-L3-V1.0 & MRO MARCI Global Color',
    mission: 'Mars Global Surveyor (MGS) & Mars Reconnaissance Orbiter (MRO)',
    archive: 'NASA PDS Geosciences Node (Washington University in St. Louis)',
    lastRetrieved: '2026-09-29',
    dataType: 'image',
    officialSourceUrl: 'https://pds-geosciences.wustl.edu/missions/mgs/mola.htm',
    notes: 'Informs realistic Martian terrain features including Syrtis Major volcanic shields, Valles Marineris canyon rifts, and polar ice caps.'
  },
  {
    title: 'CelesTrak Orbital Ephemeris & NORAD TLE Datasets',
    datasetName: 'CelesTrak General Perturbations (GP) Orbital Elements Catalog',
    mission: 'International Space Station (ISS) & Hubble Space Telescope (HST)',
    archive: 'CelesTrak / Space-Track.org / NASA Tracking Network',
    lastRetrieved: '2026-09-29',
    dataType: 'telemetry',
    officialSourceUrl: 'https://celestrak.org/',
    notes: 'Authentic orbital inclination, semi-major axis, nodal precession, and mean motion parameters powering the Mission Control multi-satellite tracking simulation.'
  },
  {
    title: 'USGS / NASA Landsat-9 Mission Operations & Ephemeris',
    datasetName: 'Landsat 9 Operational Land Imager 2 (OLI-2) Orbital Elements',
    mission: 'Landsat 9 / USGS-NASA Joint Land Remote Sensing Program',
    archive: 'USGS Earth Resources Observation and Science (EROS) Center',
    lastRetrieved: '2026-09-29',
    dataType: 'telemetry',
    officialSourceUrl: 'https://landsat.gsfc.nasa.gov/satellites/landsat-9/',
    notes: 'Provides 705 km Sun-Synchronous Orbit (SSO) inclination (98.2°), repeating ground track, and 98.9 min orbital period data.'
  },
  {
    title: 'ESA Copernicus Sentinel-2 Multi-Spectral Ephemeris',
    datasetName: 'Copernicus Sentinel-2 Precise Orbit Determination (POD) Files',
    mission: 'Copernicus Sentinel-2 Constellation (2A/2B)',
    archive: 'ESA Copernicus Open Access Hub / European Space Agency',
    lastRetrieved: '2026-09-29',
    dataType: 'telemetry',
    officialSourceUrl: 'https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2',
    notes: 'Authentic 786 km polar sun-synchronous orbital characteristics (98.62° inclination, 100.6 min period) for European environmental Earth observation.'
  },
  {
    title: 'NOAA Joint Polar Satellite System (JPSS) NOAA-20 Ephemeris',
    datasetName: 'NOAA-20 (JPSS-1) Flight Dynamics Orbital Elements',
    mission: 'Joint Polar Satellite System (JPSS-1 / NOAA-20)',
    archive: 'NOAA National Environmental Satellite, Data, and Information Service (NESDIS)',
    lastRetrieved: '2026-09-29',
    dataType: 'telemetry',
    officialSourceUrl: 'https://www.nesdis.noaa.gov/our-satellites/currently-flying/joint-polar-satellite-system',
    notes: 'Provides 824 km Sun-Synchronous Orbit parameters (98.7° inclination, 101.4 min period) for global numerical weather prediction.'
  }
];
