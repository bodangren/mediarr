import type { DatabaseClient } from '../db/drizzleClient';
import { describe, expect, it, vi } from 'vitest';
import { VariantBackfillService } from './VariantBackfillService';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';

type RepositoryMock = Pick<SubtitleVariantRepository, 'upsertVariant'>;

const makePrismaMock = (): {
  movie: { findMany: ReturnType<typeof vi.fn> };
  episode: { findMany: ReturnType<typeof vi.fn> };
  mediaFileVariant: { findMany: ReturnType<typeof vi.fn> };
} => ({
  movie: { findMany: vi.fn().mockResolvedValue([]) },
  episode: { findMany: vi.fn().mockResolvedValue([]) },
  mediaFileVariant: { findMany: vi.fn().mockResolvedValue([]) },
});

const makeRepositoryMock = (): RepositoryMock & {
  upsertVariant: ReturnType<typeof vi.fn>;
} => ({
  upsertVariant: vi.fn().mockResolvedValue({ id: 1 }),
});

const buildService = () => {
  const prismaMock = makePrismaMock();
  const repositoryMock = makeRepositoryMock();
  const service = new VariantBackfillService(
    prismaMock as unknown as DatabaseClient,
    repositoryMock as unknown as SubtitleVariantRepository,
  );
  return { service, prismaMock, repositoryMock };
};

describe('VariantBackfillService', () => {
  it('creates variants for movies that do not yet have one', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, path: '/data/movies/m1.mkv' },
      { id: 2, path: '/data/movies/m2.mkv' },
    ]);
    prismaMock.mediaFileVariant.findMany.mockResolvedValue([]);

    const result = await service.run();

    expect(result).toEqual({ movieVariantsCreated: 2, episodeVariantsCreated: 0 });
    expect(prismaMock.movie.findMany).toHaveBeenCalledWith({
      where: { path: { not: null } },
      select: { id: true, path: true },
    });
    // One query per media type, not one per row: ~3,500 individual queries on
    // startup took ~30 s on a cold USB drive.
    // Only the MOVIE type has rows here, so exactly one query runs.
    expect(prismaMock.mediaFileVariant.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.mediaFileVariant.findMany).toHaveBeenNthCalledWith(1, {
      where: { mediaType: 'MOVIE' },
      select: { movieId: true, episodeId: true, path: true },
    });
    expect(repositoryMock.upsertVariant).toHaveBeenCalledTimes(2);
    expect(repositoryMock.upsertVariant).toHaveBeenNthCalledWith(1, {
      mediaType: 'MOVIE',
      movieId: 1,
      path: '/data/movies/m1.mkv',
      fileSize: 0,
    });
    expect(repositoryMock.upsertVariant).toHaveBeenNthCalledWith(2, {
      mediaType: 'MOVIE',
      movieId: 2,
      path: '/data/movies/m2.mkv',
      fileSize: 0,
    });
  });

  it('does not backfill a folder path as a playable variant', async () => {
    // Live-data defect 2026-11-07: Movie.path is the movie FOLDER
    // (`/data/Movies/12 Angry Men (1957)`), not the video file. Backfilling it
    // as a variant made every movie stream a directory and return 500.
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, path: '/data/Movies/12 Angry Men (1957)' },
      { id: 2, path: '/data/Movies/1917 (2019)/1917 (2019).mkv' },
    ]);
    prismaMock.mediaFileVariant.findMany.mockResolvedValue([]);

    const result = await service.run();

    expect(result.movieVariantsCreated).toBe(1);
    expect(repositoryMock.upsertVariant).toHaveBeenCalledTimes(1);
    expect(repositoryMock.upsertVariant).toHaveBeenCalledWith({
      mediaType: 'MOVIE',
      movieId: 2,
      path: '/data/Movies/1917 (2019)/1917 (2019).mkv',
      fileSize: 0,
    });
  });

  it('does not backfill an episode path that is not a video file', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.episode.findMany.mockResolvedValue([
      { id: 10, path: '/data/TV/Show/Season 1' },
    ]);
    prismaMock.mediaFileVariant.findMany.mockResolvedValue([]);

    const result = await service.run();

    expect(result.episodeVariantsCreated).toBe(0);
    expect(repositoryMock.upsertVariant).not.toHaveBeenCalled();
  });

  it('skips movies that already have a variant row', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, path: '/data/movies/m1.mkv' },
    ]);
    prismaMock.mediaFileVariant.findMany.mockResolvedValue([
      { movieId: 1, episodeId: null, path: '/data/movies/m1.mkv' },
    ]);

    const result = await service.run();

    expect(result).toEqual({ movieVariantsCreated: 0, episodeVariantsCreated: 0 });
    expect(prismaMock.mediaFileVariant.findMany).toHaveBeenCalledTimes(1);
    expect(repositoryMock.upsertVariant).not.toHaveBeenCalled();
  });

  it('creates variants for episodes that do not yet have one', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.episode.findMany.mockResolvedValue([
      { id: 10, path: '/data/tv/s01/e10.mkv' },
    ]);
    prismaMock.mediaFileVariant.findMany.mockResolvedValue([]);

    const result = await service.run();

    expect(result).toEqual({ movieVariantsCreated: 0, episodeVariantsCreated: 1 });
    expect(prismaMock.episode.findMany).toHaveBeenCalledWith({
      where: { path: { not: null } },
      select: { id: true, path: true },
    });
    expect(prismaMock.mediaFileVariant.findMany).toHaveBeenCalledWith({
      where: { mediaType: 'EPISODE' },
      select: { movieId: true, episodeId: true, path: true },
    });
    expect(repositoryMock.upsertVariant).toHaveBeenCalledTimes(1);
    expect(repositoryMock.upsertVariant).toHaveBeenCalledWith({
      mediaType: 'EPISODE',
      episodeId: 10,
      path: '/data/tv/s01/e10.mkv',
      fileSize: 0,
    });
  });

  it('returns 0/0 when there are no movies or episodes with a path', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.movie.findMany.mockResolvedValue([]);
    prismaMock.episode.findMany.mockResolvedValue([]);

    const result = await service.run();

    expect(result).toEqual({ movieVariantsCreated: 0, episodeVariantsCreated: 0 });
    expect(prismaMock.mediaFileVariant.findMany).not.toHaveBeenCalled();
    expect(repositoryMock.upsertVariant).not.toHaveBeenCalled();
  });

  it('propagates repository errors from upsertVariant', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, path: '/data/movies/m1.mkv' },
    ]);
    prismaMock.mediaFileVariant.findMany.mockResolvedValue([]);
    repositoryMock.upsertVariant.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(service.run()).rejects.toThrow('DB connection lost');
    expect(repositoryMock.upsertVariant).toHaveBeenCalledTimes(1);
  });

  it('is idempotent across repeated startup runs', async () => {
    const { service, prismaMock, repositoryMock } = buildService();
    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, path: '/data/movies/m1.mkv' },
    ]);
    prismaMock.mediaFileVariant.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ movieId: 1, episodeId: null, path: '/data/movies/m1.mkv' }]);

    await expect(service.run()).resolves.toEqual({
      movieVariantsCreated: 1,
      episodeVariantsCreated: 0,
    });
    await expect(service.run()).resolves.toEqual({
      movieVariantsCreated: 0,
      episodeVariantsCreated: 0,
    });
    expect(repositoryMock.upsertVariant).toHaveBeenCalledTimes(1);
  });
});
