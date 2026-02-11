/**
 * Service to coordinate searching for TV releases across multiple indexers.
 */
export class TvSearchService {
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
    
    const indexerRecords = await this.indexerRepository.findAllEnabled();
    const indexers = indexerRecords.map((r: any) => this.indexerFactory.fromDatabaseRecord(r));

    let allResults: any[] = [];

    for (const indexer of indexers) {
      try {
        const results = await indexer.search({ q: query });
        allResults.push(...results);
      } catch (error) {
        console.error(`Search failed for indexer ${indexer.config.name}:`, error);
      }
    }

    if (allResults.length === 0) {
      return null;
    }

    // Basic ranking: most seeders, then largest size (placeholder for quality ranking)
    const bestMatch = allResults.sort((a, b) => {
      if ((b.seeders || 0) !== (a.seeders || 0)) {
        return (b.seeders || 0) - (a.seeders || 0);
      }
      return (b.size || 0) - (a.size || 0);
    })[0];

    if (bestMatch && bestMatch.magnetUrl) {
      return this.torrentManager.addTorrent({
        magnetUrl: bestMatch.magnetUrl
      });
    }

    return null;
  }
}
