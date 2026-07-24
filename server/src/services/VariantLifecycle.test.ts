import { describe, expect, it, vi } from 'vitest';
import { createVariantLifecycle } from './VariantLifecycle';

function buildLifecycle() {
  const calls: string[] = [];
  const backfillService = {
    run: vi.fn(async () => {
      calls.push('backfill');
      return { movieVariantsCreated: 0, episodeVariantsCreated: 0 };
    }),
  };
  const repository = {
    listMovieVariants: vi.fn().mockResolvedValue([
      {
        id: 11,
        path: '/media/movie.mkv',
        fileSize: 100,
        releaseName: null,
        quality: '1080p',
      },
    ]),
    listEpisodeVariants: vi.fn().mockResolvedValue([
      {
        id: 22,
        path: '/media/episode.mkv',
        fileSize: 200,
        releaseName: 'Show.S01E01',
        quality: null,
      },
    ]),
  };
  const indexer = {
    indexMovieVariant: vi.fn(async () => {
      calls.push('index-movie');
    }),
    indexEpisodeVariant: vi.fn(async () => {
      calls.push('index-episode');
    }),
  };
  const automation = {
    onMovieImported: vi.fn(async () => {
      calls.push('automate-movie');
      return {
        variantsScanned: 1,
        wantedQueued: 0,
        downloaded: 0,
        failed: 0,
      };
    }),
    onEpisodeImported: vi.fn(async () => {
      calls.push('automate-episode');
      return {
        variantsScanned: 1,
        wantedQueued: 0,
        downloaded: 0,
        failed: 0,
      };
    }),
  };
  const catalogCache = { unwatch: vi.fn() };
  const warn = vi.fn();
  const lifecycle = createVariantLifecycle(
    backfillService,
    repository,
    indexer,
    automation,
    catalogCache,
    warn,
  );

  return {
    lifecycle,
    calls,
    backfillService,
    repository,
    indexer,
    automation,
    catalogCache,
    warn,
  };
}

describe('VariantLifecycle', () => {
  it('runs the startup backfill and fails closed when it rejects', async () => {
    const { lifecycle, backfillService } = buildLifecycle();
    await lifecycle.start();
    expect(backfillService.run).toHaveBeenCalledOnce();

    const failure = new Error('backfill failed');
    backfillService.run.mockRejectedValueOnce(failure);
    await expect(lifecycle.start()).rejects.toBe(failure);
  });

  it('indexes imports before invoking subtitle automation', async () => {
    const { lifecycle, calls, indexer } = buildLifecycle();

    await lifecycle.importHooks.onMovieImported(7);
    await lifecycle.importHooks.onEpisodeImported(8);

    expect(indexer.indexMovieVariant).toHaveBeenCalledWith(7, {
      path: '/media/movie.mkv',
      fileSize: 100,
      quality: '1080p',
    });
    expect(indexer.indexEpisodeVariant).toHaveBeenCalledWith(8, {
      path: '/media/episode.mkv',
      fileSize: 200,
      releaseName: 'Show.S01E01',
    });
    expect(calls).toEqual([
      'index-movie',
      'automate-movie',
      'index-episode',
      'automate-episode',
    ]);
  });

  it('continues subtitle automation after an individual probe/index failure', async () => {
    const { lifecycle, indexer, automation, warn } = buildLifecycle();
    const failure = new Error('ffprobe unavailable');
    indexer.indexMovieVariant.mockRejectedValueOnce(failure);

    await lifecycle.importHooks.onMovieImported(7);

    expect(warn).toHaveBeenCalledWith(
      '[VariantInventoryIndexer] Movie variant 11 indexing failed:',
      failure,
    );
    expect(automation.onMovieImported).toHaveBeenCalledWith(7);
  });

  it('exposes the exact production indexer as an API dependency', () => {
    const { lifecycle, indexer } = buildLifecycle();
    expect(lifecycle.apiDependencies).toEqual({
      variantInventoryIndexer: indexer,
    });
  });

  it('closes the catalog watcher', () => {
    const { lifecycle, catalogCache } = buildLifecycle();
    lifecycle.close();
    expect(catalogCache.unwatch).toHaveBeenCalledOnce();
  });
});
