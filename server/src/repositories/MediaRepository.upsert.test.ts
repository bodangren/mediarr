import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaRepository, type UpsertMovieInput, type UpsertSeriesInput } from './MediaRepository';
import * as schema from '../db/schema';

type InsertBuilder = {
  values: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

function makeInsertBuilder(rows: any[] = []): InsertBuilder {
  const builder: any = {};
  builder.values = vi.fn().mockReturnValue(builder);
  builder.onConflictDoUpdate = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockResolvedValue(rows);
  return builder as InsertBuilder;
}

interface MockConfig {
  media?: any[];
  movies?: any[];
  series?: any[];
}

function makeDb(config: MockConfig = {}) {
  const builders: Record<string, InsertBuilder> = {};
  if (config.media) builders.media = makeInsertBuilder(config.media);
  if (config.movies) builders.movies = makeInsertBuilder(config.movies);
  if (config.series) builders.series = makeInsertBuilder(config.series);

  return {
    drizzle: {
      insert: vi.fn().mockImplementation((table: any) => {
        if (table === schema.media) return builders.media ?? makeInsertBuilder([]);
        if (table === schema.movies) return builders.movies ?? makeInsertBuilder([]);
        if (table === schema.series) return builders.series ?? makeInsertBuilder([]);
        throw new Error(`unexpected table in mock: ${table}`);
      }),
    },
  };
}

function findInsertCall(mock: any, table: any) {
  const idx = mock.mock.calls.findIndex((call: any[]) => call[0] === table);
  if (idx === -1) return undefined;
  return {
    args: mock.mock.calls[idx],
    result: mock.mock.results[idx]?.value as InsertBuilder | undefined,
  };
}

const baseMovieInput: UpsertMovieInput = {
  tmdbId: 100,
  title: 'Test Movie',
  cleanTitle: 'test movie',
  sortTitle: 'test movie',
  status: 'released',
  monitored: true,
  qualityProfileId: 1,
  year: 2024,
};

const baseSeriesInput: UpsertSeriesInput = {
  tvdbId: 200,
  title: 'Test Series',
  cleanTitle: 'test series',
  sortTitle: 'test series',
  status: 'continuing',
  monitored: true,
  qualityProfileId: 1,
  year: 2024,
};

describe('MediaRepository.upsertMovie (native Drizzle)', () => {
  let prisma: ReturnType<typeof makeDb>;
  let repo: MediaRepository;

  beforeEach(() => {
    prisma = makeDb({
      media: [{ id: 1, mediaType: 'MOVIE', tmdbId: 100 }],
      movies: [{ id: 10, mediaId: 1, tmdbId: 100 }],
    });
    repo = new MediaRepository(prisma as any);
  });

  it('creates media record then movie record on first upsert', async () => {
    const result = await repo.upsertMovie(baseMovieInput);

    expect(prisma.drizzle.insert).toHaveBeenCalledTimes(2);

    const mediaCall = findInsertCall(prisma.drizzle.insert, schema.media);
    const movieCall = findInsertCall(prisma.drizzle.insert, schema.movies);
    expect(mediaCall).toBeDefined();
    expect(movieCall).toBeDefined();

    const mediaValues = mediaCall!.result!.values.mock.calls[0]![0];
    expect(mediaValues).toMatchObject({
      mediaType: 'MOVIE',
      tmdbId: 100,
    });

    const mediaConflict = mediaCall!.result!.onConflictDoUpdate.mock.calls[0]![0];
    expect(mediaConflict.target).toEqual([schema.media.mediaType, schema.media.tmdbId]);
    expect(mediaConflict.set).toMatchObject({ title: 'Test Movie', year: 2024 });

    const movieValues = movieCall!.result!.values.mock.calls[0]![0];
    expect(movieValues).toMatchObject({
      tmdbId: 100,
      mediaId: 1,
    });

    const movieConflict = movieCall!.result!.onConflictDoUpdate.mock.calls[0]![0];
    expect(movieConflict.target).toBe(schema.movies.tmdbId);

    expect(result).toEqual({ id: 10, mediaId: 1, tmdbId: 100 });
  });

  it('updates existing media and movie records on re-upsert', async () => {
    const updatedInput = { ...baseMovieInput, title: 'Updated Title', year: 2025 };
    await repo.upsertMovie(updatedInput);

    const mediaCall = findInsertCall(prisma.drizzle.insert, schema.media);
    const movieCall = findInsertCall(prisma.drizzle.insert, schema.movies);
    const mediaSet = mediaCall!.result!.onConflictDoUpdate.mock.calls[0]![0].set;
    const movieSet = movieCall!.result!.onConflictDoUpdate.mock.calls[0]![0].set;
    expect(mediaSet).toMatchObject({ title: 'Updated Title', year: 2025 });
    expect(movieSet).toMatchObject({ title: 'Updated Title', year: 2025 });
  });

  it('propagates all optional fields on create', async () => {
    const fullInput: UpsertMovieInput = {
      ...baseMovieInput,
      imdbId: 'tt1234567',
      overview: 'A great movie',
      path: '/movies/Test Movie',
      posterUrl: 'https://example.com/poster.jpg',
      minimumAvailability: 'released',
      inCinemas: new Date('2024-01-01'),
      digitalRelease: new Date('2024-03-01'),
      physicalRelease: new Date('2024-06-01'),
    };

    await repo.upsertMovie(fullInput);

    const movieCall = findInsertCall(prisma.drizzle.insert, schema.movies);
    const movieValues = movieCall!.result!.values.mock.calls[0]![0];
    expect(movieValues.imdbId).toBe('tt1234567');
    expect(movieValues.overview).toBe('A great movie');
    expect(movieValues.path).toBe('/movies/Test Movie');
    expect(movieValues.posterUrl).toBe('https://example.com/poster.jpg');
    expect(movieValues.minimumAvailability).toBe('released');
    expect(movieValues.inCinemas).toEqual(new Date('2024-01-01'));
    expect(movieValues.digitalRelease).toEqual(new Date('2024-03-01'));
    expect(movieValues.physicalRelease).toEqual(new Date('2024-06-01'));
  });

  it('normalizes omitted optional fields to null', async () => {
    await repo.upsertMovie(baseMovieInput);

    const movieCall = findInsertCall(prisma.drizzle.insert, schema.movies);
    const movieValues = movieCall!.result!.values.mock.calls[0]![0];
    expect(movieValues.imdbId).toBeNull();
    expect(movieValues.overview).toBeNull();
    expect(movieValues.path).toBeNull();
    expect(movieValues.posterUrl).toBeNull();
    expect(movieValues.minimumAvailability).toBeNull();
  });
});

describe('MediaRepository.upsertSeries (native Drizzle)', () => {
  let prisma: ReturnType<typeof makeDb>;
  let repo: MediaRepository;

  beforeEach(() => {
    prisma = makeDb({
      media: [{ id: 2, mediaType: 'TV', tvdbId: 200 }],
      series: [{ id: 20, mediaId: 2, tvdbId: 200 }],
    });
    repo = new MediaRepository(prisma as any);
  });

  it('creates media record then series record on first upsert', async () => {
    const result = await repo.upsertSeries(baseSeriesInput);

    expect(prisma.drizzle.insert).toHaveBeenCalledTimes(2);

    const mediaCall = findInsertCall(prisma.drizzle.insert, schema.media);
    const seriesCall = findInsertCall(prisma.drizzle.insert, schema.series);
    expect(mediaCall).toBeDefined();
    expect(seriesCall).toBeDefined();

    const mediaValues = mediaCall!.result!.values.mock.calls[0]![0];
    expect(mediaValues).toMatchObject({
      mediaType: 'TV',
      tvdbId: 200,
    });

    const mediaConflict = mediaCall!.result!.onConflictDoUpdate.mock.calls[0]![0];
    expect(mediaConflict.target).toEqual([schema.media.mediaType, schema.media.tvdbId]);

    const seriesValues = seriesCall!.result!.values.mock.calls[0]![0];
    expect(seriesValues).toMatchObject({
      tvdbId: 200,
      mediaId: 2,
    });

    expect(result).toEqual({ id: 20, mediaId: 2, tvdbId: 200 });
  });

  it('updates existing media and series records on re-upsert', async () => {
    const updatedInput = { ...baseSeriesInput, title: 'Updated Series', status: 'ended' };
    await repo.upsertSeries(updatedInput);

    const mediaCall = findInsertCall(prisma.drizzle.insert, schema.media);
    const seriesCall = findInsertCall(prisma.drizzle.insert, schema.series);
    const mediaSet = mediaCall!.result!.onConflictDoUpdate.mock.calls[0]![0].set;
    const seriesSet = seriesCall!.result!.onConflictDoUpdate.mock.calls[0]![0].set;
    expect(mediaSet).toMatchObject({ title: 'Updated Series', status: 'ended' });
    expect(seriesSet).toMatchObject({ title: 'Updated Series', status: 'ended' });
  });

  it('propagates all optional fields on create', async () => {
    const fullInput: UpsertSeriesInput = {
      ...baseSeriesInput,
      tmdbId: 300,
      imdbId: 'tt9876543',
      overview: 'A great series',
      path: '/tv/Test Series',
      network: 'HBO',
      posterUrl: 'https://example.com/poster.jpg',
    };

    await repo.upsertSeries(fullInput);

    const seriesCall = findInsertCall(prisma.drizzle.insert, schema.series);
    const seriesValues = seriesCall!.result!.values.mock.calls[0]![0];
    expect(seriesValues.tmdbId).toBe(300);
    expect(seriesValues.imdbId).toBe('tt9876543');
    expect(seriesValues.overview).toBe('A great series');
    expect(seriesValues.path).toBe('/tv/Test Series');
    expect(seriesValues.network).toBe('HBO');
    expect(seriesValues.posterUrl).toBe('https://example.com/poster.jpg');
  });

  it('propagates posterUrl to series but not media', async () => {
    const inputWithPoster = { ...baseSeriesInput, posterUrl: 'https://example.com/poster.jpg' };
    await repo.upsertSeries(inputWithPoster);

    const mediaCall = findInsertCall(prisma.drizzle.insert, schema.media);
    const mediaValues = mediaCall!.result!.values.mock.calls[0]![0];
    expect(mediaValues.posterUrl).toBeUndefined();

    const seriesCall = findInsertCall(prisma.drizzle.insert, schema.series);
    const seriesValues = seriesCall!.result!.values.mock.calls[0]![0];
    expect(seriesValues.posterUrl).toBe('https://example.com/poster.jpg');
  });
});