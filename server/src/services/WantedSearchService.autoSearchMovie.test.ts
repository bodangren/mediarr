/**
 * Core path tests for WantedSearchService.autoSearchMovie.
 *
 * The existing release-date guard tests (WantedSearchService.releaseDate.test.ts) already
 * cover the guard logic. This file covers the five previously untested paths:
 *   1. Movie not found in the database
 *   2. No releases returned by the indexers
 *   3. Best candidate below the auto-grab score threshold
 *   4. Successful grab — RELEASE_GRABBED event emitted + result has success: true
 *   5. searchAllIndexers throws — failure returned (not re-thrown)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WantedSearchService } from './WantedSearchService';
import type { MediaSearchService, SearchCandidate } from './MediaSearchService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function pastDate(daysAgo = 5): Date {
  return new Date(Date.now() - daysAgo * ONE_DAY_MS);
}

function makeCandidate(title: string, score: number): SearchCandidate {
  return {
    title,
    customFormatScore: score,
    size: 2_000_000_000,
    seeders: 30,
    indexerId: 1,
    guid: `guid-${title}`,
    magnetUrl: `magnet:?xt=urn:btih:${title.replace(/\W/g, '')}`,
  } as unknown as SearchCandidate;
}

function baseMovie(overrides: Partial<{
  id: number;
  title: string;
  year: number | null;
  qualityProfileId: number;
  digitalRelease: Date | null;
  physicalRelease: Date | null;
  inCinemas: Date | null;
}> = {}) {
  return {
    id: 1,
    title: 'The Matrix',
    year: 1999,
    qualityProfileId: 1,
    monitored: true,
    path: null,
    digitalRelease: pastDate(10),
    physicalRelease: null,
    inCinemas: null,
    ...overrides,
  };
}

function buildService() {
  const grabRelease = vi.fn().mockResolvedValue({ infoHash: 'a'.repeat(40), name: 'grabbed' });
  const searchAllIndexers = vi.fn().mockResolvedValue({ releases: [] as SearchCandidate[] });
  const mediaSearchService = { searchAllIndexers, grabRelease } as unknown as MediaSearchService;

  const emit = vi.fn().mockResolvedValue(undefined);
  const activityEventEmitter = { emit } as unknown as ActivityEventEmitter;

  const movieFindUnique = vi.fn();
  const prisma = {
    movie: { findUnique: movieFindUnique },
    episode: { findUnique: vi.fn() },
    series: { findUnique: vi.fn() },
  } as unknown as Parameters<typeof WantedSearchService.prototype.constructor>[1];

  const service = new WantedSearchService(mediaSearchService, prisma, activityEventEmitter);

  return { service, searchAllIndexers, grabRelease, emit, movieFindUnique };
}

// ─── autoSearchMovie — core paths ─────────────────────────────────────────────

describe('WantedSearchService — autoSearchMovie core paths', () => {
  let service: WantedSearchService;
  let searchAllIndexers: ReturnType<typeof vi.fn>;
  let grabRelease: ReturnType<typeof vi.fn>;
  let emit: ReturnType<typeof vi.fn>;
  let movieFindUnique: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const built = buildService();
    service = built.service;
    searchAllIndexers = built.searchAllIndexers;
    grabRelease = built.grabRelease;
    emit = built.emit;
    movieFindUnique = built.movieFindUnique;
  });

  it('returns failure when movie does not exist in the database', async () => {
    movieFindUnique.mockResolvedValue(null);

    const result = await service.autoSearchMovie(999);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('Movie not found');
    expect(searchAllIndexers).not.toHaveBeenCalled();
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it('returns failure and emits a skip event when no releases are found', async () => {
    movieFindUnique.mockResolvedValue(baseMovie());
    searchAllIndexers.mockResolvedValue({ releases: [] });

    const result = await service.autoSearchMovie(1);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/no releases found/i);
    expect(grabRelease).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, sourceModule: 'wanted-search-service' }),
    );
  });

  it('returns failure when the best candidate is below the score threshold (50)', async () => {
    movieFindUnique.mockResolvedValue(baseMovie());
    searchAllIndexers.mockResolvedValue({
      releases: [makeCandidate('The.Matrix.1999.1080p.BluRay.mkv', 30)],
    });

    const result = await service.autoSearchMovie(1);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/below threshold/i);
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it('grabs the best candidate and emits RELEASE_GRABBED on success', async () => {
    const movie = baseMovie({ id: 5, title: 'The Matrix' });
    movieFindUnique.mockResolvedValue(movie);
    const candidate = makeCandidate('The.Matrix.1999.1080p.BluRay.mkv', 80);
    searchAllIndexers.mockResolvedValue({ releases: [candidate] });

    const result = await service.autoSearchMovie(5);

    expect(result.success).toBe(true);
    expect(result.release).toEqual(candidate);
    expect(grabRelease).toHaveBeenCalledWith(
      candidate,
      expect.objectContaining({ movieId: 5 }),
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'RELEASE_GRABBED',
        success: true,
        details: expect.objectContaining({ movieId: 5 }),
      }),
    );
  });

  it('returns failure when searchAllIndexers throws (does not re-throw)', async () => {
    movieFindUnique.mockResolvedValue(baseMovie());
    searchAllIndexers.mockRejectedValue(new Error('Indexer network timeout'));

    const result = await service.autoSearchMovie(1);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/Search failed.*Indexer network timeout/);
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it('grabs the highest-scored candidate when multiple releases are returned', async () => {
    movieFindUnique.mockResolvedValue(baseMovie({ id: 1, title: 'The Matrix' }));
    const lowerScore = makeCandidate('The.Matrix.1999.720p.BluRay.mkv', 60);
    const higherScore = makeCandidate('The.Matrix.1999.1080p.BluRay.mkv', 90);
    // searchAllIndexers is assumed to return releases sorted best-first (highest score first)
    searchAllIndexers.mockResolvedValue({ releases: [higherScore, lowerScore] });

    const result = await service.autoSearchMovie(1);

    expect(result.success).toBe(true);
    expect(grabRelease).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'The.Matrix.1999.1080p.BluRay.mkv' }),
      expect.anything(),
    );
  });
});
