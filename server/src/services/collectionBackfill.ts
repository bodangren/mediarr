import fsp from 'node:fs/promises';

export interface CollectionBackfillMovie {
  id: number;
  tmdbId: number | null;
}

export interface CollectionBackfillDeps {
  movieStore: {
    findMany(args: { where: Record<string, unknown>; select: Record<string, boolean>; take: number }): Promise<unknown[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  collectionService: {
    detectMovieCollection(tmdbId: number): Promise<{ tmdbCollectionId: number } | null>;
    linkMovieToCollection(tmdbCollectionId: number, movieDbId: number): Promise<void>;
  };
}

export interface CollectionBackfillResult {
  scanned: number;
  linked: number;
  noCollection: number;
  skipped: number;
  failed: number;
  remaining: number;
}

/**
 * Links existing-library movies to their TMDB collections in bounded batches and remembers movies that
 * belong to no collection, so scheduled runs do not re-query TMDB for the same standalone films forever.
 */
export async function backfillMovieCollections(
  deps: CollectionBackfillDeps,
  options: { statePath: string; limit: number; onWarning?: (message: string) => void },
): Promise<CollectionBackfillResult> {
  let checked: number[] = [];
  try {
    const raw = JSON.parse(await fsp.readFile(options.statePath, 'utf-8')) as { checked?: unknown };
    if (Array.isArray(raw.checked)) checked = raw.checked.filter((id): id is number => typeof id === 'number');
  } catch {
    checked = [];
  }
  const checkedSet = new Set(checked);
  const limit = Math.max(1, options.limit);
  const candidates = await deps.movieStore.findMany({
    where: { collectionId: null, tmdbId: { not: null } },
    select: { id: true, tmdbId: true },
    // Fetch extra so already-checked standalone films do not consume the batch.
    take: Math.min(500, limit + checked.length + 100),
  });
  const result: CollectionBackfillResult = {
    scanned: 0, linked: 0, noCollection: 0, skipped: 0, failed: 0, remaining: 0,
  };
  for (const raw of candidates as CollectionBackfillMovie[]) {
    if (result.linked + result.noCollection >= limit) break;
    result.scanned += 1;
    if (!raw.tmdbId) continue;
    if (checkedSet.has(raw.tmdbId)) {
      result.skipped += 1;
      continue;
    }
    try {
      const detection = await deps.collectionService.detectMovieCollection(raw.tmdbId);
      if (!detection) {
        result.noCollection += 1;
        checkedSet.add(raw.tmdbId);
        continue;
      }
      await deps.collectionService.linkMovieToCollection(detection.tmdbCollectionId, raw.id);
      result.linked += 1;
    } catch (error) {
      result.failed += 1;
      options.onWarning?.(
        `Collection backfill failed for TMDB ${raw.tmdbId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const statePath = options.statePath;
  const tmp = `${statePath}.tmp`;
  await fsp.writeFile(tmp, `${JSON.stringify({ checked: [...checkedSet] }, null, 2)}\n`, 'utf-8');
  await fsp.rename(tmp, statePath);
  result.remaining = await deps.movieStore.count({ where: { collectionId: null, tmdbId: { not: null } } });
  return result;
}
