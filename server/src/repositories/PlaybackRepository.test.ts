import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackRepository } from './PlaybackRepository';

function createPrismaMock() {
  return {
    playbackProgress: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    movie: {
      findMany: vi.fn(),
    },
    episode: {
      findMany: vi.fn(),
    },
  };
}

describe('PlaybackRepository', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let repository: PlaybackRepository;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    repository = new PlaybackRepository(prismaMock as any);
  });

  it('reads user-specific progress snapshot', async () => {
    prismaMock.playbackProgress.findUnique.mockResolvedValue({ id: 10 });

    const result = await repository.getProgress({
      mediaType: 'MOVIE',
      mediaId: 33,
      userId: 'living-room',
    });

    expect(result).toEqual({ id: 10 });
    expect(prismaMock.playbackProgress.findUnique).toHaveBeenCalledWith({
      where: {
        mediaType_mediaId_userId: {
          mediaType: 'MOVIE',
          mediaId: 33,
          userId: 'living-room',
        },
      },
    });
  });

  it('returns latest progress for a media item', async () => {
    prismaMock.playbackProgress.findFirst.mockResolvedValue({ id: 7 });

    const result = await repository.getLatestProgressForMedia('EPISODE', 88);

    expect(result).toEqual({ id: 7 });
    expect(prismaMock.playbackProgress.findFirst).toHaveBeenCalledWith({
      where: {
        mediaType: 'EPISODE',
        mediaId: 88,
      },
      orderBy: [
        { lastWatched: 'desc' },
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
    });
  });

  it('upserts progress and marks watched when threshold reached', async () => {
    prismaMock.playbackProgress.findUnique.mockResolvedValue(null);
    prismaMock.playbackProgress.upsert.mockResolvedValue({
      id: 1,
      isWatched: true,
    });

    const playedAt = new Date('2026-03-05T00:00:00.000Z');

    await repository.upsertProgress({
      mediaType: 'MOVIE',
      mediaId: 101,
      userId: 'lan-default',
      position: 5400,
      duration: 6000,
      watchedThreshold: 0.9,
      playedAt,
    });

    expect(prismaMock.playbackProgress.upsert).toHaveBeenCalledWith({
      where: {
        mediaType_mediaId_userId: {
          mediaType: 'MOVIE',
          mediaId: 101,
          userId: 'lan-default',
        },
      },
      update: {
        position: 5400,
        duration: 6000,
        progress: 0.9,
        isWatched: true,
        lastWatched: playedAt,
      },
      create: {
        mediaType: 'MOVIE',
        mediaId: 101,
        userId: 'lan-default',
        position: 5400,
        duration: 6000,
        progress: 0.9,
        isWatched: true,
        lastWatched: playedAt,
      },
    });
  });

  it('keeps watched flag sticky once already watched', async () => {
    prismaMock.playbackProgress.findUnique.mockResolvedValue({
      id: 99,
      isWatched: true,
    });
    prismaMock.playbackProgress.upsert.mockResolvedValue({
      id: 99,
      isWatched: true,
    });

    await repository.upsertProgress({
      mediaType: 'EPISODE',
      mediaId: 404,
      userId: 'bedroom-tv',
      position: 30,
      duration: 1800,
      watchedThreshold: 0.9,
    });

    const call = prismaMock.playbackProgress.upsert.mock.calls[0]?.[0];
    expect(call?.update.isWatched).toBe(true);
    expect(call?.update.progress).toBeCloseTo(30 / 1800, 8);
  });

  it('normalizes invalid numeric inputs to safe defaults', async () => {
    prismaMock.playbackProgress.findUnique.mockResolvedValue(null);
    prismaMock.playbackProgress.upsert.mockResolvedValue({ id: 11 });

    await repository.upsertProgress({
      mediaType: 'MOVIE',
      mediaId: 7,
      userId: 'phone',
      position: Number.NaN,
      duration: -100,
      watchedThreshold: 5,
    });

    const call = prismaMock.playbackProgress.upsert.mock.calls[0]?.[0];
    expect(call?.update.position).toBe(0);
    expect(call?.update.duration).toBe(0);
    expect(call?.update.progress).toBe(0);
    expect(call?.update.isWatched).toBe(false);
  });

  it('returns empty continue-watching list when no playback rows match', async () => {
    prismaMock.playbackProgress.findMany.mockResolvedValue([]);

    const result = await repository.findContinueWatching();

    expect(result).toEqual([]);
    expect(prismaMock.playbackProgress.findMany).toHaveBeenCalledWith({
      where: {
        isWatched: false,
        position: {
          gt: 0,
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { lastWatched: 'desc' },
        { id: 'desc' },
      ],
      take: 60,
    });
    expect(prismaMock.movie.findMany).not.toHaveBeenCalled();
    expect(prismaMock.episode.findMany).not.toHaveBeenCalled();
  });

  it('returns movie continue-watching entries with playback metadata', async () => {
    const lastWatched = new Date('2026-04-09T00:00:00.000Z');
    prismaMock.playbackProgress.findMany.mockResolvedValue([
      {
        mediaType: 'MOVIE',
        mediaId: 10,
        position: 300,
        duration: 1200,
        progress: 0.25,
        isWatched: false,
        lastWatched,
      },
    ]);
    prismaMock.movie.findMany.mockResolvedValue([
      {
        id: 10,
        title: 'Movie A',
        posterUrl: 'https://image.tmdb.org/t/p/w500/poster-a.jpg',
        fanartUrl: 'https://image.tmdb.org/t/p/w1280/backdrop-a.jpg',
      },
    ]);
    prismaMock.episode.findMany.mockResolvedValue([]);

    const result = await repository.findContinueWatching(20);

    expect(result).toEqual([
      {
        mediaType: 'MOVIE',
        mediaId: 10,
        seriesId: null,
        title: 'Movie A',
        episodeTitle: null,
        seasonNumber: null,
        episodeNumber: null,
        posterUrl: 'https://image.tmdb.org/t/p/w500/poster-a.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/w1280/backdrop-a.jpg',
        position: 300,
        duration: 1200,
        progress: 0.25,
        isWatched: false,
        lastWatched,
      },
    ]);
  });

  it('returns mixed movie and episode continue-watching entries in recency order', async () => {
    const episodeLastWatched = new Date('2026-04-09T02:00:00.000Z');
    const movieLastWatched = new Date('2026-04-09T01:00:00.000Z');
    prismaMock.playbackProgress.findMany.mockResolvedValue([
      {
        mediaType: 'EPISODE',
        mediaId: 41,
        position: 600,
        duration: 1800,
        progress: 0.3333,
        isWatched: false,
        lastWatched: episodeLastWatched,
      },
      {
        mediaType: 'MOVIE',
        mediaId: 11,
        position: 420,
        duration: 2400,
        progress: 0.175,
        isWatched: false,
        lastWatched: movieLastWatched,
      },
    ]);
    prismaMock.movie.findMany.mockResolvedValue([
      {
        id: 11,
        title: 'Movie B',
        posterUrl: null,
        fanartUrl: null,
      },
    ]);
    prismaMock.episode.findMany.mockResolvedValue([
      {
        id: 41,
        seriesId: 5,
        title: 'Pilot',
        seasonNumber: 1,
        episodeNumber: 1,
        series: {
          title: 'Series A',
          posterUrl: 'https://image.tmdb.org/t/p/w500/series-a.jpg',
          fanartUrl: 'https://image.tmdb.org/t/p/w1280/series-a-bg.jpg',
        },
      },
    ]);

    const result = await repository.findContinueWatching(20);

    expect(result).toEqual([
      {
        mediaType: 'EPISODE',
        mediaId: 41,
        seriesId: 5,
        title: 'Series A',
        episodeTitle: 'Pilot',
        seasonNumber: 1,
        episodeNumber: 1,
        posterUrl: 'https://image.tmdb.org/t/p/w500/series-a.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/w1280/series-a-bg.jpg',
        position: 600,
        duration: 1800,
        progress: 0.3333,
        isWatched: false,
        lastWatched: episodeLastWatched,
      },
      {
        mediaType: 'MOVIE',
        mediaId: 11,
        seriesId: null,
        title: 'Movie B',
        episodeTitle: null,
        seasonNumber: null,
        episodeNumber: null,
        posterUrl: null,
        backdropUrl: null,
        position: 420,
        duration: 2400,
        progress: 0.175,
        isWatched: false,
        lastWatched: movieLastWatched,
      },
    ]);
  });
});
