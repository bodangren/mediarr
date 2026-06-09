import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { Movie, Series } from '../types/modelTypes';
import type { SeriesDetails } from '../services/MetadataProvider';

export interface UpsertMovieInput {
  tmdbId: number;
  imdbId?: string | undefined;
  title: string;
  cleanTitle: string;
  sortTitle: string;
  status: string;
  overview?: string | undefined;
  monitored: boolean;
  qualityProfileId: number;
  path?: string | undefined;
  year: number;
  posterUrl?: string | undefined;
  minimumAvailability?: string | undefined;
  inCinemas?: Date | undefined;
  digitalRelease?: Date | undefined;
  physicalRelease?: Date | undefined;
}

export interface UpsertSeriesInput {
  tvdbId: number;
  tmdbId?: number | undefined;
  imdbId?: string | undefined;
  title: string;
  cleanTitle: string;
  sortTitle: string;
  status: string;
  overview?: string | undefined;
  monitored: boolean;
  qualityProfileId: number;
  path?: string | undefined;
  year: number;
  network?: string | undefined;
  posterUrl?: string | undefined;
}

/**
 * Repository that stores shared media metadata and type-specific records.
 */
export class MediaRepository {
  constructor(private readonly prisma: DatabaseClient) {}

  async upsertMovie(input: UpsertMovieInput): Promise<Movie> {
    const mediaSet = {
      imdbId: input.imdbId ?? null,
      title: input.title,
      cleanTitle: input.cleanTitle,
      sortTitle: input.sortTitle,
      status: input.status,
      overview: input.overview ?? null,
      monitored: input.monitored,
      qualityProfileId: input.qualityProfileId,
      path: input.path ?? null,
      year: input.year,
      minimumAvailability: input.minimumAvailability ?? null,
      inCinemas: input.inCinemas ?? null,
      digitalRelease: input.digitalRelease ?? null,
      physicalRelease: input.physicalRelease ?? null,
    } as const;

    const [media] = await this.prisma.drizzle
      .insert(schema.media)
      .values({
        mediaType: 'MOVIE',
        tmdbId: input.tmdbId,
        ...mediaSet,
      })
      .onConflictDoUpdate({
        target: [schema.media.mediaType, schema.media.tmdbId],
        set: mediaSet,
      })
      .returning();
    if (!media) {
      throw new Error('MediaRepository.upsertMovie: media upsert returned no row');
    }

    const movieSet = {
      mediaId: media.id,
      imdbId: input.imdbId ?? null,
      title: input.title,
      cleanTitle: input.cleanTitle,
      sortTitle: input.sortTitle,
      status: input.status,
      overview: input.overview ?? null,
      monitored: input.monitored,
      qualityProfileId: input.qualityProfileId,
      path: input.path ?? null,
      year: input.year,
      posterUrl: input.posterUrl ?? null,
      minimumAvailability: input.minimumAvailability ?? null,
      inCinemas: input.inCinemas ?? null,
      digitalRelease: input.digitalRelease ?? null,
      physicalRelease: input.physicalRelease ?? null,
    } as const;

    const [movie] = await this.prisma.drizzle
      .insert(schema.movies)
      .values({
        tmdbId: input.tmdbId,
        ...movieSet,
      })
      .onConflictDoUpdate({
        target: schema.movies.tmdbId,
        set: movieSet,
      })
      .returning();
    if (!movie) {
      throw new Error('MediaRepository.upsertMovie: movie upsert returned no row');
    }
    return movie as Movie;
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
    const mediaSet = {
      tmdbId: input.tmdbId ?? null,
      imdbId: input.imdbId ?? null,
      title: input.title,
      cleanTitle: input.cleanTitle,
      sortTitle: input.sortTitle,
      status: input.status,
      overview: input.overview ?? null,
      monitored: input.monitored,
      qualityProfileId: input.qualityProfileId,
      path: input.path ?? null,
      year: input.year,
      network: input.network ?? null,
    } as const;

    const [media] = await this.prisma.drizzle
      .insert(schema.media)
      .values({
        mediaType: 'TV',
        tvdbId: input.tvdbId,
        ...mediaSet,
      })
      .onConflictDoUpdate({
        target: [schema.media.mediaType, schema.media.tvdbId],
        set: mediaSet,
      })
      .returning();
    if (!media) {
      throw new Error('MediaRepository.upsertSeries: media upsert returned no row');
    }

    const seriesSet = {
      mediaId: media.id,
      tmdbId: input.tmdbId ?? null,
      imdbId: input.imdbId ?? null,
      title: input.title,
      cleanTitle: input.cleanTitle,
      sortTitle: input.sortTitle,
      status: input.status,
      overview: input.overview ?? null,
      monitored: input.monitored,
      qualityProfileId: input.qualityProfileId,
      path: input.path ?? null,
      year: input.year,
      network: input.network ?? null,
      posterUrl: input.posterUrl ?? null,
    } as const;

    const [series] = await this.prisma.drizzle
      .insert(schema.series)
      .values({
        tvdbId: input.tvdbId,
        ...seriesSet,
      })
      .onConflictDoUpdate({
        target: schema.series.tvdbId,
        set: seriesSet,
      })
      .returning();
    if (!series) {
      throw new Error('MediaRepository.upsertSeries: series upsert returned no row');
    }
    return series as Series;
  }

  /**
   * Eagerly populate Season and Episode rows from SkyHook metadata.
   * Safe to call in a background Promise — errors should be caught by the caller.
   *
   * Uses a single Drizzle transaction so partial SkyHook payloads don't leave
   * the library in a half-imported state.
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

    const seasonIdMap = new Map<number, number>();

    await this.prisma.drizzle.transaction(async (tx) => {
      for (const s of seriesSeasons) {
        const seasonNumber = Number(s.seasonNumber);
        if (!Number.isFinite(seasonNumber)) {
          continue;
        }

        const [season] = await tx
          .insert(schema.seasons)
          .values({ seriesId, seasonNumber, monitored: true })
          .onConflictDoUpdate({
            target: [schema.seasons.seriesId, schema.seasons.seasonNumber],
            set: { monitored: true },
          })
          .returning();
        if (season?.id != null) {
          seasonIdMap.set(seasonNumber, Number(season.id));
        }
      }

      for (const ep of episodes) {
        const rawTvdbId = ep.tvdbId ?? ep.id;
        const tvdbId = rawTvdbId != null ? Number(rawTvdbId) : null;
        if (!tvdbId || !Number.isFinite(tvdbId)) {
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
        const title = ep.episodeName ?? ep.title ?? '';
        const overview = ep.overview ?? null;

        const episodeSet = {
          seasonId,
          seasonNumber,
          episodeNumber,
          title,
          airDateUtc,
          overview,
        } as const;

        await tx
          .insert(schema.episodes)
          .values({
            tvdbId,
            seriesId,
            ...episodeSet,
            monitored: true,
          })
          .onConflictDoUpdate({
            target: schema.episodes.tvdbId,
            set: episodeSet,
          });
      }
    });
  }
}
