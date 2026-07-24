import { describe, expect, it, vi } from 'vitest';
import { isImportIncomplete } from './importGuard';

describe('isImportIncomplete', () => {
  it('returns { incomplete: false } when prisma is undefined (backward compat)', async () => {
    const result = await isImportIncomplete(undefined, { episodeId: 99, movieId: null });
    expect(result).toEqual({ incomplete: false });
  });

  it('returns { incomplete: false } when torrent has no episodeId and no movieId', async () => {
    const prisma = {
      episode: { findUnique: vi.fn() },
      movie: { findUnique: vi.fn() },
    };
    const result = await isImportIncomplete(prisma, { episodeId: null, movieId: null });
    expect(result).toEqual({ incomplete: false });
    expect(prisma.episode.findUnique).not.toHaveBeenCalled();
    expect(prisma.movie.findUnique).not.toHaveBeenCalled();
  });

  it('returns { incomplete: true } when episode exists but path is null', async () => {
    const prisma = {
      episode: { findUnique: vi.fn().mockResolvedValue({ id: 10, path: null }) },
      movie: { findUnique: vi.fn() },
    };
    const result = await isImportIncomplete(prisma, { episodeId: 10, movieId: null });
    expect(result).toEqual({ incomplete: true, reason: 'episode id=10 has no path (import pending)' });
  });

  it('returns { incomplete: true } when episode no longer exists in DB', async () => {
    const prisma = {
      episode: { findUnique: vi.fn().mockResolvedValue(null) },
      movie: { findUnique: vi.fn() },
    };
    const result = await isImportIncomplete(prisma, { episodeId: 99, movieId: null });
    expect(result).toEqual({ incomplete: true, reason: 'episode id=99 not found' });
  });

  it('returns { incomplete: false } when episode has a path set', async () => {
    const prisma = {
      episode: { findUnique: vi.fn().mockResolvedValue({ id: 10, path: '/tv/Show/S01E01.mkv' }) },
      movie: { findUnique: vi.fn() },
    };
    const result = await isImportIncomplete(prisma, { episodeId: 10, movieId: null });
    expect(result).toEqual({ incomplete: false });
  });

  it('keeps a pack protected until every linked episode is imported', async () => {
    const prisma = {
      episode: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 10, path: '/tv/Show/S01E01.mkv' })
          .mockResolvedValueOnce({ id: 11, path: null }),
      },
      movie: { findUnique: vi.fn() },
    };

    const result = await isImportIncomplete(prisma, {
      episodeId: 10,
      episodeIds: [10, 11],
      movieId: null,
    });

    expect(result).toEqual({ incomplete: true, reason: 'episode id=11 has no path (import pending)' });
    expect(prisma.episode.findUnique).toHaveBeenCalledTimes(2);
  });

  it('returns { incomplete: true } when movie exists but path is null', async () => {
    const prisma = {
      episode: { findUnique: vi.fn() },
      movie: { findUnique: vi.fn().mockResolvedValue({ id: 20, path: null }) },
    };
    const result = await isImportIncomplete(prisma, { episodeId: null, movieId: 20 });
    expect(result).toEqual({ incomplete: true, reason: 'movie id=20 has no path (import pending)' });
  });

  it('returns { incomplete: true } when movie no longer exists in DB', async () => {
    const prisma = {
      episode: { findUnique: vi.fn() },
      movie: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const result = await isImportIncomplete(prisma, { episodeId: null, movieId: 99 });
    expect(result).toEqual({ incomplete: true, reason: 'movie id=99 not found' });
  });

  it('returns { incomplete: false } when movie has a path set', async () => {
    const prisma = {
      episode: { findUnique: vi.fn() },
      movie: { findUnique: vi.fn().mockResolvedValue({ id: 20, path: '/movies/Film (2020)/Film.mkv' }) },
    };
    const result = await isImportIncomplete(prisma, { episodeId: null, movieId: 20 });
    expect(result).toEqual({ incomplete: false });
  });

  it('guards both episodeId AND movieId — both must be imported', async () => {
    const prisma = {
      episode: { findUnique: vi.fn().mockResolvedValue({ id: 10, path: '/tv/Show/S01E01.mkv' }) },
      movie: { findUnique: vi.fn().mockResolvedValue({ id: 20, path: null }) },
    };
    const result = await isImportIncomplete(prisma, { episodeId: 10, movieId: 20 });
    expect(result).toEqual({ incomplete: true, reason: 'movie id=20 has no path (import pending)' });
  });

  it('returns { incomplete: false } when both episode and movie are imported', async () => {
    const prisma = {
      episode: { findUnique: vi.fn().mockResolvedValue({ id: 10, path: '/tv/Show/S01E01.mkv' }) },
      movie: { findUnique: vi.fn().mockResolvedValue({ id: 20, path: '/movies/Film/Film.mkv' }) },
    };
    const result = await isImportIncomplete(prisma, { episodeId: 10, movieId: 20 });
    expect(result).toEqual({ incomplete: false });
  });

  it('propagates DB errors from episode.findUnique', async () => {
    const prisma = {
      episode: { findUnique: vi.fn().mockRejectedValue(new Error('DB connection lost')) },
      movie: { findUnique: vi.fn() },
    };
    await expect(
      isImportIncomplete(prisma, { episodeId: 10, movieId: null }),
    ).rejects.toThrow('DB connection lost');
  });

  it('propagates DB errors from movie.findUnique', async () => {
    const prisma = {
      episode: { findUnique: vi.fn() },
      movie: { findUnique: vi.fn().mockRejectedValue(new Error('DB timeout')) },
    };
    await expect(
      isImportIncomplete(prisma, { episodeId: null, movieId: 20 }),
    ).rejects.toThrow('DB timeout');
  });
});
