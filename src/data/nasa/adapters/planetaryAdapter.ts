import { NASADataAdapter, RealPlanetaryData, DataSource } from '@/types/nasa';
import { RealPlanetaryDataSchema } from '@/data/nasa/validation/schemas';
import { REAL_PLANETARY_DATA } from '@/data/nasa/planets/planetaryData';

export class PlanetaryDataAdapter implements NASADataAdapter<RealPlanetaryData> {
  private targetKey: string;

  constructor(targetKey: string = 'moon') {
    this.targetKey = targetKey.toLowerCase();
  }

  public async fetch(): Promise<RealPlanetaryData> {
    // Check if running on client and can fetch from internal API
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/nasa/planetary?target=${this.targetKey}`);
        if (res.ok) {
          const json = await res.json();
          if (this.validate(json)) {
            return this.normalize(json);
          }
        }
      } catch {
        // Fall back to verified offline cache gracefully
      }
    }

    // Verified local NASA dataset cache
    const cached = REAL_PLANETARY_DATA[this.targetKey] || REAL_PLANETARY_DATA.moon;
    return this.normalize(cached);
  }

  public validate(data: unknown): boolean {
    const parsed = RealPlanetaryDataSchema.safeParse(data);
    return parsed.success;
  }

  public normalize(data: unknown): RealPlanetaryData {
    const valid = RealPlanetaryDataSchema.parse(data);
    return {
      ...valid,
      metadata: {
        ...valid.metadata,
        retrievedAt: valid.metadata.retrievedAt || new Date().toISOString()
      }
    };
  }

  public getSourceMetadata(): DataSource {
    const cached = REAL_PLANETARY_DATA[this.targetKey] || REAL_PLANETARY_DATA.moon;
    return cached.metadata;
  }
}
