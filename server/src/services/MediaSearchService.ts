/**
 * Service to coordinate searching for media releases across multiple indexers.
 */
export class MediaSearchService {
  constructor(
    private readonly indexerRepository: any,
    private readonly indexerFactory: any,
    private readonly torrentManager: any
  ) {}

  /**
   * Search for a specific episode and grab the best release.
   */
  async searchEpisode(series: { title: string }, episode: { seasonNumber: number; episodeNumber: number }): Promise<any> {
    const query = `${series.title} S${episode.seasonNumber.toString().padStart(2, '0')}E${episode.episodeNumber.toString().padStart(2, '0')}`;
    const results = await this.searchIndexers({ q: query });
    return this.grabBestMatch(results);
  }

  /**
   * Search for a movie and grab the best release.
   */
  async searchMovie(movie: { title: string; year?: number; tmdbId?: number; imdbId?: string }): Promise<any> {
    const yearPart = movie.year ? ` ${movie.year}` : '';
    const query = `${movie.title}${yearPart}`.trim();

    const results = await this.searchIndexers({
      q: query,
      tmdbid: movie.tmdbId,
      imdbid: movie.imdbId,
    });

    return this.grabBestMatch(results);
  }

  private async searchIndexers(query: any): Promise<any[]> {
    const indexerRecords = await this.indexerRepository.findAllEnabled();
    const indexers = indexerRecords.map((record: any) =>
      this.indexerFactory.fromDatabaseRecord(record)
    );

    const allResults: any[] = [];

    for (const indexer of indexers) {
      try {
        const results = await indexer.search(query);
        allResults.push(...results);
      } catch (error) {
        console.error(`Search failed for indexer ${indexer.config.name}:`, error);
      }
    }

    return allResults;
  }

  private async grabBestMatch(allResults: any[]): Promise<any> {
    if (allResults.length === 0) {
      return null;
    }

    const bestMatch = allResults.sort((a, b) => {
      if ((b.seeders || 0) !== (a.seeders || 0)) {
        return (b.seeders || 0) - (a.seeders || 0);
      }
      return (b.size || 0) - (a.size || 0);
    })[0];

    if (bestMatch && bestMatch.magnetUrl) {
      return this.torrentManager.addTorrent({ magnetUrl: bestMatch.magnetUrl });
    }

    return null;
  }
}
