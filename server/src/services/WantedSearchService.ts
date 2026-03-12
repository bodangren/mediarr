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
   * Returns true when the given date (plus a 1-day grace period) is in the past,
   * meaning the content is considered available for searching.
   * When date is null we conservatively allow the search to proceed.
   */
  private isReleasedYet(date: Date | null): boolean {
    if (date === null) return true;
    const oneDayMs = 24 * 60 * 60 * 1000;
    return Date.now() >= date.getTime() + oneDayMs;
  }

  /**
   * Returns the earliest known public release date for a movie.
   * Prefers digital > physical > theatrical ordering by choosing the earliest date.
   * Returns null if none is set.
   */
  private getMovieReleaseDate(movie: {
    digitalRelease: Date | null;
    physicalRelease: Date | null;
    inCinemas: Date | null;
  }): Date | null {
    const candidates = [movie.digitalRelease, movie.physicalRelease, movie.inCinemas].filter(
      (d): d is Date => d !== null,
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((earliest, d) => (d < earliest ? d : earliest));
  }

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

    const releaseDate = this.getMovieReleaseDate(movie);
    if (!this.isReleasedYet(releaseDate)) {
      return this.logAndReturnSkip(movieId, 'movie', movie.title, 'Movie has not been released yet');
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
          `Best candidate score (${score}) is below threshold (${this.AUTO_GRAB_THRESHOLD})`,
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

    if (!this.isReleasedYet(episode.airDateUtc)) {
      return this.logAndReturnSkip(episode.id, 'episode', searchString, 'Episode has not aired yet');
    }

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

      // Filter candidates to only those that contain the requested episode number.
      // Indexers can return nearby or wrong episodes — we must validate before grabbing.
      const validCandidates = searchResult.releases.filter(r => {
        const parsed = Parser.parse(r.title);
        if (!parsed) return false; // unparseable title (e.g. season pack) — reject
        if (parsed.seasonNumber !== episode.seasonNumber) return false;
        if (!parsed.episodeNumbers.includes(episode.episodeNumber)) return false;
        return true;
      });

      if (validCandidates.length === 0) {
        return this.logAndReturnSkip(episodeId, 'episode', searchString, 'No valid candidates matching episode number');
      }

      const bestCandidate = validCandidates[0]!;
      const score = bestCandidate.customFormatScore ?? 0;

      if (score < this.AUTO_GRAB_THRESHOLD) {
        return this.logAndReturnSkip(
          episodeId,
          'episode',
          searchString,
          `Best candidate score (${score}) is below threshold (${this.AUTO_GRAB_THRESHOLD})`,
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

        // Fall back to individual episode searches — skip episodes that haven't aired yet
        for (const episode of missingEpisodes) {
          if (!this.isReleasedYet(episode.airDateUtc)) continue;
          await this.autoSearchEpisode(episode.id);
          await delay(2000);
        }
      }
    }

    // Specials are always searched individually (skipping pre-air ones)
    const specialsSeason = series.seasons.find(s => s.seasonNumber === 0);
    if (specialsSeason) {
      for (const episode of specialsSeason.episodes.filter(e => !e.path && this.isReleasedYet(e.airDateUtc))) {
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

        // Search missing movies — only include those whose earliest release date has passed
        const releaseCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const wantedMovies = await this.prisma.movie.findMany({
          where: {
            monitored: true,
            path: null,
            // Include movie when at least one release date is known and in the past,
            // OR when no release dates are set (unknown release status).
            OR: [
              {
                digitalRelease: null,
                physicalRelease: null,
                inCinemas: null,
              },
              { digitalRelease: { lte: releaseCutoff } },
              { physicalRelease: { lte: releaseCutoff } },
              { inCinemas: { lte: releaseCutoff } },
            ],
          },
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
    series: { id: number; title: string; tvdbId: number | null; qualityProfileId: number },
  ): Promise<boolean> {
    try {
      const searchResult = await this.mediaSearchService.searchAllIndexers({
        query: series.title,
        type: 'tvsearch',
        qualityProfileId: series.qualityProfileId,
        ...(series.tvdbId ? { tvdbId: series.tvdbId } : {}),
      });

      // Exclude individual episodes, single-season packs, and unrelated titles.
      // A season pack like "The.Sopranos.S01.Complete" has no episode number so
      // Parser.parse returns null — we must also check for a lone season marker.
      const candidates = searchResult.releases.filter(r => {
        const parsed = Parser.parse(r.title);
        if (parsed && parsed.episodeNumbers.length > 0) return false; // individual episode
        if (this.isSingleSeasonPack(r.title)) return false; // single-season pack
        if (!this.titlesMatch(r.title, series.title)) return false; // unrelated release
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
   * Returns true when a release title plausibly belongs to the given series.
   *
   * Strategy:
   *  1. Filter out unrendered template syntax (e.g. YTS Cardigann rendering bugs).
   *  2. Normalise both strings: lowercase, collapse non-alphanumeric to spaces.
   *  3. Build candidate variants of the series title by stripping a trailing year
   *     and/or a leading article (The, A, An) so that e.g. "The Sopranos" also
   *     matches releases titled "Sopranos Complete Series…".
   *  4. Require the normalised release title to START WITH one of these variants
   *     so that the series name appears at the beginning, not buried inside
   *     (e.g. "Wise Guy David Chase and the Sopranos" is correctly rejected).
   */
  private titlesMatch(releaseTitle: string, seriesTitle: string): boolean {
    // Reject unrendered Cardigann template syntax (indexer-side rendering bug)
    if (releaseTitle.includes('{{') || releaseTitle.includes('}}')) return false;

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const stripArticle = (s: string) => s.replace(/^(the|a|an) /, '');

    const normRelease = norm(releaseTitle);
    const base = norm(seriesTitle);
    const baseNoYear = base.replace(/ (19|20)\d{2}$/, '').trim();

    // Build unique non-empty variants: with/without year, with/without leading article
    const variants = [...new Set(
      [base, baseNoYear].flatMap(v => [v, stripArticle(v)]).filter(Boolean)
    )];

    return variants.some(v => normRelease.startsWith(v));
  }

  /**
   * Returns true if the release title looks like a single-season pack
   * (e.g. "Show.S01.Complete", "Show Season 2") rather than a complete series.
   * Titles with a lone season marker but no episode marker qualify.
   */
  private isSingleSeasonPack(title: string): boolean {
    // A range of seasons (e.g. S01-S05 or S01–S06) is a multi-season pack, not a
    // single-season pack — return false immediately so series-pack searches keep it.
    const hasSeasonRange = /S\d{1,2}\s*[-–]\s*S?\d{1,2}/i.test(title);
    if (hasSeasonRange) return false;

    // Has a season marker (S01, S1, Season 1, Season.1) but no episode marker (S01E01, E01)
    const hasSeason = /\bS\d{1,2}\b/i.test(title) || /\bSeason[.\s]*\d{1,2}\b/i.test(title);
    const hasEpisode = /S\d{1,2}E\d+/i.test(title) || /\bE\d{2,3}\b/i.test(title);
    return hasSeason && !hasEpisode;
  }

  /**
   * Searches for a season pack and grabs it if a good candidate is found.
   * Filters out individual episode releases.
   * Returns true if a pack was grabbed.
   */
  private async tryGrabSeasonPack(
    series: { id: number; title: string; tvdbId: number | null; qualityProfileId: number },
    seasonNumber: number,
  ): Promise<boolean> {
    const seasonLabel = `S${String(seasonNumber).padStart(2, '0')}`;
    try {
      const searchResult = await this.mediaSearchService.searchAllIndexers({
        query: `${series.title} ${seasonLabel}`,
        season: seasonNumber,
        type: 'tvsearch',
        qualityProfileId: series.qualityProfileId,
        ...(series.tvdbId ? { tvdbId: series.tvdbId } : {}),
      });

      // Exclude individual episodes and unrelated titles.
      const candidates = searchResult.releases.filter(r => {
        const parsed = Parser.parse(r.title);
        if (parsed && parsed.episodeNumbers.length > 0) return false; // individual episode
        if (!this.titlesMatch(r.title, series.title)) return false; // unrelated release
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
