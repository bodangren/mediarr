/**
 * Standardized result from any indexer (Torznab or Scraping).
 * This is the unified model for search results and RSS items.
 */
export interface IndexerResult {
  title: string;
  guid: string;
  downloadUrl?: string;
  infoUrl?: string;
  magnetUrl?: string;
  publishDate: Date;
  size?: bigint;
  seeders?: number;
  leechers?: number;
  categories: number[];
  protocol: string;
  indexerFlags?: string;
  indexerId?: number;
  indexerName?: string;
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
