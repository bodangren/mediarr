import type { PrismaClient, Movie, Series } from '@prisma/client';
import type { SeriesDetails } from '../services/MetadataProvider';

export interface UpsertMovieInput {
  tmdbId: number;
  imdbId?: string;
  title: string;
  cleanTitle: string;
  sortTitle: string;
  status: string;
  overview?: string;
  monitored: boolean;
  qualityProfileId: number;
  path?: string;
  year: number;
  posterUrl?: string;
  minimumAvailability?: string;
  inCinemas?: Date;
  digitalRelease?: Date;
  physicalRelease?: Date;
}

export interface UpsertSeriesInput {
  tvdbId: number;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  cleanTitle: string;
  sortTitle: string;
  status: string;
  overview?: string;
  monitored: boolean;
  qualityProfileId: number;
  path?: string;
  year: number;
  network?: string;
  posterUrl?: string;
}

/**
 * Repository that stores shared media metadata and type-specific records.
 */
export class MediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertMovie(input: UpsertMovieInput): Promise<Movie> {
    const media = await this.prisma.media.upsert({
      where: {
        mediaType_tmdbId: {
          mediaType: 'MOVIE',
          tmdbId: input.tmdbId,
        },
      },
      update: {
        imdbId: input.imdbId,
        title: input.title,
        cleanTitle: input.cleanTitle,
        sortTitle: input.sortTitle,
        status: input.status,
        overview: input.overview,
        monitored: input.monitored,
        qualityProfileId: input.qualityProfileId,
        path: input.path,
        year: input.year,
        minimumAvailability: input.minimumAvailability,
        inCinemas: input.inCinemas,
        digitalRelease: input.digitalRelease,
        physicalRelease: input.physicalRelease,
      },
      create: {
        mediaType: 'MOVIE',
        tmdbId: input.tmdbId,
        imdbId: input.imdbId,
        title: input.title,
        cleanTitle: input.cleanTitle,
        sortTitle: input.sortTitle,
        status: input.status,
        overview: input.overview,
        monitored: input.monitored,
        qualityProfileId: input.qualityProfileId,
        path: input.path,
        year: input.year,
        minimumAvailability: input.minimumAvailability,
        inCinemas: input.inCinemas,
        digitalRelease: input.digitalRelease,
        physicalRelease: input.physicalRelease,
      },
    });

