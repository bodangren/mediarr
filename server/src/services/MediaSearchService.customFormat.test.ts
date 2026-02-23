import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSearchService } from './MediaSearchService';

function buildIndexerResult(input: {
  title: string;
  guid: string;
  seeders: number;
  size: bigint;
  magnetUrl: string;
  indexerFlags?: string;
}) {
  return {
    title: input.title,
    guid: input.guid,
    publishDate: new Date('2026-02-19T00:00:00.000Z'),
    size: input.size,
    seeders: input.seeders,
    categories: [2000],
    protocol: 'torrent',
    magnetUrl: input.magnetUrl,
    ...(input.indexerFlags ? { indexerFlags: input.indexerFlags } : {}),
  };
}

describe('MediaSearchService custom format scoring integration', () => {
  let indexerRepository: {
    findAllEnabled: ReturnType<typeof vi.fn>;
  };
  let indexerFactory: {
    fromDatabaseRecord: ReturnType<typeof vi.fn>;
  };
  let torrentManager: {
    addTorrent: ReturnType<typeof vi.fn>;
  };
  let customFormatRepository: {
    findByQualityProfileId: ReturnType<typeof vi.fn>;
  };
  let service: MediaSearchService;

  beforeEach(() => {
    indexerRepository = {
      findAllEnabled: vi.fn(),
    };
    indexerFactory = {
      fromDatabaseRecord: vi.fn(),
    };
    torrentManager = {
      addTorrent: vi.fn(),
    };
    customFormatRepository = {
      findByQualityProfileId: vi.fn(),
    };

    service = new MediaSearchService(
      indexerRepository as unknown as ConstructorParameters<typeof MediaSearchService>[0],
      indexerFactory as unknown as ConstructorParameters<typeof MediaSearchService>[1],
      torrentManager as unknown as ConstructorParameters<typeof MediaSearchService>[2],
      undefined,
      customFormatRepository as unknown as ConstructorParameters<typeof MediaSearchService>[4],
    );
  });

  it('prioritizes higher custom format score over seeders in ranking', async () => {
    const indexer = {
      search: vi.fn().mockResolvedValue([
        buildIndexerResult({
          title: 'The.Matrix.1999.1080p.BluRay.x264',
          guid: 'normal-release',
          seeders: 50,
          size: BigInt(2_000_000_000),
          magnetUrl: 'magnet:?xt=urn:btih:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        }),
        buildIndexerResult({
          title: 'The.Matrix.1999.1080p.BluRay.x265',
          guid: 'preferred-release',
          seeders: 8,
          size: BigInt(2_100_000_000),
          magnetUrl: 'magnet:?xt=urn:btih:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        }),
      ]),
    };

    indexerRepository.findAllEnabled.mockResolvedValue([
      {
        id: 1,
        name: 'Indexer One',
      },
    ]);
    indexerFactory.fromDatabaseRecord.mockReturnValue(indexer);
    customFormatRepository.findByQualityProfileId.mockResolvedValue([
      {
        score: 150,
        customFormat: {
          id: 1,
          name: 'x265 Preferred',
          includeCustomFormatWhenRenaming: false,
          conditions: [
            {
              type: 'regex',
              field: 'title',
              operator: 'contains',
              value: 'x265',
            },
          ],
          scores: [],
          createdAt: new Date('2026-02-19T00:00:00.000Z'),
          updatedAt: new Date('2026-02-19T00:00:00.000Z'),
        },
      },
    ]);

    const result = await service.searchAllIndexers({
      query: 'The Matrix 1999',
      qualityProfileId: 10,
    });

    expect(customFormatRepository.findByQualityProfileId).toHaveBeenCalledWith(10);
    expect(result.releases[0]?.title).toContain('x265');
    expect(result.releases[0]?.customFormatScore).toBe(150);
  });

  it('keeps the highest-scored duplicate when infoHash is shared across indexers', async () => {
    const firstIndexer = {
      search: vi.fn().mockResolvedValue([
        buildIndexerResult({
          title: 'Duplicated.Release.1080p',
          guid: 'dup-release-a',
          seeders: 80,
          size: BigInt(2_000_000_000),
          magnetUrl: 'magnet:?xt=urn:btih:CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
        }),
      ]),
    };
    const secondIndexer = {
      search: vi.fn().mockResolvedValue([
        buildIndexerResult({
          title: 'Duplicated.Release.1080p.x265',
          guid: 'dup-release-b',
          seeders: 5,
          size: BigInt(2_100_000_000),
          magnetUrl: 'magnet:?xt=urn:btih:CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
        }),
      ]),
    };

    indexerRepository.findAllEnabled.mockResolvedValue([
      { id: 1, name: 'Indexer One' },
      { id: 2, name: 'Indexer Two' },
    ]);
    indexerFactory.fromDatabaseRecord
      .mockReturnValueOnce(firstIndexer)
      .mockReturnValueOnce(secondIndexer);

    customFormatRepository.findByQualityProfileId.mockResolvedValue([
      {
        score: 250,
        customFormat: {
          id: 2,
          name: 'x265 Strong Preference',
          includeCustomFormatWhenRenaming: false,
          conditions: [
            {
              type: 'regex',
              field: 'title',
              operator: 'contains',
              value: 'x265',
            },
          ],
          scores: [],
          createdAt: new Date('2026-02-19T00:00:00.000Z'),
          updatedAt: new Date('2026-02-19T00:00:00.000Z'),
        },
      },
    ]);

    const result = await service.searchAllIndexers({
      query: 'Duplicated Release',
      qualityProfileId: 10,
    });

    expect(result.totalResults).toBe(2);
    expect(result.deduplicatedCount).toBe(1);
    expect(result.releases[0]?.title).toContain('x265');
    expect(result.releases[0]?.customFormatScore).toBe(250);
  });
});
