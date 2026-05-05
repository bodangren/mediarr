import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaRepository, type UpsertMovieInput, type UpsertSeriesInput } from './MediaRepository';

function makePrisma() {
  return {
    media: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    movie: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    series: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
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

describe('MediaRepository.upsertMovie', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: MediaRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new MediaRepository(prisma as any);
  });

  it('creates media record then movie record on first upsert', async () => {
    prisma.media.upsert.mockResolvedValue({ id: 1, mediaType: 'MOVIE', tmdbId: 100 });
    prisma.movie.upsert.mockResolvedValue({ id: 10, mediaId: 1, tmdbId: 100 });

    const result = await repo.upsertMovie(baseMovieInput);

    expect(prisma.media.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.media.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { mediaType_tmdbId: { mediaType: 'MOVIE', tmdbId: 100 } },
      }),
    );
    expect(prisma.movie.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.movie.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tmdbId: 100 },
        create: expect.objectContaining({ mediaId: 1, tmdbId: 100 }),
      }),
    );
    expect(result).toEqual({ id: 10, mediaId: 1, tmdbId: 100 });
  });

  it('updates existing media and movie records on re-upsert', async () => {
    prisma.media.upsert.mockResolvedValue({ id: 1, mediaType: 'MOVIE', tmdbId: 100 });
    prisma.movie.upsert.mockResolvedValue({ id: 10, mediaId: 1, tmdbId: 100 });

    const updatedInput = { ...baseMovieInput, title: 'Updated Title', year: 2025 };
    await repo.upsertMovie(updatedInput);

    expect(prisma.media.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ title: 'Updated Title', year: 2025 }),
      }),
    );
    expect(prisma.movie.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ title: 'Updated Title', year: 2025 }),
      }),
    );
  });

  it('propagates all optional fields on create', async () => {
    prisma.media.upsert.mockResolvedValue({ id: 1, mediaType: 'MOVIE', tmdbId: 100 });
    prisma.movie.upsert.mockResolvedValue({ id: 10, mediaId: 1, tmdbId: 100 });

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

    const movieCreate = prisma.movie.upsert.mock.calls[0]![0].create;
    expect(movieCreate.imdbId).toBe('tt1234567');
    expect(movieCreate.overview).toBe('A great movie');
    expect(movieCreate.path).toBe('/movies/Test Movie');
    expect(movieCreate.posterUrl).toBe('https://example.com/poster.jpg');
    expect(movieCreate.minimumAvailability).toBe('released');
    expect(movieCreate.inCinemas).toEqual(new Date('2024-01-01'));
    expect(movieCreate.digitalRelease).toEqual(new Date('2024-03-01'));
    expect(movieCreate.physicalRelease).toEqual(new Date('2024-06-01'));
  });

  it('omits optional fields when not provided', async () => {
    prisma.media.upsert.mockResolvedValue({ id: 1, mediaType: 'MOVIE', tmdbId: 100 });
    prisma.movie.upsert.mockResolvedValue({ id: 10, mediaId: 1, tmdbId: 100 });

    await repo.upsertMovie(baseMovieInput);

    const movieCreate = prisma.movie.upsert.mock.calls[0]![0].create;
    expect(movieCreate.imdbId).toBeUndefined();
    expect(movieCreate.overview).toBeUndefined();
    expect(movieCreate.path).toBeUndefined();
    expect(movieCreate.posterUrl).toBeUndefined();
  });
});

describe('MediaRepository.upsertSeries', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: MediaRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new MediaRepository(prisma as any);
  });

  it('creates media record then series record on first upsert', async () => {
    prisma.media.upsert.mockResolvedValue({ id: 2, mediaType: 'TV', tvdbId: 200 });
    prisma.series.upsert.mockResolvedValue({ id: 20, mediaId: 2, tvdbId: 200 });

    const result = await repo.upsertSeries(baseSeriesInput);

    expect(prisma.media.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.media.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { mediaType_tvdbId: { mediaType: 'TV', tvdbId: 200 } },
      }),
    );
    expect(prisma.series.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.series.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tvdbId: 200 },
        create: expect.objectContaining({ mediaId: 2, tvdbId: 200 }),
      }),
    );
    expect(result).toEqual({ id: 20, mediaId: 2, tvdbId: 200 });
  });

  it('updates existing media and series records on re-upsert', async () => {
    prisma.media.upsert.mockResolvedValue({ id: 2, mediaType: 'TV', tvdbId: 200 });
    prisma.series.upsert.mockResolvedValue({ id: 20, mediaId: 2, tvdbId: 200 });

    const updatedInput = { ...baseSeriesInput, title: 'Updated Series', status: 'ended' };
    await repo.upsertSeries(updatedInput);

    expect(prisma.media.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ title: 'Updated Series', status: 'ended' }),
      }),
    );
    expect(prisma.series.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ title: 'Updated Series', status: 'ended' }),
      }),
    );
  });

  it('propagates all optional fields on create', async () => {
    prisma.media.upsert.mockResolvedValue({ id: 2, mediaType: 'TV', tvdbId: 200 });
    prisma.series.upsert.mockResolvedValue({ id: 20, mediaId: 2, tvdbId: 200 });

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

    const seriesCreate = prisma.series.upsert.mock.calls[0]![0].create;
    expect(seriesCreate.tmdbId).toBe(300);
    expect(seriesCreate.imdbId).toBe('tt9876543');
    expect(seriesCreate.overview).toBe('A great series');
    expect(seriesCreate.path).toBe('/tv/Test Series');
    expect(seriesCreate.network).toBe('HBO');
    expect(seriesCreate.posterUrl).toBe('https://example.com/poster.jpg');
  });

  it('omits optional fields when not provided', async () => {
    prisma.media.upsert.mockResolvedValue({ id: 2, mediaType: 'TV', tvdbId: 200 });
    prisma.series.upsert.mockResolvedValue({ id: 20, mediaId: 2, tvdbId: 200 });

    await repo.upsertSeries(baseSeriesInput);

    const seriesCreate = prisma.series.upsert.mock.calls[0]![0].create;
    expect(seriesCreate.tmdbId).toBeUndefined();
    expect(seriesCreate.imdbId).toBeUndefined();
    expect(seriesCreate.overview).toBeUndefined();
    expect(seriesCreate.path).toBeUndefined();
    expect(seriesCreate.network).toBeUndefined();
  });

  it('propagates posterUrl to series but not media', async () => {
    prisma.media.upsert.mockResolvedValue({ id: 2, mediaType: 'TV', tvdbId: 200 });
    prisma.series.upsert.mockResolvedValue({ id: 20, mediaId: 2, tvdbId: 200 });

    const inputWithPoster = { ...baseSeriesInput, posterUrl: 'https://example.com/poster.jpg' };
    await repo.upsertSeries(inputWithPoster);

    const mediaCreate = prisma.media.upsert.mock.calls[0]![0].create;
    expect(mediaCreate.posterUrl).toBeUndefined();

    const seriesCreate = prisma.series.upsert.mock.calls[0]![0].create;
    expect(seriesCreate.posterUrl).toBe('https://example.com/poster.jpg');
  });
});
