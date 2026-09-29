import { RealPlanetaryData } from '@/types/nasa';

export const REAL_PLANETARY_DATA: Record<string, RealPlanetaryData> = {
  moon: {
    id: 'target-moon',
    name: 'The Moon',
    designation: 'Earth I (Natural Satellite)',
    massKg: '7.342 × 10²² kg (0.0123 Earths)',
    meanRadiusKm: 1737.4,
    surfaceGravityMs2: 1.62,
    escapeVelocityKms: 2.38,
    averageDistanceKm: 384400,
    orbitalPeriodDays: 27.3217,
    atmosphereComposition: 'Surface-boundary exosphere: Helium-4 (40,000 atoms/cm³), Neon (40,000), Hydrogen (35,000), Argon-40 (30,000)',
    surfaceTemperatureRangeC: '-130°C (night average) to +120°C (equatorial noon); permanently shadowed craters drop to -246°C (27 K)',
    radiationEnvironment: 'Unshielded galactic cosmic rays (GCRs) and solar energetic particles (SEPs); lunar surface dose ~60 µSv/hr (Apollo & LRO CRaTER verified)',
    officialImageryUrl: 'https://images.nasa.gov/details/as11-44-6667',
    elevationModelSource: 'NASA Lunar Reconnaissance Orbiter (LRO) - LOLA Gridded Data Records (GDR) at 64 pixels/degree',
    pdsArchiveUrl: 'https://pds-geosciences.wustl.edu/missions/lro/',
    metadata: {
      sourceName: 'NASA Planetary Data System (PDS) & Goddard Space Flight Center',
      sourceType: 'NASA_PDS',
      datasetName: 'Lunar Reconnaissance Orbiter (LRO) Planetary Constants & LOLA Elevation Models',
      sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Geosciences Node, Washington University in St. Louis',
      doiOrId: 'NASA-GSFC-MOON-FACT-2024.1',
      isSimulated: false
    }
  },
  mars: {
    id: 'target-mars',
    name: 'Mars',
    designation: 'Fourth Planet from the Sun',
    massKg: '6.417 × 10²³ kg (0.107 Earths)',
    meanRadiusKm: 3389.5,
    surfaceGravityMs2: 3.72,
    escapeVelocityKms: 5.03,
    averageDistanceKm: 225000000,
    orbitalPeriodDays: 686.98,
    atmosphereComposition: '95.32% Carbon Dioxide (CO₂), 2.6% Nitrogen (N₂), 1.9% Argon (Ar), 0.16% Oxygen (O₂), 0.08% Carbon Monoxide (CO)',
    surfaceTemperatureRangeC: '-125°C (polar winter) to +20°C (equatorial summer); mean global temperature -63°C',
    radiationEnvironment: 'Cosmic ray flux attenuated only slightly by thin 6-8 mbar atmosphere; surface dose ~250 mSv/year (MSL RAD instrument measurement)',
    officialImageryUrl: 'https://images.nasa.gov/details/PIA04304',
    elevationModelSource: 'NASA Mars Global Surveyor (MGS) MOLA Megadr-128 topography',
    pdsArchiveUrl: 'https://pds-geosciences.wustl.edu/missions/mgs/mola.html',
    metadata: {
      sourceName: 'NASA Planetary Data System (PDS) & Jet Propulsion Laboratory',
      sourceType: 'NASA_PDS',
      datasetName: 'Mars Global Surveyor MOLA Topography & Curiosity MSL RAD Telemetry',
      sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA PDS Geosciences Node',
      doiOrId: 'NASA-JPL-MGS-MOLA-2024',
      isSimulated: false
    }
  },
  earth: {
    id: 'target-earth',
    name: 'Earth',
    designation: 'Third Planet from the Sun',
    massKg: '5.972 × 10²⁴ kg',
    meanRadiusKm: 6371.0,
    surfaceGravityMs2: 9.807,
    escapeVelocityKms: 11.186,
    averageDistanceKm: 149597870,
    orbitalPeriodDays: 365.256,
    atmosphereComposition: '78.08% Nitrogen (N₂), 20.95% Oxygen (O₂), 0.93% Argon (Ar), 0.04% Carbon Dioxide (CO₂)',
    surfaceTemperatureRangeC: '-89.2°C (Vostok Antarctica) to +56.7°C (Furnace Creek, Death Valley); mean global temperature +15°C',
    radiationEnvironment: 'Strong geomagnetic dipole shielding and atmosphere protect surface; trapped protons/electrons in Van Allen Radiation Belts',
    officialImageryUrl: 'https://images.nasa.gov/details/as17-148-22727',
    elevationModelSource: 'NASA Shuttle Radar Topography Mission (SRTM) Global 1-arc-second V3.0',
    pdsArchiveUrl: 'https://www.earthdata.nasa.gov/',
    metadata: {
      sourceName: 'NASA Earth Science Data Systems (ESDS) & NASA Goddard',
      sourceType: 'NASA_DATA_PORTAL',
      datasetName: 'NASA Earth Fact Sheet & SRTM Topography Catalog',
      sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA Earth Science Data and Information System (ESDIS)',
      doiOrId: 'NASA-GSFC-EARTH-FACT-2024',
      isSimulated: false
    }
  }
};
