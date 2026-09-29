export interface SatelliteData {
  id: string;
  code: string;
  name: string;
  fullName: string;
  noradId: string;
  intlDesig: string;
  operator: string;
  missionType: string;
  orbitClass: 'LEO' | 'SSO' | 'Polar LEO';
  altitudeKm: number;
  periapsisKm: number;
  apoapsisKm: number;
  inclinationDeg: number;
  periodMinutes: number;
  velocityKms: number;
  eccentricity: number;
  raanDeg: number; // Right Ascension of Ascending Node (orbital plane rotation)
  argOfPerigeeDeg: number;
  color: string;
  source: string;
  officialUrl: string;
  lastUpdated: string;
  description: string;
  // Visual scene parameters
  visualRadius: number;
  speedFactor: number;
}

export const REAL_SATELLITE_NETWORK: SatelliteData[] = [
  {
    id: 'iss',
    code: 'ISS',
    name: 'ISS',
    fullName: 'International Space Station',
    noradId: '25544',
    intlDesig: '1998-067A',
    operator: 'NASA / Roscosmos / ESA / JAXA / CSA',
    missionType: 'Habitation & Microgravity Science',
    orbitClass: 'LEO',
    altitudeKm: 418,
    periapsisKm: 416,
    apoapsisKm: 422,
    inclinationDeg: 51.64,
    periodMinutes: 92.9,
    velocityKms: 7.66,
    eccentricity: 0.0004,
    raanDeg: 115,
    argOfPerigeeDeg: 85,
    color: '#38bdf8', // Cyan / White
    source: 'CelesTrak / NASA Tracking Network',
    officialUrl: 'https://www.nasa.gov/international-space-station/',
    lastUpdated: '2026-09-29',
    description: 'Continuously crewed modular orbital research outpost conducting scientific investigations across biology, physics, and materials science.',
    visualRadius: 1.42,
    speedFactor: 1.15
  },
  {
    id: 'hst',
    code: 'HST',
    name: 'Hubble Space Telescope',
    fullName: 'Hubble Space Telescope',
    noradId: '20580',
    intlDesig: '1990-037B',
    operator: 'NASA / ESA / STScI',
    missionType: 'Ultraviolet & Optical Astrophysics',
    orbitClass: 'LEO',
    altitudeKm: 535,
    periapsisKm: 530,
    apoapsisKm: 540,
    inclinationDeg: 28.47,
    periodMinutes: 95.4,
    velocityKms: 7.59,
    eccentricity: 0.0003,
    raanDeg: 248,
    argOfPerigeeDeg: 120,
    color: '#c084fc', // Violet / White
    source: 'CelesTrak / NASA / STScI',
    officialUrl: 'https://hubblesite.org/',
    lastUpdated: '2026-09-29',
    description: 'Flagship space telescope observing distant galaxies, nebulae, and stellar birth zones in high-precision ultraviolet and optical wavelengths.',
    visualRadius: 1.62,
    speedFactor: 1.08
  },
  {
    id: 'landsat9',
    code: 'L9',
    name: 'Landsat 9',
    fullName: 'NASA / USGS Landsat 9',
    noradId: '49260',
    intlDesig: '2021-088A',
    operator: 'USGS / NASA',
    missionType: 'Multispectral Earth Surface Observation',
    orbitClass: 'SSO',
    altitudeKm: 705,
    periapsisKm: 704,
    apoapsisKm: 706,
    inclinationDeg: 98.2,
    periodMinutes: 98.9,
    velocityKms: 7.50,
    eccentricity: 0.0001,
    raanDeg: 35,
    argOfPerigeeDeg: 90,
    color: '#60a5fa', // Blue
    source: 'USGS / NASA Landsat Science',
    officialUrl: 'https://landsat.gsfc.nasa.gov/satellites/landsat-9/',
    lastUpdated: '2026-09-29',
    description: 'Advanced land-monitoring satellite carrying OLI-2 and TIRS-2 sensors providing critical multi-spectral environmental and agricultural data.',
    visualRadius: 1.84,
    speedFactor: 1.0
  },
  {
    id: 'sentinel2',
    code: 'S2',
    name: 'Sentinel-2',
    fullName: 'Copernicus Sentinel-2',
    noradId: '40697',
    intlDesig: '2015-028A',
    operator: 'ESA / European Commission (Copernicus)',
    missionType: 'High-Resolution Multispectral Land Monitoring',
    orbitClass: 'SSO',
    altitudeKm: 786,
    periapsisKm: 785,
    apoapsisKm: 787,
    inclinationDeg: 98.62,
    periodMinutes: 100.6,
    velocityKms: 7.46,
    eccentricity: 0.0001,
    raanDeg: 198,
    argOfPerigeeDeg: 110,
    color: '#34d399', // Emerald Green
    source: 'ESA Copernicus Open Access / CelesTrak',
    officialUrl: 'https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2',
    lastUpdated: '2026-09-29',
    description: 'European Earth observation constellation delivering 13-band optical imagery for forest monitoring, water quality tracking, and disaster response.',
    visualRadius: 2.06,
    speedFactor: 0.94
  },
  {
    id: 'noaa20',
    code: 'N20',
    name: 'NOAA-20',
    fullName: 'NOAA-20 (JPSS-1)',
    noradId: '43013',
    intlDesig: '2017-073A',
    operator: 'NOAA / NASA',
    missionType: 'Next-Gen Numerical Weather Prediction',
    orbitClass: 'Polar LEO',
    altitudeKm: 824,
    periapsisKm: 822,
    apoapsisKm: 826,
    inclinationDeg: 98.7,
    periodMinutes: 101.4,
    velocityKms: 7.44,
    eccentricity: 0.0002,
    raanDeg: 312,
    argOfPerigeeDeg: 140,
    color: '#fbbf24', // Amber Gold
    source: 'NOAA NESDIS / CelesTrak',
    officialUrl: 'https://www.nesdis.noaa.gov/our-satellites/currently-flying/joint-polar-satellite-system',
    lastUpdated: '2026-09-29',
    description: 'Primary polar-orbiting operational environmental satellite providing critical atmospheric soundings and temperature profiles for global forecasting.',
    visualRadius: 2.28,
    speedFactor: 0.88
  }
];

