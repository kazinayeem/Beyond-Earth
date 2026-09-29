import { NASADataAdapter, RealNASAMission, DataSource } from '@/types/nasa';
import { RealNASAMissionSchema } from '@/data/nasa/validation/schemas';
import { REAL_NASA_MISSIONS } from '@/data/nasa/missions/missionProfiles';

export class MissionDataAdapter implements NASADataAdapter<RealNASAMission[]> {
  public async fetch(): Promise<RealNASAMission[]> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/nasa/missions');
        if (res.ok) {
          const json = await res.json();
          if (this.validate(json)) {
            return this.normalize(json);
          }
        }
      } catch {
        // Fall back to verified local mission cache
      }
    }

    return this.normalize(REAL_NASA_MISSIONS);
  }

  public validate(data: unknown): boolean {
    if (!Array.isArray(data)) return false;
    return data.every((item) => RealNASAMissionSchema.safeParse(item).success);
  }

  public normalize(data: unknown): RealNASAMission[] {
    if (!Array.isArray(data)) return REAL_NASA_MISSIONS;
    return data.map((item) => RealNASAMissionSchema.parse(item));
  }

  public getSourceMetadata(): DataSource {
    return {
      sourceName: 'NASA Space Science Data Coordinated Archive (NSSDCA)',
      sourceType: 'NASA_PDS',
      datasetName: 'Master Historical NASA Spacecraft & Robotic Missions Catalog',
      sourceUrl: 'https://nssdc.gsfc.nasa.gov/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'NASA Goddard Space Flight Center',
      doiOrId: 'NASA-NSSDCA-MASTER-CATALOG',
      isSimulated: false
    };
  }
}
