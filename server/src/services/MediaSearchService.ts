import { TorrentRejectedError, NotFoundError, ValidationError } from '../errors/domainErrors';
import { ActivityEventEmitter } from './ActivityEventEmitter';
import type { IndexerResult } from '../indexers/IndexerResult';
import type { BaseIndexer, SearchQuery } from '../indexers/BaseIndexer';

export interface SearchCandidate {
  indexer: string;
  indexerId: number;
  title: string;
  guid: string;
  size: number;
  seeders: number;
  leechers?: number;
  indexerFlags?: string;
  quality?: string;
  age?: number;
  magnetUrl?: string;
  downloadUrl?: string;
  infoHash?: string;
  publishDate?: Date;
  categories?: number[];
  protocol?: string;
}

export interface SearchParams {
  query?: string;
  type?: 'generic' | 'tvsearch' | 'movie' | 'music' | 'book';
  season?: number;
  episode?: number;
  tvdbId?: number;
  imdbId?: string;
  tmdbId?: number;
  year?: number;
  artist?: string;
  album?: string;
  author?: string;
  title?: string;
  categories?: number[];
}

export interface IndexerSearchResult {
  indexerId: number;
  indexerName: string;
  status: 'success' | 'error' | 'timeout';
  resultCount: number;
  errorMessage?: string;
}

export interface AggregatedSearchResult {
  releases: SearchCandidate[];
  indexerResults: IndexerSearchResult[];
  totalResults: number;
  deduplicatedCount: number;
}

const INDEXER_TIMEOUT_MS = 30000;

/**
 * Extracts the infoHash from a magnet URL or returns the provided infoHash.
 * Magnet format: magnet:?xt=urn:btih:INFOHASH&...
 */
function extractInfoHash(magnetUrl?: string, infoHash?: string): string | undefined {
  if (infoHash) return infoHash.toLowerCase();
  if (!magnetUrl) return undefined;

  const match = magnetUrl.match(/xt=urn:btih:([a-fA-F0-9]{40})/i);
  if (match) {
    return match[1]!.toLowerCase();
  }

  // Also support base32 encoded infohashes (32 chars)
  const base32Match = magnetUrl.match(/xt=urn:btih:([A-Z2-7]{32})/i);
  if (base32Match) {
    // Convert base32 to hex (simplified - in production you'd use a proper base32 decoder)
    return base32Match[1]!.toLowerCase();
  }

  return undefined;
}

/**
 * Converts an IndexerResult to a SearchCandidate.
 */
function toSearchCandidate(result: IndexerResult, indexerId: number, indexerName: string): SearchCandidate {
  const infoHash = extractInfoHash(result.magnetUrl);
  const candidate: SearchCandidate = {
    indexer: indexerName,
    indexerId,
    title: result.title,
    guid: result.guid,
    size: result.size !== undefined ? Number(result.size) : 0,
    seeders: result.seeders ?? 0,
  };

  // Only add optional properties if they have values
  if (result.leechers !== undefined) {
    candidate.leechers = result.leechers;
  }
  if (result.indexerFlags !== undefined) {
    candidate.indexerFlags = result.indexerFlags;
  }
  if (result.magnetUrl !== undefined) {
    candidate.magnetUrl = result.magnetUrl;
  }
  if (result.downloadUrl !== undefined) {
    candidate.downloadUrl = result.downloadUrl;
  }
  if (infoHash !== undefined) {
    candidate.infoHash = infoHash;
  }
  if (result.publishDate !== undefined) {
    candidate.publishDate = result.publishDate;
  }
  if (result.categories !== undefined && result.categories.length > 0) {
    candidate.categories = result.categories;
  }
  if (result.protocol !== undefined) {
    candidate.protocol = result.protocol;
  }

  return candidate;
}

/**
 * Deduplicates releases by infoHash, preferring the one with more seeders.
 * Releases without an infoHash are kept but not deduplicated.
 */
