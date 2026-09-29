export type DataSourceType = 
  | 'NASA_API' 
  | 'NASA_PDS' 
  | 'NASA_DATA_PORTAL' 
  | 'OTHER_SPACE_AGENCY';

export interface DataSource {
  sourceName: string;
  sourceType: DataSourceType;
  datasetName: string;
  sourceUrl: string;
  retrievedAt: string;
  license?: string;
  archiveNode?: string;
  doiOrId?: string;
  isSimulated?: boolean;
}

export interface NASADataAdapter<T> {
  fetch(): Promise<T>;
  validate(data: unknown): boolean;
  normalize(data: unknown): T;
  getSourceMetadata(): DataSource;
}

export interface RealPlanetaryData {
  id: string;
  name: string;
  designation: string;
  massKg: string; // Scientific notation e.g. 7.342 × 10^22 kg
  meanRadiusKm: number; // e.g. 1737.4 km
  surfaceGravityMs2: number; // e.g. 1.62 m/s²
  escapeVelocityKms: number; // e.g. 2.38 km/s
  averageDistanceKm: number; // e.g. 384,400 km
  orbitalPeriodDays: number; // e.g. 27.32 days
  atmosphereComposition: string; // Trace helium, neon, hydrogen
  surfaceTemperatureRangeC: string; // -130°C to +120°C
  radiationEnvironment: string; // Unshielded cosmic rays & solar energetic particles
  officialImageryUrl: string;
  elevationModelSource: string;
  pdsArchiveUrl: string;
  metadata: DataSource;
}

export interface RealNASAInstrument {
  id: string;
  acronym: string;
  fullName: string;
  missionName: string;
  principalInvestigator: string;
  leadInstitution: string;
  realMassKg: number;
  realPowerW: number;
  realScienceDescription: string;
  scientificPhenomenon: string;
  pdsDatasetId: string;
  pdsArchiveUrl: string;
  gameMapping: {
    category: 'instruments';
    gameCostM: number;
    gameScienceValue: number;
    gameRiskModPct: number;
    gameEffectSummary: string;
  };
  metadata: DataSource;
}

export interface RealNASAMission {
  id: string;
  name: string;
  spacecraftName: string;
  launchDate: string;
  destination: string;
  launchVehicle: string;
  missionStatus: string;
  officialGoals: string[];
  primaryInstruments: string[];
  totalScienceReturnTB: number;
  nasaProgram: string;
  pdsDataNode: string;
  sourceUrl: string;
  metadata: DataSource;
}

export interface ProvenanceRecord {
  title: string;
  datasetName: string;
  mission: string;
  archive: string;
  lastRetrieved: string;
  dataType: 'image' | 'telemetry' | 'science' | 'geometry' | 'metadata' | 'instrument';
  officialSourceUrl: string;
  notes: string;
}
