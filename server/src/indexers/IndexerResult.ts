/**
 * Standardized result from any indexer (Torznab or Scraping).
 * This is the unified model for search results and RSS items.
 */
export interface IndexerResult {
  title: string;
  guid: string;
  downloadUrl?: string | undefined;
  infoUrl?: string | undefined;
  magnetUrl?: string | undefined;
  publishDate: Date;
  size?: bigint | undefined;
  seeders?: number | undefined;
  leechers?: number | undefined;
  categories: number[];
  protocol: string;
  indexerFlags?: string | undefined;
  indexerId?: number | undefined;
  indexerName?: string | undefined;
}

/**
 * Deduplicate results by guid, keeping the first occurrence.
 */
export function deduplicateResults(results: IndexerResult[]): IndexerResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.guid)) return false;
    seen.add(r.guid);
    return true;
  });
}

/**
 * Merge results from multiple indexers and deduplicate.
 */
export function mergeResults(...resultSets: IndexerResult[][]): IndexerResult[] {
  const all = resultSets.flat();
  return deduplicateResults(all);
}
