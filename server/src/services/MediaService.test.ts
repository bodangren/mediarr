import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaService } from './MediaService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';
import * as schema from '../db/schema';

function makeDb() {
  const deleteBuilder = {
    where: vi.fn(),
    run: vi.fn().mockReturnValue({ changes: 1 }),
  };
  deleteBuilder.where.mockReturnValue(deleteBuilder);
  const deleteFrom = vi.fn().mockReturnValue(deleteBuilder);
  return {
    media: { findMany: vi.fn(), delete: vi.fn() },
    movie: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    series: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    episode: { deleteMany: vi.fn() },
    season: { deleteMany: vi.fn() },
    drizzle: {
      transaction: vi.fn().mockImplementation((callback: (tx: { delete: typeof deleteFrom }) => unknown) => callback({
        delete: deleteFrom,
      })),
    },
    _deleteFrom: deleteFrom,
  };
}

function makeEventEmitter() {
  return { emit: vi.fn().mockResolvedValue(undefined) } as unknown as ActivityEventEmitter;
}

describe('MediaService.deleteMedia', () => {
  let prisma: ReturnType<typeof makeDb>;
  let emitter: ActivityEventEmitter;
  let service: MediaService;
  let filesystem: {
    rm: ReturnType<typeof vi.fn<(path: string, options: { recursive: true; force: true }) => Promise<void>>>;
  };

  beforeEach(() => {
    prisma = makeDb();
    emitter = makeEventEmitter();
    filesystem = {
      rm: vi.fn<(path: string, options: { recursive: true; force: true }) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    service = new MediaService(prisma as any, null, emitter, filesystem);
  });

  it('deletes movie and its media record, deletes files when deleteFiles=true', async () => {
    prisma.movie.findUnique.mockResolvedValue({ mediaId: 50, path: '/movies/Test' });
    prisma.movie.delete.mockResolvedValue({ id: 1 });
    prisma.media.delete.mockResolvedValue({ id: 50 });

    await service.deleteMedia(1, 'MOVIE', true);

    expect(filesystem.rm).toHaveBeenCalledWith('/movies/Test', { recursive: true, force: true });
    expect(prisma._deleteFrom.mock.calls.map(([table]) => table)).toEqual([
      schema.movies,
      schema.media,
    ]);
  });

  it('skips media record deletion when movie has no mediaId', async () => {
    prisma.movie.findUnique.mockResolvedValue({ mediaId: null, path: null });
    prisma.movie.delete.mockResolvedValue({ id: 1 });

    await service.deleteMedia(1, 'MOVIE', false);

    expect(prisma._deleteFrom).toHaveBeenCalledTimes(1);
    expect(prisma._deleteFrom).toHaveBeenCalledWith(schema.movies);
  });

  it('does not call fs.rm when deleteFiles=false', async () => {
    prisma.movie.findUnique.mockResolvedValue({ mediaId: null, path: '/movies/Test' });
    prisma.movie.delete.mockResolvedValue({ id: 1 });

    await service.deleteMedia(1, 'MOVIE', false);

    expect(filesystem.rm).not.toHaveBeenCalled();

    expect(prisma._deleteFrom).toHaveBeenCalledWith(schema.movies);
  });

  it('deletes TV and shared media in one transaction, relying on verified SQLite cascades', async () => {
    prisma.series.findUnique.mockResolvedValue({ mediaId: 60, path: null });
    prisma.episode.deleteMany.mockResolvedValue({ count: 10 });
    prisma.season.deleteMany.mockResolvedValue({ count: 3 });
    prisma.series.delete.mockResolvedValue({ id: 2 });
    prisma.media.delete.mockResolvedValue({ id: 60 });

    await service.deleteMedia(2, 'TV', false);

    expect(prisma.drizzle.transaction).toHaveBeenCalledTimes(1);
    expect(prisma._deleteFrom.mock.calls.map(([table]) => table)).toEqual([
      schema.series,
      schema.media,
    ]);
    expect(prisma.episode.deleteMany).not.toHaveBeenCalled();
    expect(prisma.season.deleteMany).not.toHaveBeenCalled();
  });

  it('skips media deletion for TV when series has no mediaId', async () => {
    prisma.series.findUnique.mockResolvedValue({ mediaId: null, path: null });
    (prisma as any).episode.deleteMany.mockResolvedValue({ count: 0 });
    (prisma as any).season.deleteMany.mockResolvedValue({ count: 0 });
    prisma.series.delete.mockResolvedValue({ id: 2 });

    await service.deleteMedia(2, 'TV', false);

    expect(prisma._deleteFrom).toHaveBeenCalledTimes(1);
    expect(prisma._deleteFrom).toHaveBeenCalledWith(schema.series);
  });

  it('propagates database transaction failures', async () => {
    prisma.movie.findUnique.mockResolvedValue({ mediaId: 50, path: null });
    prisma.drizzle.transaction.mockImplementation(() => {
      throw new Error('forced database failure');
    });

    await expect(service.deleteMedia(1, 'MOVIE', false)).rejects.toThrow('forced database failure');
  });

  it('treats an already deleted target as a successful retry', async () => {
    prisma.movie.findUnique.mockResolvedValue(null);

    await expect(service.deleteMedia(1, 'MOVIE', true)).resolves.toBeUndefined();
    expect(filesystem.rm).not.toHaveBeenCalled();
    expect(prisma.drizzle.transaction).not.toHaveBeenCalled();
  });
});

describe('MediaService.getMovieCandidatesForSearch', () => {
  let prisma: ReturnType<typeof makeDb>;
  let service: MediaService;

  beforeEach(() => {
    prisma = makeDb();
  });

  it('returns released movies with metadataProvider', async () => {
    const metadataProvider = {
      getMovieAvailability: vi.fn()
        .mockReturnValueOnce('released')
        .mockReturnValueOnce('announced'),
    };
    service = new MediaService(prisma as any, metadataProvider as any);

    prisma.movie.findMany.mockResolvedValue([
      { id: 1, status: 'released', inCinemas: null, digitalRelease: null, physicalRelease: null, releaseDate: null },
      { id: 2, status: 'announced', inCinemas: null, digitalRelease: null, physicalRelease: null, releaseDate: null },
    ]);

    const candidates = await service.getMovieCandidatesForSearch();

    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe(1);
    expect(metadataProvider.getMovieAvailability).toHaveBeenCalledTimes(2);
  });

  it('returns streaming movies with metadataProvider', async () => {
    const metadataProvider = { getMovieAvailability: vi.fn().mockReturnValue('streaming') };
    service = new MediaService(prisma as any, metadataProvider as any);

    prisma.movie.findMany.mockResolvedValue([
      { id: 1, status: 'released' },
    ]);

    const candidates = await service.getMovieCandidatesForSearch();

    expect(candidates).toHaveLength(1);
  });

  it('filters out announced movies with metadataProvider', async () => {
    const metadataProvider = { getMovieAvailability: vi.fn().mockReturnValue('announced') };
    service = new MediaService(prisma as any, metadataProvider as any);

    prisma.movie.findMany.mockResolvedValue([
      { id: 1, status: 'announced' },
    ]);

    const candidates = await service.getMovieCandidatesForSearch();

    expect(candidates).toHaveLength(0);
  });

  it('falls back to status-based check without metadataProvider', async () => {
    service = new MediaService(prisma as any, null);

    prisma.movie.findMany.mockResolvedValue([
      { id: 1, status: 'released' },
      { id: 2, status: 'Released' },
      { id: 3, status: 'announced' },
      { id: 4, status: 'inCinemas' },
    ]);

    const candidates = await service.getMovieCandidatesForSearch();

    expect(candidates).toHaveLength(2);
    expect(candidates.map((m: any) => m.id)).toEqual([1, 2]);
  });

  it('returns empty array when no movies match', async () => {
    service = new MediaService(prisma as any, null);

    prisma.movie.findMany.mockResolvedValue([]);

    const candidates = await service.getMovieCandidatesForSearch();

    expect(candidates).toHaveLength(0);
  });
});

describe('MediaService.getAllMedia', () => {
  let prisma: ReturnType<typeof makeDb>;
  let service: MediaService;

  beforeEach(() => {
    prisma = makeDb();
    service = new MediaService(prisma as any);
  });

  it('uses media.findMany when available (unified media table)', async () => {
    prisma.media.findMany.mockResolvedValue([{ id: 1, title: 'Item' }]);

    const result = await service.getAllMedia();

    expect(prisma.media.findMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 1, title: 'Item' }]);
    expect(prisma.series.findMany).not.toHaveBeenCalled();
    expect(prisma.movie.findMany).not.toHaveBeenCalled();
  });

  it('falls back to separate series + movie queries when media.findMany is absent', async () => {
    const prismaNoMedia = {
      movie: { findMany: vi.fn().mockResolvedValue([{ id: 1, title: 'Movie' }]) },
      series: { findMany: vi.fn().mockResolvedValue([{ id: 2, title: 'Series' }]) },
      media: {},
    };

    const fallbackService = new MediaService(prismaNoMedia as any);

    const result = await fallbackService.getAllMedia();

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Series');
    expect(result[1].title).toBe('Movie');
  });
});

