import type { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';
import type { VariantBackfillService } from './VariantBackfillService';
import type { VariantInventoryIndexer, VariantFileInput } from './VariantInventoryIndexer';
import type { SubtitleAutomationService } from './SubtitleAutomationService';
import type { CatalogCache } from './indexers/CatalogCache';

type ImportVariant = {
  id: number;
  path: string;
  fileSize: number;
  releaseName: string | null;
  quality: string | null;
};

interface VariantIndexer {
  indexMovieVariant(movieId: number, file: VariantFileInput): Promise<void>;
  indexEpisodeVariant(episodeId: number, file: VariantFileInput): Promise<void>;
}

export interface VariantLifecycle {
  start(): Promise<void>;
  importHooks: {
    onMovieImported(movieId: number): Promise<void>;
    onEpisodeImported(episodeId: number): Promise<void>;
  };
  apiDependencies: {
    variantInventoryIndexer: Pick<
      VariantInventoryIndexer,
      'indexMovieVariant' | 'indexEpisodeVariant'
    >;
  };
  close(): void;
}

function toIndexerInput(variant: ImportVariant): VariantFileInput {
  return {
    path: variant.path,
    fileSize: Number(variant.fileSize),
    ...(variant.releaseName ? { releaseName: variant.releaseName } : {}),
    ...(variant.quality ? { quality: variant.quality } : {}),
  };
}

export function createVariantLifecycle(
  backfillService: Pick<VariantBackfillService, 'run'>,
  repository: Pick<
    SubtitleVariantRepository,
    'listMovieVariants' | 'listEpisodeVariants'
  >,
  indexer: VariantIndexer,
  automation: Pick<
    SubtitleAutomationService,
    'onMovieImported' | 'onEpisodeImported'
  >,
  catalogCache: Pick<CatalogCache, 'unwatch'>,
  warn: (message: string, error: unknown) => void = (message, error) => {
    console.warn(message, error);
  },
): VariantLifecycle {
  const indexMovie = async (movieId: number): Promise<void> => {
    const variants = await repository.listMovieVariants(movieId);
    for (const variant of variants) {
      await indexer.indexMovieVariant(movieId, toIndexerInput(variant)).catch(error => {
        warn(`[VariantInventoryIndexer] Movie variant ${variant.id} indexing failed:`, error);
      });
    }
    await automation.onMovieImported(movieId);
  };

  const indexEpisode = async (episodeId: number): Promise<void> => {
    const variants = await repository.listEpisodeVariants(episodeId);
    for (const variant of variants) {
      await indexer.indexEpisodeVariant(episodeId, toIndexerInput(variant)).catch(error => {
        warn(`[VariantInventoryIndexer] Episode variant ${variant.id} indexing failed:`, error);
      });
    }
    await automation.onEpisodeImported(episodeId);
  };

  return {
    // Startup intentionally fails closed: a rejected backfill prevents serving
    // requests with a partially initialized variant inventory.
    start: async () => {
      await backfillService.run();
    },
    importHooks: {
      onMovieImported: indexMovie,
      onEpisodeImported: indexEpisode,
    },
    apiDependencies: {
      variantInventoryIndexer: indexer,
    },
    close: () => {
      catalogCache.unwatch();
    },
  };
}
