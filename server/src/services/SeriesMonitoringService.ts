import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../errors/domainErrors';

/**
 * Valid monitoring strategy types for series/episodes.
 */
export type MonitoringType =
  | 'all'
  | 'none'
  | 'firstSeason'
  | 'lastSeason'
  | 'latestSeason'
  | 'pilotOnly'
  | 'monitored'
  | 'existing';

/**
 * Result of applying a monitoring strategy.
 */
export interface MonitoringResult {
  /** Number of episodes updated */
  updatedEpisodes: number;
  /** Total number of episodes in series */
  totalEpisodes: number;
  /** Series ID that was updated */
  seriesId: number;
}

/**
 * Episode with file information for monitoring calculations.
 */
interface EpisodeWithFiles {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  monitored: boolean;
  airDateUtc: Date | null;
  fileVariants: Array<{ id: number }>;
}

/**
 * Service for managing series monitoring strategies.
 * Implements the Season Pass functionality for bulk-configuration of episode monitoring.
 */
export class SeriesMonitoringService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Validates that the monitoring type is valid.
   */
  private isValidMonitoringType(type: string): type is MonitoringType {
    return [
      'all',
      'none',
      'firstSeason',
      'lastSeason',
      'latestSeason',
      'pilotOnly',
      'monitored',
      'existing',
    ].includes(type);
  }

  /**
   * Gets all episodes for a series with their file variants.
   */
  private async getEpisodesWithFiles(seriesId: number): Promise<EpisodeWithFiles[]> {
    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
      include: {
        fileVariants: {
          select: { id: true },
        },
      },
    });

    return episodes.map(ep => ({
      id: ep.id,
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber,
      monitored: ep.monitored,
      airDateUtc: ep.airDateUtc,
      fileVariants: ep.fileVariants,
    }));
  }

  /**
   * Determines which episodes should be monitored based on the strategy.
   */
  private determineMonitoredEpisodes(
    episodes: EpisodeWithFiles[],
    strategy: MonitoringType,
  ): Set<number> {
    const monitoredIds = new Set<number>();

    switch (strategy) {
      case 'all':
        // Monitor all episodes
        episodes.forEach(ep => monitoredIds.add(ep.id));
        break;

      case 'none':
        // Unmonitor all episodes - return empty set
        break;

      case 'firstSeason':
        // Monitor only season 1 episodes
        episodes
          .filter(ep => ep.seasonNumber === 1)
          .forEach(ep => monitoredIds.add(ep.id));
        break;

      case 'lastSeason': {
        // Monitor only the highest season number episodes
        const maxSeason = Math.max(...episodes.map(ep => ep.seasonNumber), 0);
        episodes
          .filter(ep => ep.seasonNumber === maxSeason)
          .forEach(ep => monitoredIds.add(ep.id));
        break;
      }

      case 'latestSeason': {
        // Monitor only the most recent season by air date
        // Find the season with the most recent aired episode
        const episodesWithDates = episodes.filter(
          ep => ep.airDateUtc !== null,
        );

        if (episodesWithDates.length === 0) {
          // If no air dates, fall back to highest season number
          const maxSeason = Math.max(...episodes.map(ep => ep.seasonNumber), 0);
          episodes
            .filter(ep => ep.seasonNumber === maxSeason)
            .forEach(ep => monitoredIds.add(ep.id));
        } else {
          // Find the season with the most recent air date
          const latestDate = Math.max(
            ...episodesWithDates.map(ep => ep.airDateUtc!.getTime()),
          );
          const latestSeasons = new Set(
            episodesWithDates
              .filter(ep => ep.airDateUtc!.getTime() === latestDate)
              .map(ep => ep.seasonNumber),
          );
          // Use the highest season number among those with latest air date
          const latestSeason = Math.max(...latestSeasons, 0);
          episodes
            .filter(ep => ep.seasonNumber === latestSeason)
            .forEach(ep => monitoredIds.add(ep.id));
        }
        break;
      }

      case 'pilotOnly':
        // Monitor only S01E01
        episodes
          .filter(ep => ep.seasonNumber === 1 && ep.episodeNumber === 1)
          .forEach(ep => monitoredIds.add(ep.id));
        break;

      case 'monitored':
        // Keep current monitored state - no changes
        episodes.filter(ep => ep.monitored).forEach(ep => monitoredIds.add(ep.id));
        break;

      case 'existing':
        // Monitor only episodes that have files on disk
        episodes
          .filter(ep => ep.fileVariants.length > 0)
          .forEach(ep => monitoredIds.add(ep.id));
        break;
    }

    return monitoredIds;
  }

  /**
   * Applies a monitoring strategy to all episodes of a series.
   *
   * @param seriesId - The ID of the series to update
   * @param strategy - The monitoring strategy to apply
   * @returns Promise<MonitoringResult> - Result with count of updated episodes
   */
  async applyMonitoringStrategy(
    seriesId: number,
    strategy: MonitoringType,
  ): Promise<MonitoringResult> {
    // Validate strategy
    if (!this.isValidMonitoringType(strategy)) {
      throw new ValidationError(`Invalid monitoring type: ${strategy}`, {
        validTypes: [
          'all',
          'none',
          'firstSeason',
          'lastSeason',
          'latestSeason',
          'pilotOnly',
          'monitored',
          'existing',
        ],
      });
    }

    // Verify series exists
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundError(`Series with ID ${seriesId} not found`);
    }

    // Get all episodes with file information
    const episodes = await this.getEpisodesWithFiles(seriesId);

    if (episodes.length === 0) {
      return {
        updatedEpisodes: 0,
        totalEpisodes: 0,
        seriesId,
      };
    }

    // Determine which episodes should be monitored
    const monitoredIds = this.determineMonitoredEpisodes(episodes, strategy);

    // Find episodes that need to be updated
    const updates: Array<{ id: number; shouldMonitor: boolean }> = [];

    for (const episode of episodes) {
      const shouldMonitor = monitoredIds.has(episode.id);
      if (episode.monitored !== shouldMonitor) {
        updates.push({ id: episode.id, shouldMonitor });
      }
    }

    // Apply updates in a transaction
    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map(update =>
          this.prisma.episode.update({
            where: { id: update.id },
            data: { monitored: update.shouldMonitor },
          }),
        ),
      );
    }

    return {
      updatedEpisodes: updates.length,
      totalEpisodes: episodes.length,
      seriesId,
    };
  }

  /**
   * Gets the current monitoring state for a series.
   * Returns episode counts per season with monitoring status.
   */
  async getSeriesMonitoringState(seriesId: number): Promise<{
    seriesId: number;
    seriesMonitored: boolean;
    seasons: Array<{
      seasonNumber: number;
      totalEpisodes: number;
      monitoredEpisodes: number;
      episodesWithFiles: number;
    }>;
  }> {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        seasons: {
          include: {
            episodes: {
              include: {
                fileVariants: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!series) {
      throw new NotFoundError(`Series with ID ${seriesId} not found`);
    }

    const seasons = series.seasons.map(season => ({
      seasonNumber: season.seasonNumber,
      totalEpisodes: season.episodes.length,
      monitoredEpisodes: season.episodes.filter(ep => ep.monitored).length,
      episodesWithFiles: season.episodes.filter(
        ep => ep.fileVariants.length > 0,
      ).length,
    }));

    return {
      seriesId,
      seriesMonitored: series.monitored,
      seasons,
    };
  }
}