describe('MediaService.addMovie', () => {
  let prisma: ReturnType<typeof makeDb>;
  let emitter: ActivityEventEmitter;
  let service: MediaService;

  beforeEach(() => {
    prisma = makeDb();
    emitter = makeEventEmitter();
    service = new MediaService(prisma as any, null, emitter);
  });

  it('creates movie and emits success event', async () => {
    prisma.movie.create.mockResolvedValue({ id: 1, title: 'New Movie' });

    const result = await service.addMovie({ title: 'New Movie' });

    expect(result).toEqual({ id: 1, title: 'New Movie' });
    expect(emitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MEDIA_ADDED', success: true }),
    );
  });

  it('emits failure event when create throws', async () => {
    prisma.movie.create.mockRejectedValue(new Error('DB error'));

    await expect(service.addMovie({ title: 'Fail Movie' })).rejects.toThrow('DB error');

    expect(emitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MEDIA_ADDED', success: false }),
    );
  });

  it('works without event emitter (no crash)', async () => {
    const noEmitterService = new MediaService(prisma as any);
    prisma.movie.create.mockResolvedValue({ id: 1, title: 'No Emitter' });

    const result = await noEmitterService.addMovie({ title: 'No Emitter' });

    expect(result).toEqual({ id: 1, title: 'No Emitter' });
  });
});

describe('MediaService.setMonitored', () => {
  let prisma: ReturnType<typeof makeDb>;
  let service: MediaService;

  beforeEach(() => {
    prisma = makeDb();
    service = new MediaService(prisma as any);
  });

  it('updates movie when mediaType is MOVIE', async () => {
    prisma.movie.update.mockResolvedValue({ id: 1, monitored: true });

    await service.setMonitored(1, true, 'MOVIE');

    expect(prisma.movie.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { monitored: true } });
    expect(prisma.series.update).not.toHaveBeenCalled();
  });

  it('updates series when mediaType is TV (default)', async () => {
    prisma.series.update.mockResolvedValue({ id: 2, monitored: false });

    await service.setMonitored(2, false);

    expect(prisma.series.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { monitored: false } });
    expect(prisma.movie.update).not.toHaveBeenCalled();
  });
});
