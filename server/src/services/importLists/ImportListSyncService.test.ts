import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseClient } from '../../db/drizzleClient';
import type { ImportListRepository, ImportListWithProfile } from '../../repositories/ImportListRepository';
import type { MediaRepository } from '../../repositories/MediaRepository';
import type { ImportListProvider, ImportListProviderFactory, ImportListItem } from './ImportListProvider';
import { ImportListSyncService } from './ImportListSyncService';

describe('ImportListSyncService', () => {
  const movieFindUnique = vi.fn();
  const seriesFindUnique = vi.fn();
  const findById = vi.fn();
  const findAllEnabled = vi.fn();
  const isExcluded = vi.fn();
  const updateLastSync = vi.fn();
  const upsertMovie = vi.fn();
  const upsertSeries = vi.fn();
  const fetch = vi.fn();
  const validateConfig = vi.fn();
  const getProvider = vi.fn();

  const provider: ImportListProvider = {
    type: 'tmdb-list',
    name: 'TMDB List',
    fetch,
    validateConfig,
  };
  const importList = {
    id: 9,
    name: 'TMDB Watchlist',
    providerType: 'tmdb-list',
    config: { listId: 7 },
    rootFolderPath: '/data/media',
    qualityProfileId: 3,
    languageProfileId: null,
    monitorType: 'series',
    enabled: true,
    syncInterval: 24,
    lastSyncAt: null,
    createdAt: new Date('2026-07-24T00:00:00.000Z'),
    updatedAt: new Date('2026-07-24T00:00:00.000Z'),
    qualityProfile: { id: 3, name: 'HD' },
  } satisfies ImportListWithProfile;

  const service = new ImportListSyncService(
    {
      movie: { findUnique: movieFindUnique },
      series: { findUnique: seriesFindUnique },
    } as unknown as DatabaseClient,
    {
      findById,
      findAllEnabled,
      isExcluded,
      updateLastSync,
    } as unknown as ImportListRepository,
    { upsertMovie, upsertSeries } as unknown as MediaRepository,
    { getProvider } as unknown as ImportListProviderFactory,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue(importList);
    getProvider.mockReturnValue(provider);
    validateConfig.mockReturnValue(true);
    fetch.mockResolvedValue([]);
    isExcluded.mockResolvedValue(false);
    movieFindUnique.mockResolvedValue(null);
    seriesFindUnique.mockResolvedValue(null);
    upsertMovie.mockResolvedValue({ id: 101 });
    upsertSeries.mockResolvedValue({ id: 202 });
    updateLastSync.mockResolvedValue(importList);
  });

  it('persists normalized movies and series under safe, unique title-specific paths', async () => {
    fetch.mockResolvedValue([
      { tmdbId: 603, title: '../The / Matrix', year: 1999, mediaType: 'movie' },
      {
        tmdbId: 1396,
        tvdbId: 81189,
        imdbId: 'tt0903747',
        title: '../The / Matrix',
        year: 2008,
        mediaType: 'series',
      },
    ] satisfies ImportListItem[]);

    const result = await service.syncList(importList.id);

    expect(result).toEqual({ added: 2, skipped: 0, exclusions: 0, errors: [] });
    expect(upsertMovie).toHaveBeenCalledWith(expect.objectContaining({
      tmdbId: 603,
      path: '/data/media/The Matrix (1999) [tmdb-603]',
    }));
    expect(upsertSeries).toHaveBeenCalledWith(expect.objectContaining({
      tmdbId: 1396,
      tvdbId: 81189,
      imdbId: 'tt0903747',
      path: '/data/media/The Matrix (2008) [tvdb-81189]',
    }));
    expect(upsertMovie.mock.calls[0]?.[0].path).not.toBe(importList.rootFolderPath);
    expect(upsertSeries.mock.calls[0]?.[0].path).not.toBe(importList.rootFolderPath);
    expect(updateLastSync).toHaveBeenCalledWith(importList.id);
  });

  it('skips existing movies and series without reporting additions', async () => {
    fetch.mockResolvedValue([
      { tmdbId: 603, title: 'The Matrix', year: 1999, mediaType: 'movie' },
      { tmdbId: 1396, tvdbId: 81189, title: 'Breaking Bad', year: 2008, mediaType: 'series' },
    ] satisfies ImportListItem[]);
    movieFindUnique.mockResolvedValue({ id: 1 });
    seriesFindUnique.mockResolvedValue({ id: 2 });

    await expect(service.syncList(importList.id)).resolves.toEqual({
      added: 0,
      skipped: 2,
      exclusions: 0,
      errors: [],
    });
    expect(upsertMovie).not.toHaveBeenCalled();
    expect(upsertSeries).not.toHaveBeenCalled();
  });

  it('counts exclusions separately and never attempts persistence', async () => {
    fetch.mockResolvedValue([
      { tmdbId: 603, title: 'The Matrix', mediaType: 'movie' },
    ] satisfies ImportListItem[]);
    isExcluded.mockResolvedValue(true);

    await expect(service.syncList(importList.id)).resolves.toEqual({
      added: 0,
      skipped: 0,
      exclusions: 1,
      errors: [],
    });
    expect(movieFindUnique).not.toHaveBeenCalled();
    expect(upsertMovie).not.toHaveBeenCalled();
  });

  it('does not count a repository no-op as an addition', async () => {
    fetch.mockResolvedValue([
      { tmdbId: 603, title: 'The Matrix', year: 1999, mediaType: 'movie' },
    ] satisfies ImportListItem[]);
    upsertMovie.mockResolvedValue(undefined);

    const result = await service.syncList(importList.id);

    expect(result.added).toBe(0);
    expect(result.errors).toEqual([
      { title: 'The Matrix', error: 'Movie "The Matrix" was not persisted' },
    ]);
  });

  it('does not count a series repository no-op as an addition', async () => {
    fetch.mockResolvedValue([
      { tmdbId: 1396, tvdbId: 81189, title: 'Breaking Bad', mediaType: 'series' },
    ] satisfies ImportListItem[]);
    upsertSeries.mockResolvedValue(undefined);

    const result = await service.syncList(importList.id);

    expect(result.added).toBe(0);
    expect(result.errors).toEqual([
      { title: 'Breaking Bad', error: 'Series "Breaking Bad" was not persisted' },
    ]);
  });

  it('rejects empty roots and filesystem-unsafe titles without persisting', async () => {
    fetch.mockResolvedValue([
      { tmdbId: 603, title: 'The Matrix', mediaType: 'movie' },
      { tmdbId: 27205, title: '..//**', mediaType: 'movie' },
    ] satisfies ImportListItem[]);
    findById.mockResolvedValueOnce({ ...importList, rootFolderPath: ' ' });

    const emptyRootResult = await service.syncList(importList.id);
    expect(emptyRootResult.errors[0]?.error).toBe(
      'Cannot derive a media path for "The Matrix": root folder is empty',
    );

    findById.mockResolvedValueOnce(importList);
    fetch.mockResolvedValueOnce([
      { tmdbId: 27205, title: '..//**', mediaType: 'movie' },
    ] satisfies ImportListItem[]);
    const unsafeTitleResult = await service.syncList(importList.id);
    expect(unsafeTitleResult.errors[0]?.error).toBe(
      'Cannot derive a media path for "..//**": title is not filesystem-safe',
    );
    expect(upsertMovie).not.toHaveBeenCalled();
  });

  it('records per-item persistence failures without inflating added', async () => {
    fetch.mockResolvedValue([
      { tmdbId: 603, title: 'The Matrix', year: 1999, mediaType: 'movie' },
      { tmdbId: 27205, title: 'Inception', year: 2010, mediaType: 'movie' },
    ] satisfies ImportListItem[]);
    upsertMovie
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce({ id: 102 });

    await expect(service.syncList(importList.id)).resolves.toEqual({
      added: 1,
      skipped: 0,
      exclusions: 0,
      errors: [{ title: 'The Matrix', error: 'disk full' }],
    });
  });

  it('rejects unusable provider items instead of treating them as additions', async () => {
    fetch.mockResolvedValue([
      { tmdbId: 1396, title: 'Breaking Bad', year: 2008, mediaType: 'series' },
      { title: 'Identifierless Movie', year: 2020, mediaType: 'movie' },
    ] satisfies ImportListItem[]);

    const result = await service.syncList(importList.id);

    expect(result.added).toBe(0);
    expect(result.errors).toEqual([
      { title: 'Breaking Bad', error: 'Series "Breaking Bad" is missing a valid TVDB ID' },
      { title: 'Identifierless Movie', error: 'Movie "Identifierless Movie" is missing a valid TMDB ID' },
    ]);
    expect(upsertMovie).not.toHaveBeenCalled();
    expect(upsertSeries).not.toHaveBeenCalled();
  });

  it('surfaces provider failures and leaves last-sync untouched', async () => {
    fetch.mockRejectedValue(new Error('TMDB rate limited'));

    await expect(service.syncList(importList.id)).rejects.toThrow(
      'Failed to fetch items from provider: TMDB rate limited',
    );
    expect(updateLastSync).not.toHaveBeenCalled();
  });

  it('keeps sync-all provider failures in the result map', async () => {
    findAllEnabled.mockResolvedValue([importList]);
    fetch.mockRejectedValue(new Error('TMDB unavailable'));

    const results = await service.syncAllEnabled();

    expect(results.get(importList.id)).toEqual({
      added: 0,
      skipped: 0,
      exclusions: 0,
      errors: [{
        title: `List ${importList.name}`,
        error: 'Failed to fetch items from provider: TMDB unavailable',
      }],
    });
  });
});
