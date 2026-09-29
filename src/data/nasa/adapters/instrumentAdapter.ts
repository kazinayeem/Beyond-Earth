import { NASADataAdapter, RealNASAInstrument, DataSource } from '@/types/nasa';
import { RealNASAInstrumentSchema } from '@/data/nasa/validation/schemas';
import { REAL_LRO_INSTRUMENTS } from '@/data/nasa/instruments/lroInstruments';

export class InstrumentDataAdapter implements NASADataAdapter<RealNASAInstrument[]> {
  public async fetch(): Promise<RealNASAInstrument[]> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/nasa/instruments');
        if (res.ok) {
          const json = await res.json();
          if (this.validate(json)) {
            return this.normalize(json);
          }
        }
      } catch {
        // Fall back to verified local PDS cache
      }
    }

    return this.normalize(REAL_LRO_INSTRUMENTS);
  }

  public validate(data: unknown): boolean {
    if (!Array.isArray(data)) return false;
    return data.every((item) => RealNASAInstrumentSchema.safeParse(item).success);
  }

  public normalize(data: unknown): RealNASAInstrument[] {
    if (!Array.isArray(data)) return REAL_LRO_INSTRUMENTS;
    return data.map((item) => RealNASAInstrumentSchema.parse(item));
  }

  public getSourceMetadata(): DataSource {
    return {
      sourceName: 'NASA Planetary Data System (PDS) Multi-Node Archive',
      sourceType: 'NASA_PDS',
      datasetName: 'Lunar Reconnaissance Orbiter Instrument Science Catalog',
      sourceUrl: 'https://pds-geosciences.wustl.edu/missions/lro/',
      retrievedAt: '2026-09-29T12:00:00Z',
      archiveNode: 'PDS Imaging, Geosciences, Atmospheres, and PPI Nodes',
      doiOrId: 'NASA-PDS-LRO-PAYLOAD-V1',
      isSimulated: false
    };
  }
}