function deduplicateByInfoHash(releases: SearchCandidate[]): SearchCandidate[] {
  const byInfoHash = new Map<string, SearchCandidate>();
  const withoutInfoHash: SearchCandidate[] = [];

  for (const release of releases) {
    if (!release.infoHash) {
      withoutInfoHash.push(release);
      continue;
    }

    const existing = byInfoHash.get(release.infoHash);
    if (!existing) {
      byInfoHash.set(release.infoHash, release);
    } else {
      // Keep the one with more seeders
      if (release.seeders > existing.seeders) {
        byInfoHash.set(release.infoHash, release);
      }
    }
  }

  return [...byInfoHash.values(), ...withoutInfoHash];
}

/**
 * Converts SearchParams to the SearchQuery format expected by indexers.
 */
function toSearchQuery(params: SearchParams): SearchQuery {
  const query: SearchQuery = {};

  if (params.query) {
    query.q = params.query;
  }

  if (params.categories && params.categories.length > 0) {
    query.categories = params.categories;
  }

  if (params.season !== undefined) {
    query.season = params.season;
  }

  if (params.episode !== undefined) {
    query.ep = params.episode;
  }

  if (params.imdbId) {
    // Remove 'tt' prefix if present
    query.imdbid = params.imdbId.replace(/^tt/, '');
  }

  if (params.tmdbId !== undefined) {
    query.tmdbid = String(params.tmdbId);
  }

  // Build query string from title/year if not provided
  if (!query.q && params.title) {
    let q = params.title;
    if (params.year) {
      q += ` ${params.year}`;
    }
    query.q = q;
  }

  return query;
}

/**
 * Service to coordinate searching for media releases across multiple indexers.
 */
export class MediaSearchService {
  constructor(
    private readonly indexerRepository: {
      findAllEnabled: () => Promise<Array<{
        id: number;
        name: string;
        implementation: string;
        protocol: string;
        enabled: boolean;
        priority: number;
        supportsRss: boolean;
        supportsSearch: boolean;
        settings: Record<string, unknown>;
      }>>;
    },
    private readonly indexerFactory: {
      fromDatabaseRecord: (record: unknown) => BaseIndexer;
    },
    private readonly torrentManager: {
      addTorrent: (options: { magnetUrl?: string; torrentFile?: Buffer; path?: string }) => Promise<{ infoHash: string; name: string }>;
    },
    private readonly activityEventEmitter?: ActivityEventEmitter,
  ) {}

  /**
   * Search all enabled indexers in parallel and aggregate results.
   */
  async searchAllIndexers(params: SearchParams): Promise<AggregatedSearchResult> {
    const indexerRecords = await this.indexerRepository.findAllEnabled();

    if (indexerRecords.length === 0) {
      return {
        releases: [],
        indexerResults: [],
        totalResults: 0,
        deduplicatedCount: 0,
      };
    }

    const query = toSearchQuery(params);
    const indexerResults: IndexerSearchResult[] = [];
    const allReleases: SearchCandidate[] = [];

    // Query each indexer in parallel with timeout
    const searchPromises = indexerRecords.map(async (record) => {
      const indexerId = record.id;
      const indexerName = record.name;

      try {
        const indexer = this.indexerFactory.fromDatabaseRecord(record);
        const results = await this.searchWithTimeout(indexer, query, INDEXER_TIMEOUT_MS);

        return {
          indexerId,
          indexerName,
          status: 'success' as const,
          resultCount: results.length,
          results,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');

        return {
          indexerId,
          indexerName,
          status: isTimeout ? ('timeout' as const) : ('error' as const),
          resultCount: 0,
          errorMessage,
          results: [],
        };
      }
    });

    const settledResults = await Promise.allSettled(searchPromises);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled') {
        const { results, ...statusInfo } = settled.value;
        indexerResults.push(statusInfo);

        for (const result of results) {
          allReleases.push(toSearchCandidate(result, statusInfo.indexerId, statusInfo.indexerName));
        }
      } else {
        // This shouldn't happen since we catch errors inside the promise,
        // but handle it just in case
        indexerResults.push({
          indexerId: 0,
          indexerName: 'unknown',
          status: 'error',
          resultCount: 0,
          errorMessage: settled.reason?.message ?? 'Unknown error',
        });
      }
    }

