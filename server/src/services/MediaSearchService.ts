import { TorrentRejectedError } from '../errors/domainErrors';
import { ActivityEventEmitter } from './ActivityEventEmitter';

export interface SearchCandidate {
  indexer: string;
  title: string;
  size: number;
  seeders: number;
  quality?: string;
  age?: number;
  magnetUrl?: string;
  downloadUrl?: string;
}

/**
 * Service to coordinate searching for media releases across multiple indexers.
 */
export class MediaSearchService {
  constructor(
    private readonly indexerRepository: any,
    private readonly indexerFactory: any,
    private readonly torrentManager: any,
    private readonly activityEventEmitter?: ActivityEventEmitter,
  ) {}

  /**
   * Search for a specific episode and grab the best release.
   */
  async searchEpisode(
    series: { title: string },
    episode: { seasonNumber: number; episodeNumber: number },
  ): Promise<any> {
    const query = `${series.title} S${episode.seasonNumber.toString().padStart(2, '0')}E${episode.episodeNumber.toString().padStart(2, '0')}`;
    const candidates = await this.getSearchCandidates({ q: query });
    if (candidates.length === 0) {
      return null;
    }

    return this.grabRelease(candidates[0]);
  }

  /**
   * Search for a movie and grab the best release.
   */
  async searchMovie(movie: { title: string; year?: number; tmdbId?: number; imdbId?: string }): Promise<any> {
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

    return this.grabRelease(candidates[0]);
  }

  async getSearchCandidates(query: any): Promise<SearchCandidate[]> {
    const indexerRecords = await this.indexerRepository.findAllEnabled();
    const indexers = indexerRecords.map((record: any) =>
      this.indexerFactory.fromDatabaseRecord(record),
    );

    const allResults: SearchCandidate[] = [];

    for (const indexer of indexers) {
      try {
        const results = await indexer.search(query);
        const mappedResults = results.map((result: any) => ({
          indexer: indexer.config?.name ?? 'unknown',
          title: result.title ?? '',
          size: result.size ?? 0,
          seeders: result.seeders ?? 0,
          quality: result.quality,
          age: result.age,
          magnetUrl: result.magnetUrl,
          downloadUrl: result.downloadUrl,
        }));
        allResults.push(...mappedResults);
      } catch (error) {
        console.error(`Search failed for indexer ${indexer.config.name}:`, error);
      }
    }

    const rankedResults = allResults.sort((a, b) => {
      if (b.seeders !== a.seeders) {
        return b.seeders - a.seeders;
      }
      return b.size - a.size;
    });

    await this.activityEventEmitter?.emit({
      eventType: 'SEARCH_EXECUTED',
      sourceModule: 'media-search-service',
      summary: `Search returned ${rankedResults.length} candidates`,
      success: true,
      occurredAt: new Date(),
    });

    return rankedResults;
  }

  async grabRelease(candidate: SearchCandidate): Promise<any> {
    if (!candidate.magnetUrl) {
      throw new TorrentRejectedError(
        'Search candidate does not contain a magnet URL',
        {
          title: candidate.title,
          indexer: candidate.indexer,
        },
      );
    }

    try {
      const torrent = await this.torrentManager.addTorrent({
        magnetUrl: candidate.magnetUrl,
      });

      await this.activityEventEmitter?.emit({
        eventType: 'RELEASE_GRABBED',
        sourceModule: 'media-search-service',
        entityRef: torrent?.infoHash ? `torrent:${torrent.infoHash}` : undefined,
        summary: `Release grabbed: ${candidate.title}`,
        success: true,
        occurredAt: new Date(),
      });

      return torrent;
    } catch (error: any) {
      await this.activityEventEmitter?.emit({
        eventType: 'RELEASE_GRABBED',
        sourceModule: 'media-search-service',
        summary: `Release grab failed: ${candidate.title}`,
        success: false,
        details: {
          reason: error?.message ?? 'unknown error',
        },
        occurredAt: new Date(),
      });

      throw new TorrentRejectedError(
        `Torrent handoff failed: ${error?.message ?? 'unknown error'}`,
        {
          title: candidate.title,
          indexer: candidate.indexer,
        },
      );
    }
  }
}
