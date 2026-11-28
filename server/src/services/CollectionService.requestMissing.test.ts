import { describe, expect, it, vi } from 'vitest';
import { CollectionService } from './CollectionService';

/**
 * Owner request 2026-11-28: "request the missing parts of the collection". A request must create the
 * missing TMDB parts, monitor them, and hand each one to the search worker — not merely count them
 * (the pre-existing `searchMissingMovies` returned a number and did nothing).
 */
function fakePrisma(movies: Array<{ id: number; fileVariants: unknown[] }>) {
  const monitoredIds: number[] = [];
  const updateMany = vi.fn(async (args: { where: { id: { in: number[] } } }) => {
    monitoredIds.push(...args.where.id.in);
    return { count: args.where.id.in.length };
  });
  const prisma = {
    collection: {
      findUnique: vi.fn(async () => ({
        id: 3,
        tmdbCollectionId: 42,
        monitored: true,
        qualityProfileId: 1,
        movies,
      })),
    },
    movie: {
      findMany: vi.fn(async () => movies),
      updateMany,
    },
  };
  return { prisma: prisma as never, monitoredIds, updateMany };
}

describe('CollectionService.requestMissingMovies', () => {
  it('creates new parts, monitors the missing ones and searches each', async () => {
    const missing = [{ id: 11, fileVariants: [] }, { id: 12, fileVariants: [] }];
    const present = [{ id: 10, fileVariants: [{ id: 99 }] }];
    const { prisma, monitoredIds } = fakePrisma([present[0]!, ...missing]);
    const service = new CollectionService(prisma, {} as never, {} as never);
    const sync = vi.fn(async () => ({ added: 2, updated: 0 }));
    service.syncCollectionMovies = sync as never;
    const searched: number[] = [];

    const result = await service.requestMissingMovies(3, {
      searchMovie: async (movieId) => { searched.push(movieId); },
    });

    expect(sync).toHaveBeenCalledWith(3);
    expect(monitoredIds).toEqual([11, 12]);
    expect(searched.sort()).toEqual([11, 12]);
    expect(result).toEqual({
      created: 2,
      updated: 0,
      total: 3,
      missing: 2,
      monitored: 2,
      searched: 2,
    });
  });

  it('searches nothing when the collection is complete', async () => {
    const { prisma } = fakePrisma([{ id: 10, fileVariants: [{ id: 1 }] }]);
    const service = new CollectionService(prisma, {} as never, {} as never);
    service.syncCollectionMovies = vi.fn(async () => ({ added: 0, updated: 0 })) as never;
    const searched: number[] = [];

    const result = await service.requestMissingMovies(3, {
      searchMovie: async (movieId) => { searched.push(movieId); },
    });

    expect(searched).toEqual([]);
    expect(result).toMatchObject({ missing: 0, monitored: 0, searched: 0 });
  });
});
