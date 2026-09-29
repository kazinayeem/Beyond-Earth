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
  }
];