/**
 * Calculates 3D Cartesian coordinates for a satellite at a given orbital true anomaly (theta)
 * taking into account its semi-major axis, eccentricity, inclination, and RAAN.
 */
export function calculateOrbitPoint(
  sat: SatelliteData,
  thetaRad: number,
  scale: number = 1.0
): { x: number; y: number; z: number } {
  // Elliptical distance from center: r = a(1 - e^2) / (1 + e*cos(theta))
  const r = (sat.visualRadius * scale * (1 - sat.eccentricity * sat.eccentricity)) /
    (1 + sat.eccentricity * Math.cos(thetaRad));

  const inc = (sat.inclinationDeg * Math.PI) / 180;
  const raan = (sat.raanDeg * Math.PI) / 180;
  const omega = (sat.argOfPerigeeDeg * Math.PI) / 180;
  const u = thetaRad + omega; // argument of latitude

  // Standard orbital transformation from orbital plane to Earth-Centered Inertial (ECI)
  const cosU = Math.cos(u);
  const sinU = Math.sin(u);
  const cosRaan = Math.cos(raan);
  const sinRaan = Math.sin(raan);
  const cosInc = Math.cos(inc);
  const sinInc = Math.sin(inc);

  const x = r * (cosRaan * cosU - sinRaan * sinU * cosInc);
  const y = r * sinU * sinInc;
  const z = r * (sinRaan * cosU + cosRaan * sinU * cosInc);

  return { x, y, z };
}
