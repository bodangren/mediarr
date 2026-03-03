import type { PrismaClient } from '@prisma/client';
import type { MediaSearchService, SearchCandidate } from './MediaSearchService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';
import { Parser } from '../utils/Parser';

export interface AutoSearchResult {
  success: boolean;
  release?: SearchCandidate;
  reason?: string;
}

export class WantedSearchService {
  // Score threshold required to automatically grab a release
  private readonly AUTO_GRAB_THRESHOLD = 50;

  constructor(
    private readonly mediaSearchService: MediaSearchService,
    private readonly prisma: PrismaClient,
    private readonly activityEventEmitter: ActivityEventEmitter,
  ) {}

  /**
   * Triggers an automated search for a specific movie.
   */
  async autoSearchMovie(movieId: number): Promise<AutoSearchResult> {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      return { success: false, reason: 'Movie not found' };
    }

    try {
      const searchResult = await this.mediaSearchService.searchAllIndexers({
        title: movie.title,
        year: movie.year,
        type: 'movie',
        qualityProfileId: movie.qualityProfileId,
      });

      if (searchResult.releases.length === 0) {
        return this.logAndReturnSkip(movieId, 'movie', movie.title, 'No releases found');
      }

      // The releases are already sorted by `searchAllIndexers` using `compareReleasesForRanking`
      // The best candidate is the first one.
      const bestCandidate = searchResult.releases[0]!;

      // Check if it meets the minimum threshold
      const score = bestCandidate.customFormatScore ?? 0;
      if (score < this.AUTO_GRAB_THRESHOLD) {
         return this.logAndReturnSkip(
           movieId, 
           'movie', 
           movie.title, 
           `Best candidate score (${score}) is below threshold (${this.AUTO_GRAB_THRESHOLD})`
         );
      }

      // Grab the release
      await this.mediaSearchService.grabRelease(bestCandidate, { movieId });

      await this.activityEventEmitter.emit({
        eventType: 'RELEASE_GRABBED',
        sourceModule: 'wanted-search-service',
        summary: `Automated grab successful for movie: ${movie.title}`,
        success: true,
        details: {
          movieId,
          candidate: bestCandidate.title,
          score,
        },
        occurredAt: new Date(),
      });

      return { success: true, release: bestCandidate };

    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      return this.logAndReturnSkip(movieId, 'movie', movie.title, `Search failed: ${reason}`);
    }
  }

  /**
   * Triggers an automated search for a specific episode.
   */
  async autoSearchEpisode(episodeId: number): Promise<AutoSearchResult> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        season: {
          include: {
            series: true,
          }
        }
      }
    });

    if (!episode || !episode.season || !episode.season.series) {
      return { success: false, reason: 'Episode or Series not found' };
    }

    const series = episode.season.series;
    const searchString = `${series.title} S${episode.seasonNumber.toString().padStart(2, '0')}E${episode.episodeNumber.toString().padStart(2, '0')}`;

    try {
      const searchResult = await this.mediaSearchService.searchAllIndexers({
        query: searchString,
        season: episode.seasonNumber,
        episode: episode.episodeNumber,
        type: 'tvsearch',
        qualityProfileId: series.qualityProfileId,
      });

      if (searchResult.releases.length === 0) {
        return this.logAndReturnSkip(episodeId, 'episode', searchString, 'No releases found');
      }

      const bestCandidate = searchResult.releases[0]!;
      const score = bestCandidate.customFormatScore ?? 0;

      if (score < this.AUTO_GRAB_THRESHOLD) {
         return this.logAndReturnSkip(
           episodeId, 
           'episode', 
           searchString, 
           `Best candidate score (${score}) is below threshold (${this.AUTO_GRAB_THRESHOLD})`
         );
      }

      await this.mediaSearchService.grabRelease(bestCandidate, { episodeId });

      await this.activityEventEmitter.emit({
        eventType: 'RELEASE_GRABBED',
        sourceModule: 'wanted-search-service',
        summary: `Automated grab successful for episode: ${searchString}`,
        success: true,
        details: {
          episodeId,
          candidate: bestCandidate.title,
          score,
        },
        occurredAt: new Date(),
      });

      return { success: true, release: bestCandidate };

    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      return this.logAndReturnSkip(episodeId, 'episode', searchString, `Search failed: ${reason}`);
    }
  }

  /**
   * Triggers an automated search for all missing episodes in a specific series.
   *
   * Priority order:
   *  1. Complete series pack — when the series is ended and has missing episodes
   *  2. Complete season pack — when all episodes in a season have aired
   *  3. Individual episode — fallback for in-progress seasons or when packs aren't found
   *
   * Specials (season 0) are always searched individually.
   */
  async autoSearchSeries(seriesId: number): Promise<void> {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        seasons: {
          where: { monitored: true },
          include: {
            episodes: {
              where: { monitored: true },
              select: { id: true, episodeNumber: true, airDateUtc: true, path: true },
              orderBy: { episodeNumber: 'asc' },
            },
          },
          orderBy: { seasonNumber: 'asc' },
        },
      },
    });

    if (!series) return;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const regularSeasons = series.seasons.filter(s => s.seasonNumber > 0);
    const seasonsWithMissing = regularSeasons.filter(s => s.episodes.some(e => !e.path));

    if (seasonsWithMissing.length === 0) {
      // Nothing missing in regular seasons — still handle specials below
    } else {
      // For ended series, try a complete series pack first
      if (series.status === 'Ended') {
        const grabbed = await this.tryGrabSeriesPack(series);
        if (grabbed) return;
      }

      // Per-season strategy
      for (const season of seasonsWithMissing) {
        const missingEpisodes = season.episodes.filter(e => !e.path);

        if (this.isSeasonComplete(season.episodes)) {
          // All episodes have aired — prefer a season pack
          const grabbed = await this.tryGrabSeasonPack(series, season.seasonNumber);
          if (grabbed) {
            await delay(2000);
            continue;
          }
        }

        // Fall back to individual episode searches
        for (const episode of missingEpisodes) {
          await this.autoSearchEpisode(episode.id);
          await delay(2000);
        }
      }
    }

    // Specials are always searched individually
    const specialsSeason = series.seasons.find(s => s.seasonNumber === 0);
    if (specialsSeason) {
      for (const episode of specialsSeason.episodes.filter(e => !e.path)) {
        await this.autoSearchEpisode(episode.id);
        await delay(2000);
      }
    }
  }

  /**
   * Triggers an automated search for all missing wanted media in the background.
   * TV series use smart pack-first logic via autoSearchSeries.
   */
  async autoSearchAll(): Promise<void> {
    this.activityEventEmitter.emit({
      eventType: 'SEARCH_EXECUTED',
      sourceModule: 'wanted-search-service',
      summary: 'Started background automated search for all missing media',
      success: true,
      details: {},
      occurredAt: new Date(),
    }).catch(console.error);

    // Fire and forget background process
    Promise.resolve().then(async () => {
      try {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Search missing movies
        const wantedMovies = await this.prisma.movie.findMany({
          where: { monitored: true, path: null },
          select: { id: true },
        });

        for (const movie of wantedMovies) {
          await this.autoSearchMovie(movie.id);
          await delay(2000);
        }

        // Group by series and use smart pack logic
        const seriesWithMissing = await this.prisma.series.findMany({
          where: {
            monitored: true,
            episodes: { some: { monitored: true, path: null } },
          },
          select: { id: true },
        });

        for (const series of seriesWithMissing) {
          await this.autoSearchSeries(series.id);
          await delay(2000);
        }

        await this.activityEventEmitter.emit({
          eventType: 'SEARCH_EXECUTED',
          sourceModule: 'wanted-search-service',
          summary: 'Completed background automated search for all missing media',
          success: true,
          details: { moviesSearched: wantedMovies.length, seriesSearched: seriesWithMissing.length },
          occurredAt: new Date(),
        });
      } catch (err) {
        console.error('Failed during autoSearchAll', err);
      }
    });
  }

  /**
   * Returns true when all episodes in a season have an air date in the past,
   * meaning the season has fully aired and is a candidate for a season pack.
   */
  private isSeasonComplete(episodes: Array<{ airDateUtc: Date | null }>): boolean {
    if (episodes.length === 0) return false;
    const now = new Date();
    return episodes.every(ep => ep.airDateUtc !== null && ep.airDateUtc <= now);
  }

  /**
   * Searches for a complete series pack and grabs it if a good candidate is found.
   * Filters out individual episode and single-season releases.
   * Returns true if a pack was grabbed.
   */
  private async tryGrabSeriesPack(
    series: { id: number; title: string; qualityProfileId: number },
  ): Promise<boolean> {
    try {
      const searchResult = await this.mediaSearchService.searchAllIndexers({
        query: series.title,
        type: 'tvsearch',
        qualityProfileId: series.qualityProfileId,
      });

      // Exclude individual episodes AND single-season packs.
      // A season pack like "The.Sopranos.S01.Complete" has no episode number so
      // Parser.parse returns null — we must also check for a lone season marker.
      const candidates = searchResult.releases.filter(r => {
        const parsed = Parser.parse(r.title);
        if (parsed && parsed.episodeNumbers.length > 0) return false; // individual episode
        if (this.isSingleSeasonPack(r.title)) return false; // single-season pack
        return true;
      });

      if (candidates.length === 0) return false;

      const best = candidates[0]!;
      const score = best.customFormatScore ?? 0;
      if (score < this.AUTO_GRAB_THRESHOLD) return false;

      await this.mediaSearchService.grabRelease(best);
      await this.activityEventEmitter.emit({
        eventType: 'RELEASE_GRABBED',
        sourceModule: 'wanted-search-service',
        summary: `Grabbed complete series pack: ${series.title}`,
        success: true,
        details: { seriesId: series.id, candidate: best.title, score, packType: 'series' },
        occurredAt: new Date(),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns true if the release title looks like a single-season pack
   * (e.g. "Show.S01.Complete", "Show Season 2") rather than a complete series.
   * Titles with a lone season marker but no episode marker qualify.
   */
  private isSingleSeasonPack(title: string): boolean {
    // Has a season marker (S01, S1, Season 1) but no episode marker (S01E01, E01)
    const hasSeason = /\bS\d{1,2}\b/i.test(title) || /\bSeason\s*\d{1,2}\b/i.test(title);
    const hasEpisode = /S\d{1,2}E\d+/i.test(title) || /\bE\d{2,3}\b/i.test(title);
    return hasSeason && !hasEpisode;
  }

  /**
   * Searches for a season pack and grabs it if a good candidate is found.
   * Filters out individual episode releases.
   * Returns true if a pack was grabbed.
   */
  private async tryGrabSeasonPack(
    series: { id: number; title: string; qualityProfileId: number },
    seasonNumber: number,
  ): Promise<boolean> {
    const seasonLabel = `S${String(seasonNumber).padStart(2, '0')}`;
    try {
      const searchResult = await this.mediaSearchService.searchAllIndexers({
        query: `${series.title} ${seasonLabel}`,
        season: seasonNumber,
        type: 'tvsearch',
        qualityProfileId: series.qualityProfileId,
      });

      // Exclude individual episode results
      const candidates = searchResult.releases.filter(r => {
        const parsed = Parser.parse(r.title);
        return !(parsed && parsed.episodeNumbers.length > 0);
      });

      if (candidates.length === 0) return false;

      const best = candidates[0]!;
      const score = best.customFormatScore ?? 0;
      if (score < this.AUTO_GRAB_THRESHOLD) return false;

      await this.mediaSearchService.grabRelease(best);
      await this.activityEventEmitter.emit({
        eventType: 'RELEASE_GRABBED',
        sourceModule: 'wanted-search-service',
        summary: `Grabbed season pack: ${series.title} ${seasonLabel}`,
        success: true,
        details: { seriesId: series.id, seasonNumber, candidate: best.title, score, packType: 'season' },
        occurredAt: new Date(),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper to log skipped automated searches
   */
  private async logAndReturnSkip(mediaId: number, type: 'movie' | 'episode', title: string, reason: string): Promise<AutoSearchResult> {
    await this.activityEventEmitter.emit({
      eventType: 'SEARCH_EXECUTED', // using existing event type
      sourceModule: 'wanted-search-service',
      summary: `Automated search skipped for ${title}: ${reason}`,
      success: false,
      details: {
        mediaId,
        mediaType: type,
        reason,
      },
      occurredAt: new Date(),
    });

    return { success: false, reason };
  }
}
