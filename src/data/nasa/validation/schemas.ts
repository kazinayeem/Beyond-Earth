import { z } from 'zod';

export const DataSourceSchema = z.object({
  sourceName: z.string(),
  sourceType: z.enum(['NASA_API', 'NASA_PDS', 'NASA_DATA_PORTAL', 'OTHER_SPACE_AGENCY']),
  datasetName: z.string(),
  sourceUrl: z.string().url(),
  retrievedAt: z.string(),
  license: z.string().optional(),
  archiveNode: z.string().optional(),
  doiOrId: z.string().optional(),
  isSimulated: z.boolean().optional()
});

export const RealPlanetaryDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  designation: z.string(),
  massKg: z.string(),
  meanRadiusKm: z.number().positive(),
  surfaceGravityMs2: z.number().positive(),
  escapeVelocityKms: z.number().positive(),
  averageDistanceKm: z.number().positive(),
  orbitalPeriodDays: z.number().positive(),
  atmosphereComposition: z.string(),
  surfaceTemperatureRangeC: z.string(),
  radiationEnvironment: z.string(),
  officialImageryUrl: z.string(),
  elevationModelSource: z.string(),
  pdsArchiveUrl: z.string().url(),
  metadata: DataSourceSchema
});

export const RealNASAInstrumentSchema = z.object({
  id: z.string(),
  acronym: z.string(),
  fullName: z.string(),
  missionName: z.string(),
  principalInvestigator: z.string(),
  leadInstitution: z.string(),
  realMassKg: z.number().positive(),
  realPowerW: z.number().positive(),
  realScienceDescription: z.string(),
  scientificPhenomenon: z.string(),
  pdsDatasetId: z.string(),
  pdsArchiveUrl: z.string().url(),
  gameMapping: z.object({
    category: z.literal('instruments'),
    gameCostM: z.number().positive(),
    gameScienceValue: z.number().positive(),
    gameRiskModPct: z.number(),
    gameEffectSummary: z.string()
  }),
  metadata: DataSourceSchema
});

export const RealNASAMissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  spacecraftName: z.string(),
  launchDate: z.string(),
  destination: z.string(),
  launchVehicle: z.string(),
  missionStatus: z.string(),
  officialGoals: z.array(z.string()),
  primaryInstruments: z.array(z.string()),
  totalScienceReturnTB: z.number().positive(),
  nasaProgram: z.string(),
  pdsDataNode: z.string(),
  sourceUrl: z.string().url(),
  metadata: DataSourceSchema
});
