import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackRepository } from './PlaybackRepository';

function createPrismaMock() {
  return {
    playbackProgress: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
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
});
