import { Parser } from '../utils/Parser';
import { CustomFormatScoringEngine } from './CustomFormatScoringEngine';

/**
 * Service that monitors RSS releases and triggers downloads for wanted TV and movie media.
 */
export class RssMediaMonitor {
  private readonly AUTO_GRAB_THRESHOLD = 50;

  constructor(
    private readonly rssSyncService: any,
    private readonly torrentManager: any,
    private readonly prisma: any,
    private readonly metadataProvider: any = null,
    private readonly customFormatRepository: any = null
  ) {
    this.rssSyncService.on('release:stored', (release: any) => {
      this.handleNewRelease(release).catch(err => {
        console.error('Failed to process new release in RssMediaMonitor:', err);
      });
    });
  }

  private async handleNewRelease(release: { title: string; magnetUrl?: string; seeders?: number; size?: number; indexerId?: number; protocol?: string; indexerFlags?: string }): Promise<void> {
    if (!release.magnetUrl) return;

    const releaseWithMagnet = release as typeof release & { magnetUrl: string };
    const tvMatched = await this.handleTvRelease(releaseWithMagnet);
    if (tvMatched) {
      return;
    }

    await this.handleMovieRelease(releaseWithMagnet);
  }

  private async getFormatScores(qualityProfileId: number | null) {
    if (!qualityProfileId || !this.customFormatRepository) return [];
    try {
      return await this.customFormatRepository.findByQualityProfileId(qualityProfileId);
    } catch {
      return [];
    }
  }

  private async getIndexerPriority(indexerId?: number): Promise<number> {
    if (!indexerId) return 0;
    try {
      const indexer = await this.prisma.indexer.findUnique({ where: { id: indexerId } });
      return indexer?.priority || 0;
    } catch {
      return 0;
    }
  }

  private async handleTvRelease(release: { title: string; magnetUrl: string; seeders?: number; indexerId?: number }): Promise<boolean> {
    const parsed = Parser.parse(release.title);
    if (!(parsed && parsed.seriesTitle)) {
      return false;
    }

    const series = await this.prisma.series.findFirst({
      where: {
        OR: [
          { title: { contains: parsed.seriesTitle } },
          { cleanTitle: { contains: parsed.seriesTitle.toLowerCase().replace(/\s/g, '') } },
        ],
        monitored: true,
      },
    });

    if (!series) {
      return false;
    }

    const episode = await this.prisma.episode.findFirst({
      where: {
        seriesId: series.id,
        seasonNumber: parsed.seasonNumber,
        episodeNumber: parsed.episodeNumbers[0],
        monitored: true,
        path: null,
      },
    });

    if (!episode) {
      return false;
    }

    // Score the release
    const engine = new CustomFormatScoringEngine();
    const formatScores = await this.getFormatScores(series.qualityProfileId);
    const indexerPriority = await this.getIndexerPriority(release.indexerId);

    const scoringResult = engine.scoreCandidateUnified(
      { title: release.title, seeders: release.seeders },
      formatScores,
      { title: series.title, season: episode.seasonNumber, episode: episode.episodeNumber },
      indexerPriority
    );

    if (scoringResult.totalScore < this.AUTO_GRAB_THRESHOLD) {
      console.log(`RssMediaMonitor: Skipped ${release.title} for ${series.title} (score ${scoringResult.totalScore} < ${this.AUTO_GRAB_THRESHOLD})`);
      return true; // We matched it, but rejected it based on score
    }

    console.log(`RssMediaMonitor: Grabbing ${release.title} for ${series.title} (score ${scoringResult.totalScore})`);
    await this.torrentManager.addTorrent({ magnetUrl: release.magnetUrl, episodeId: episode.id });
    return true;
  }

  private async handleMovieRelease(release: { title: string; magnetUrl: string; seeders?: number; indexerId?: number }): Promise<void> {
    const parsed = this.parseMovieTitle(release.title);
    if (!parsed) {
      return;
    }

    const cleanTitle = parsed.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    const movie = await this.prisma.movie.findFirst({
      where: {
        monitored: true,
        path: null,
        OR: [
          { title: { contains: parsed.title } },
          { cleanTitle: { contains: cleanTitle } },
        ],
      },
    });

    if (!movie) {
      return;
    }

    const availability = this.resolveMovieAvailability(movie);
    if (!this.meetsMinimumAvailability(movie.minimumAvailability, availability)) {
      return;
    }

    // Score the release
    const engine = new CustomFormatScoringEngine();
    const formatScores = await this.getFormatScores(movie.qualityProfileId);
    const indexerPriority = await this.getIndexerPriority(release.indexerId);

    const scoringResult = engine.scoreCandidateUnified(
      { title: release.title, seeders: release.seeders },
      formatScores,
      { title: movie.title, year: movie.year },
      indexerPriority
    );

    if (scoringResult.totalScore < this.AUTO_GRAB_THRESHOLD) {
      console.log(`RssMediaMonitor: Skipped ${release.title} for ${movie.title} (score ${scoringResult.totalScore} < ${this.AUTO_GRAB_THRESHOLD})`);
      return;
    }

    console.log(`RssMediaMonitor: Grabbing ${release.title} for ${movie.title} (score ${scoringResult.totalScore})`);
    await this.torrentManager.addTorrent({ magnetUrl: release.magnetUrl, movieId: movie.id });
  }

  private parseMovieTitle(title: string): { title: string; year?: number } | null {
    const normalized = title.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const yearMatch = normalized.match(/^(.*?)(?:\s+)(19\d{2}|20\d{2})(?:\s|$)/i);

    if (!yearMatch) {
      return null;
    }

    const parsedTitle = yearMatch[1]?.trim();
    const year = parseInt(yearMatch[2], 10);

    if (!parsedTitle) {
      return null;
    }

    return {
      title: parsedTitle,
      year: Number.isFinite(year) ? year : undefined,
    };
  }

  private resolveMovieAvailability(movie: any): string {
    if (this.metadataProvider?.getMovieAvailability) {
      return this.metadataProvider.getMovieAvailability({
        status: movie.status,
        inCinemas: movie.inCinemas,
        digitalRelease: movie.digitalRelease,
        physicalRelease: movie.physicalRelease,
        releaseDate: movie.releaseDate,
      });
    }

    if (String(movie.status ?? '').toLowerCase() === 'released') {
      return 'released';
    }

    return 'announced';
  }

  private meetsMinimumAvailability(minimumAvailability: string | null | undefined, availability: string): boolean {
    const minimum = String(minimumAvailability ?? 'released').toLowerCase();

    if (minimum === 'announced') {
      return true;
    }

    if (minimum === 'in_cinemas') {
      return ['in_cinemas', 'released', 'streaming'].includes(availability);
    }

    return ['released', 'streaming'].includes(availability);
  }
}
