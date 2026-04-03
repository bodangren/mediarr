import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaService } from './MediaService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';

function makePrisma() {
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
  };
}

function makeEventEmitter() {
  return { emit: vi.fn().mockResolvedValue(undefined) } as unknown as ActivityEventEmitter;
}

describe('MediaService.deleteMedia', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let emitter: ActivityEventEmitter;
  let service: MediaService;

  beforeEach(() => {
    prisma = makePrisma();
    emitter = makeEventEmitter();
    service = new MediaService(prisma as any, null, emitter);
  });

  it('deletes movie and its media record, deletes files when deleteFiles=true', async () => {
    prisma.movie.findUnique.mockResolvedValue({ mediaId: 50, path: '/movies/Test' });
    prisma.movie.delete.mockResolvedValue({ id: 1 });
    (prisma as any).media.delete.mockResolvedValue({ id: 50 });

    await service.deleteMedia(1, 'MOVIE', true);

    expect(prisma.movie.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect((prisma as any).media.delete).toHaveBeenCalledWith({ where: { id: 50 } });
  });

  it('skips media record deletion when movie has no mediaId', async () => {
    prisma.movie.findUnique.mockResolvedValue({ mediaId: null, path: null });
    prisma.movie.delete.mockResolvedValue({ id: 1 });

    await service.deleteMedia(1, 'MOVIE', false);

    expect(prisma.movie.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect((prisma as any).media.delete).not.toHaveBeenCalled();
  });

  it('does not call fs.rm when deleteFiles=false', async () => {
    prisma.movie.findUnique.mockResolvedValue({ mediaId: null, path: '/movies/Test' });
    prisma.movie.delete.mockResolvedValue({ id: 1 });

    await service.deleteMedia(1, 'MOVIE', false);

    expect(prisma.movie.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('cascades TV deletion: episodes → seasons → series → media', async () => {
    prisma.series.findUnique.mockResolvedValue({ mediaId: 60, path: null });
    (prisma as any).episode.deleteMany.mockResolvedValue({ count: 10 });
    (prisma as any).season.deleteMany.mockResolvedValue({ count: 3 });
    prisma.series.delete.mockResolvedValue({ id: 2 });
    (prisma as any).media.delete.mockResolvedValue({ id: 60 });

    await service.deleteMedia(2, 'TV', false);

    expect((prisma as any).episode.deleteMany).toHaveBeenCalledWith({ where: { seriesId: 2 } });
    expect((prisma as any).season.deleteMany).toHaveBeenCalledWith({ where: { seriesId: 2 } });
    expect(prisma.series.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    expect((prisma as any).media.delete).toHaveBeenCalledWith({ where: { id: 60 } });
  });

  it('skips media deletion for TV when series has no mediaId', async () => {
    prisma.series.findUnique.mockResolvedValue({ mediaId: null, path: null });
    (prisma as any).episode.deleteMany.mockResolvedValue({ count: 0 });
    (prisma as any).season.deleteMany.mockResolvedValue({ count: 0 });
    prisma.series.delete.mockResolvedValue({ id: 2 });

    await service.deleteMedia(2, 'TV', false);

    expect((prisma as any).media.delete).not.toHaveBeenCalled();
  });

  it('handles media.delete failure gracefully (catches error)', async () => {
    prisma.movie.findUnique.mockResolvedValue({ mediaId: 50, path: null });
    prisma.movie.delete.mockResolvedValue({ id: 1 });
    (prisma as any).media.delete.mockRejectedValue(new Error('Record not found'));

    await expect(service.deleteMedia(1, 'MOVIE', false)).resolves.not.toThrow();
  });
});

describe('MediaService.getMovieCandidatesForSearch', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: MediaService;

  beforeEach(() => {
    prisma = makePrisma();
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
  let prisma: ReturnType<typeof makePrisma>;
  let service: MediaService;

  beforeEach(() => {
    prisma = makePrisma();
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
  let prisma: ReturnType<typeof makePrisma>;
  let emitter: ActivityEventEmitter;
  let service: MediaService;

  beforeEach(() => {
    prisma = makePrisma();
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
  let prisma: ReturnType<typeof makePrisma>;
  let service: MediaService;

  beforeEach(() => {
    prisma = makePrisma();
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