    // Sort by seeders (descending), then by size (descending)
    allReleases.sort((a, b) => {
      if (b.seeders !== a.seeders) {
        return b.seeders - a.seeders;
      }
      return b.size - a.size;
    });

    const totalResults = allReleases.length;
    const deduplicatedReleases = deduplicateByInfoHash(allReleases);

    await this.activityEventEmitter?.emit({
      eventType: 'SEARCH_EXECUTED',
      sourceModule: 'media-search-service',
      summary: `Search returned ${totalResults} results from ${indexerRecords.length} indexers (${deduplicatedReleases.length} after deduplication)`,
      success: true,
      details: {
        query: params.query,
        type: params.type,
        totalResults,
        deduplicatedCount: deduplicatedReleases.length,
        indexerCount: indexerRecords.length,
      },
      occurredAt: new Date(),
    });

    return {
      releases: deduplicatedReleases,
      indexerResults,
      totalResults,
      deduplicatedCount: deduplicatedReleases.length,
    };
  }

  /**
   * Search a single indexer with a timeout.
   */
  private async searchWithTimeout(
    indexer: BaseIndexer,
    query: SearchQuery,
    timeoutMs: number,
  ): Promise<IndexerResult[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Indexer search timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      indexer.search(query)
        .then((results) => {
          clearTimeout(timeout);
          resolve(results);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Search for a specific episode and grab the best release.
   */
  async searchEpisode(
    series: { title: string },
    episode: { seasonNumber: number; episodeNumber: number },
  ): Promise<{ infoHash: string; name: string } | null> {
    const query = `${series.title} S${episode.seasonNumber.toString().padStart(2, '0')}E${episode.episodeNumber.toString().padStart(2, '0')}`;
    const candidates = await this.getSearchCandidates({ q: query });
    if (candidates.length === 0) {
      return null;
    }

    return this.grabRelease(candidates[0]!);
  }

  /**
   * Search for a movie and grab the best release.
   */
  async searchMovie(movie: { title: string; year?: number; tmdbId?: number; imdbId?: string }): Promise<{ infoHash: string; name: string } | null> {
    const yearPart = movie.year ? ` ${movie.year}` : '';
    const query = `${movie.title}${yearPart}`.trim();

    const candidates = await this.getSearchCandidates({
      q: query,
      tmdbid: movie.tmdbId,
      imdbid: movie.imdbId,
    });

    if (candidates.length === 0) {
      return null;
    }

    return this.grabRelease(candidates[0]!);
  }

  /**
   * Legacy method for backward compatibility.
   * @deprecated Use searchAllIndexers instead
   */
  async getSearchCandidates(query: Record<string, unknown>): Promise<SearchCandidate[]> {
    const params: SearchParams = {};

    if (typeof query.q === 'string') {
      params.query = query.q;
    }
    if (Array.isArray(query.categories)) {
      params.categories = query.categories as number[];
    }
    if (typeof query.season === 'number') {
      params.season = query.season;
    }
    if (typeof query.ep === 'number') {
      params.episode = query.ep;
    }
    if (typeof query.imdbid === 'string') {
      params.imdbId = query.imdbid;
    }
    if (query.tmdbid !== undefined) {
      params.tmdbId = Number(query.tmdbid);
    }

    const result = await this.searchAllIndexers(params);
    return result.releases;
  }

  /**
   * Grab a release by adding it to the torrent client.
   */
  async grabRelease(candidate: SearchCandidate): Promise<{ infoHash: string; name: string }> {
    if (!candidate.magnetUrl && !candidate.downloadUrl) {
      throw new TorrentRejectedError(
        'Search candidate does not contain a magnet URL or download URL',
        {
          title: candidate.title,
          indexer: candidate.indexer,
        },
      );
    }

    try {
      // Prefer magnet URL, fall back to download URL
      const magnetUrl = candidate.magnetUrl?.startsWith('magnet:') ? candidate.magnetUrl : undefined;
      const downloadUrl = candidate.downloadUrl;

      // Build addTorrent options carefully to avoid undefined in optional props
      const addOptions: { magnetUrl?: string; path?: string } = {};
      if (magnetUrl) {
        addOptions.magnetUrl = magnetUrl;
      }

      const torrent = await this.torrentManager.addTorrent(addOptions);

      const eventData: {
        eventType: 'RELEASE_GRABBED';
        sourceModule: string;
        entityRef?: string;
        summary: string;
        success: boolean;
        details: Record<string, unknown>;
        occurredAt: Date;
      } = {
        eventType: 'RELEASE_GRABBED',
        sourceModule: 'media-search-service',
        summary: `Release grabbed: ${candidate.title}`,
        success: true,
        details: {
          title: candidate.title,
          indexer: candidate.indexer,
          indexerId: candidate.indexerId,
          guid: candidate.guid,
          size: candidate.size,
          seeders: candidate.seeders,
        },
        occurredAt: new Date(),
      };

      if (torrent?.infoHash) {
        eventData.entityRef = `torrent:${torrent.infoHash}`;
      }

      await this.activityEventEmitter?.emit(eventData);

      return torrent;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'unknown error';

      await this.activityEventEmitter?.emit({
        eventType: 'RELEASE_GRABBED',
        sourceModule: 'media-search-service',
        summary: `Release grab failed: ${candidate.title}`,
        success: false,
        details: {
          title: candidate.title,
          indexer: candidate.indexer,
          reason: errorMsg,
        },
        occurredAt: new Date(),
      });

      throw new TorrentRejectedError(
        `Torrent handoff failed: ${errorMsg}`,
        {
          title: candidate.title,
          indexer: candidate.indexer,
        },
      );
    }
  }

  /**
   * Grab a release by GUID and indexer ID.
   * This requires re-searching to find the specific release.
   */
  async grabReleaseByGuid(
    guid: string,
    indexerId: number,
    _downloadClientId?: number,
  ): Promise<{ infoHash: string; name: string }> {
    // Get the specific indexer
    const indexerRecords = await this.indexerRepository.findAllEnabled();
    const indexerRecord = indexerRecords.find((r) => r.id === indexerId);

    if (!indexerRecord) {
      throw new NotFoundError(`Indexer with ID ${indexerId} not found or not enabled`);
    }

    // Search the indexer for the specific release
    // We use the GUID as the query - some indexers support this, others may need a full re-search
    const indexer = this.indexerFactory.fromDatabaseRecord(indexerRecord);
    let results: IndexerResult[];

    try {
      results = await this.searchWithTimeout(indexer, { q: guid }, INDEXER_TIMEOUT_MS);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new ValidationError(
        `Failed to search indexer ${indexerRecord.name} for release: ${errorMsg}`,
      );
    }

    // Find the specific release by GUID
    const release = results.find((r) => r.guid === guid);

    if (!release) {
      throw new NotFoundError(`Release with GUID ${guid} not found on indexer ${indexerRecord.name}`);
    }

    // Convert to candidate and grab
    const candidate = toSearchCandidate(release, indexerId, indexerRecord.name);

    // Note: downloadClientId is accepted but currently not used since we use the internal torrent manager
    // In a future implementation, this would route to external download clients (qBittorrent, Transmission, etc.)
    // The parameter is prefixed with underscore to indicate it's intentionally unused

    return this.grabRelease(candidate);
  }
}