    return this.prisma.movie.upsert({
      where: { tmdbId: input.tmdbId },
      update: {
        mediaId: media.id,
        imdbId: input.imdbId,
        title: input.title,
        cleanTitle: input.cleanTitle,
        sortTitle: input.sortTitle,
        status: input.status,
        overview: input.overview,
        monitored: input.monitored,
        qualityProfileId: input.qualityProfileId,
        path: input.path,
        year: input.year,
        posterUrl: input.posterUrl,
        minimumAvailability: input.minimumAvailability,
        inCinemas: input.inCinemas,
        digitalRelease: input.digitalRelease,
        physicalRelease: input.physicalRelease,
      },
      create: {
        mediaId: media.id,
        tmdbId: input.tmdbId,
        imdbId: input.imdbId,
        title: input.title,
        cleanTitle: input.cleanTitle,
        sortTitle: input.sortTitle,
        status: input.status,
        overview: input.overview,
        monitored: input.monitored,
        qualityProfileId: input.qualityProfileId,
        path: input.path,
        year: input.year,
        posterUrl: input.posterUrl,
        minimumAvailability: input.minimumAvailability,
        inCinemas: input.inCinemas,
        digitalRelease: input.digitalRelease,
        physicalRelease: input.physicalRelease,
      },
    });
  }

  async findMovieByTmdbId(tmdbId: number): Promise<(Movie & { media: any }) | null> {
    return this.prisma.movie.findUnique({
      where: { tmdbId },
      include: { media: true },
    }) as Promise<(Movie & { media: any }) | null>;
  }

  async findSeriesByTvdbId(tvdbId: number): Promise<(Series & { media: any }) | null> {
    return this.prisma.series.findUnique({
      where: { tvdbId },
      include: { media: true },
    }) as Promise<(Series & { media: any }) | null>;
  }

  async upsertSeries(input: UpsertSeriesInput): Promise<Series> {
    const media = await this.prisma.media.upsert({
      where: {
        mediaType_tvdbId: {
          mediaType: 'TV',
          tvdbId: input.tvdbId,
        },
      },
      update: {
        tmdbId: input.tmdbId,
        imdbId: input.imdbId,
        title: input.title,
        cleanTitle: input.cleanTitle,
        sortTitle: input.sortTitle,
        status: input.status,
        overview: input.overview,
        monitored: input.monitored,
        qualityProfileId: input.qualityProfileId,
        path: input.path,
        year: input.year,
        network: input.network,
      },
      create: {
        mediaType: 'TV',
        tvdbId: input.tvdbId,
        tmdbId: input.tmdbId,
        imdbId: input.imdbId,
        title: input.title,
        cleanTitle: input.cleanTitle,
        sortTitle: input.sortTitle,
        status: input.status,
        overview: input.overview,
        monitored: input.monitored,
        qualityProfileId: input.qualityProfileId,
        path: input.path,
        year: input.year,
        network: input.network,
      },
    });

    return this.prisma.series.upsert({
      where: { tvdbId: input.tvdbId },
      update: {
        mediaId: media.id,
        tmdbId: input.tmdbId,
        imdbId: input.imdbId,
        title: input.title,
        cleanTitle: input.cleanTitle,
        sortTitle: input.sortTitle,
        status: input.status,
        overview: input.overview,
        monitored: input.monitored,
        qualityProfileId: input.qualityProfileId,
        path: input.path,
        year: input.year,
        network: input.network,
        posterUrl: input.posterUrl,
      },
      create: {
        mediaId: media.id,
        tvdbId: input.tvdbId,
        tmdbId: input.tmdbId,
        imdbId: input.imdbId,
        title: input.title,
        cleanTitle: input.cleanTitle,
        sortTitle: input.sortTitle,
        status: input.status,
        overview: input.overview,
        monitored: input.monitored,
        qualityProfileId: input.qualityProfileId,
        path: input.path,
        year: input.year,
        network: input.network,
        posterUrl: input.posterUrl,
      },
    });
  }

  /**
   * Eagerly populate Season and Episode rows from SkyHook metadata.
   * Safe to call in a background Promise — errors should be caught by the caller.
   */
  async upsertSeasonsAndEpisodes(seriesId: number, details: SeriesDetails): Promise<void> {
    const episodes: any[] = details.episodes ?? [];

    if (episodes.length === 0) {
      return;
    }

    // Collect unique season numbers from episodes (SkyHook may return an empty
    // seasons array even when episodes exist).
    const seasonNumbersFromEpisodes = [
      ...new Set(episodes.map((ep: any) => Number(ep.seasonNumber))),
    ].filter((n) => Number.isFinite(n));

    const seriesSeasons: Array<{ seasonNumber: number }> =
      Array.isArray(details.series.seasons) && details.series.seasons.length > 0
        ? details.series.seasons
        : seasonNumbersFromEpisodes.map((n) => ({ seasonNumber: n }));

    // Upsert each season and build a map from seasonNumber → season id.
    const seasonIdMap = new Map<number, number>();
    for (const s of seriesSeasons) {
      const seasonNumber = Number(s.seasonNumber);
      if (!Number.isFinite(seasonNumber)) {
        continue;
      }

      const season = await (this.prisma as any).season.upsert({
        where: {
          seriesId_seasonNumber: { seriesId, seasonNumber },
        },
        update: {},
        create: {
          seriesId,
          seasonNumber,
          monitored: true,
        },
      });

      seasonIdMap.set(seasonNumber, season.id);
    }

    // Upsert each episode.
    for (const ep of episodes) {
      const rawTvdbId = ep.tvdbId ?? ep.id;
      const tvdbId = rawTvdbId != null ? Number(rawTvdbId) : null;
      if (!tvdbId || !Number.isFinite(tvdbId)) {
        // Skip episodes without a valid TVDB id.
        continue;
      }

      const seasonNumber = Number(ep.seasonNumber);
      const episodeNumber = Number(ep.episodeNumber);
      const seasonId = seasonIdMap.get(seasonNumber) ?? null;
      const rawAirDate = ep.airDate ?? ep.firstAired;
      const airDateUtc =
        rawAirDate && typeof rawAirDate === 'string' && rawAirDate.trim() !== ''
          ? new Date(rawAirDate)
          : null;

      await (this.prisma as any).episode.upsert({
        where: { tvdbId },
        update: {
          seasonId,
          seasonNumber,
          episodeNumber,
          title: ep.episodeName ?? ep.title ?? '',
          airDateUtc,
          overview: ep.overview ?? null,
        },
        create: {
          tvdbId,
          seriesId,
          seasonId,
          seasonNumber,
          episodeNumber,
          title: ep.episodeName ?? ep.title ?? '',
          airDateUtc,
          overview: ep.overview ?? null,
          monitored: true,
        },
      });
    }
  }
}
