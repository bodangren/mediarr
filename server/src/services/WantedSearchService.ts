import type { PrismaClient } from '@prisma/client';
import type { MediaSearchService, SearchCandidate } from './MediaSearchService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';

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
      await this.mediaSearchService.grabRelease(bestCandidate);

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

      await this.mediaSearchService.grabRelease(bestCandidate);

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
   * Triggers an automated search for all missing wanted media in the background.
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
        // Search missing movies
        const wantedMovies = await this.prisma.movie.findMany({
          where: { monitored: true, path: null },
          select: { id: true },
        });

        for (const movie of wantedMovies) {
          await this.autoSearchMovie(movie.id);
          // Small delay to prevent hammering indexers
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Search missing episodes
        const wantedEpisodes = await this.prisma.episode.findMany({
          where: { monitored: true, path: null },
          select: { id: true },
        });

        for (const episode of wantedEpisodes) {
          await this.autoSearchEpisode(episode.id);
          // Small delay to prevent hammering indexers
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        await this.activityEventEmitter.emit({
          eventType: 'SEARCH_EXECUTED',
          sourceModule: 'wanted-search-service',
          summary: 'Completed background automated search for all missing media',
          success: true,
          details: { moviesSearched: wantedMovies.length, episodesSearched: wantedEpisodes.length },
          occurredAt: new Date(),
        });
      } catch (err) {
        console.error('Failed during autoSearchAll', err);
      }
    });
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
