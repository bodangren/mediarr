import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { VariantBackfillService } from './VariantBackfillService';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';

type RepositoryMock = Pick<SubtitleVariantRepository, 'upsertVariant'>;

const makePrismaMock = (): {
  movie: { findMany: ReturnType<typeof vi.fn> };
  episode: { findMany: ReturnType<typeof vi.fn> };
  mediaFileVariant: { findFirst: ReturnType<typeof vi.fn> };
} => ({
  movie: { findMany: vi.fn().mockResolvedValue([]) },
  episode: { findMany: vi.fn().mockResolvedValue([]) },
  mediaFileVariant: { findFirst: vi.fn() },
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
    prismaMock as unknown as PrismaClient,
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
    prismaMock.mediaFileVariant.findFirst.mockResolvedValue(null);

    const result = await service.run();

    expect(result).toEqual({ movieVariantsCreated: 2, episodeVariantsCreated: 0 });
    expect(prismaMock.movie.findMany).toHaveBeenCalledWith({
      where: { path: { not: null } },
      select: { id: true, path: true },
    });
    expect(prismaMock.mediaFileVariant.findFirst).toHaveBeenCalledTimes(2);
    expect(prismaMock.mediaFileVariant.findFirst).toHaveBeenNthCalledWith(1, {
      where: { mediaType: 'MOVIE', movieId: 1, path: '/data/movies/m1.mkv' },
    });
    expect(prismaMock.mediaFileVariant.findFirst).toHaveBeenNthCalledWith(2, {
      where: { mediaType: 'MOVIE', movieId: 2, path: '/data/movies/m2.mkv' },
    });
    expect(repositoryMock.upsertVariant).toHaveBeenCalledTimes(2);
    expect(repositoryMock.upsertVariant).toHaveBeenNthCalledWith(1, {
      mediaType: 'MOVIE',
      movieId: 1,
      path: '/data/movies/m1.mkv',
      fileSize: BigInt(0),
    });
    expect(repositoryMock.upsertVariant).toHaveBeenNthCalledWith(2, {
      mediaType: 'MOVIE',
      movieId: 2,
      path: '/data/movies/m2.mkv',
      fileSize: BigInt(0),
    });
  });

  it('skips movies that already have a variant row', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, path: '/data/movies/m1.mkv' },
    ]);
    prismaMock.mediaFileVariant.findFirst.mockResolvedValue({
      id: 999,
      mediaType: 'MOVIE',
      movieId: 1,
      episodeId: null,
      path: '/data/movies/m1.mkv',
    });

    const result = await service.run();

    expect(result).toEqual({ movieVariantsCreated: 0, episodeVariantsCreated: 0 });
    expect(prismaMock.mediaFileVariant.findFirst).toHaveBeenCalledTimes(1);
    expect(repositoryMock.upsertVariant).not.toHaveBeenCalled();
  });

  it('creates variants for episodes that do not yet have one', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.episode.findMany.mockResolvedValue([
      { id: 10, path: '/data/tv/s01/e10.mkv' },
    ]);
    prismaMock.mediaFileVariant.findFirst.mockResolvedValue(null);

    const result = await service.run();

    expect(result).toEqual({ movieVariantsCreated: 0, episodeVariantsCreated: 1 });
    expect(prismaMock.episode.findMany).toHaveBeenCalledWith({
      where: { path: { not: null } },
      select: { id: true, path: true },
    });
    expect(prismaMock.mediaFileVariant.findFirst).toHaveBeenCalledWith({
      where: { mediaType: 'EPISODE', episodeId: 10, path: '/data/tv/s01/e10.mkv' },
    });
    expect(repositoryMock.upsertVariant).toHaveBeenCalledTimes(1);
    expect(repositoryMock.upsertVariant).toHaveBeenCalledWith({
      mediaType: 'EPISODE',
      episodeId: 10,
      path: '/data/tv/s01/e10.mkv',
      fileSize: BigInt(0),
    });
  });

  it('returns 0/0 when there are no movies or episodes with a path', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.movie.findMany.mockResolvedValue([]);
    prismaMock.episode.findMany.mockResolvedValue([]);

    const result = await service.run();

    expect(result).toEqual({ movieVariantsCreated: 0, episodeVariantsCreated: 0 });
    expect(prismaMock.mediaFileVariant.findFirst).not.toHaveBeenCalled();
    expect(repositoryMock.upsertVariant).not.toHaveBeenCalled();
  });

  it('propagates repository errors from upsertVariant', async () => {
    const { service, prismaMock, repositoryMock } = buildService();

    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, path: '/data/movies/m1.mkv' },
    ]);
    prismaMock.mediaFileVariant.findFirst.mockResolvedValue(null);
    repositoryMock.upsertVariant.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(service.run()).rejects.toThrow('DB connection lost');
    expect(repositoryMock.upsertVariant).toHaveBeenCalledTimes(1);
  });
});
