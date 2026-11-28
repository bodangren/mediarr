import { buildTMDBRequest } from '../utils/tmdbUtils';
import type { DatabaseClient } from '../db/drizzleClient';
import type { HttpClient } from '../indexers/HttpClient';
import type { SettingsService } from './SettingsService';
import { ValidationError, ProviderUnavailableError } from '../errors/domainErrors';

/**
 * "Similar" titles for movie/series detail pages (owner request 2026-11-28): the owner wants to see
 * TMDB's related titles *with availability*, so a missing one can be requested from the same screen.
 *
 * TMDB only; availability is resolved against the local library by TMDB id. A similar entry that is
 * already in the library carries its `libraryId` so the client can deep-link instead of requesting.
 */
export type SimilarMediaType = 'MOVIE' | 'SERIES';

export interface SimilarTitle {
  mediaType: SimilarMediaType;
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
  voteAverage: number | null;
  /** The library already has this title (match by TMDB id). */
  inLibrary: boolean;
  /** Movie or series row id when `inLibrary`. */
  libraryId: number | null;
}

interface TMDBMovieResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string | null;
  vote_average?: number;
}

interface TMDBListResponse {
  results?: TMDBMovieResult[];
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function yearOf(value: string | undefined | null): number | null {
  if (!value) return null;
  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isInteger(year) && year > 0 ? year : null;
}

function posterUrl(pathValue: string | null | undefined): string | null {
  return pathValue ? `https://image.tmdb.org/t/p/w342${pathValue}` : null;
}

export class SimilarTitlesService {
  constructor(
    private readonly prisma: DatabaseClient,
    private readonly httpClient: HttpClient,
    private readonly settingsService: SettingsService,
  ) {}

  async similarMovies(movieId: number, limit = 12): Promise<SimilarTitle[]> {
    const movie = await (this.prisma as any).movie?.findUnique({
      where: { id: movieId },
      select: { tmdbId: true },
    }) as { tmdbId: number | null } | undefined;
    if (!movie || !movie.tmdbId) {
      throw new ValidationError('Movie has no TMDB id; similar titles need one');
    }
    return this.annotate('MOVIE', await this.fetchRecommendations(`/movie/${movie.tmdbId}`), limit);
  }

  async similarSeries(seriesId: number, limit = 12): Promise<SimilarTitle[]> {
    const series = await (this.prisma as any).series?.findUnique({
      where: { id: seriesId },
      select: { tvdbId: true, tmdbId: true } as any,
    }) as { tvdbId: number | null; tmdbId?: number | null } | undefined;
    if (!series) {
      throw new ValidationError(`Series ${seriesId} not found`);
    }
    // Series rows are added through TVDB, so `tmdbId` is often null: resolve it from the TVDB id
    // through TMDB's external-source find (read-only; the row is not rewritten by a read path).
    let tmdbId = (series as { tmdbId?: number | null }).tmdbId ?? null;
    if (!tmdbId && series.tvdbId) {
      tmdbId = await this.resolveTmdbIdFromTvdb(series.tvdbId);
    }
    if (!tmdbId) {
      throw new ValidationError('Series has no TMDB id; similar titles need one');
    }
    return this.annotate('SERIES', await this.fetchRecommendations(`/tv/${tmdbId}`), limit);
  }

  private async resolveTmdbIdFromTvdb(tvdbId: number): Promise<number | null> {
    const settings = await this.settingsService.get();
    const apiKey = settings.apiKeys?.tmdbApiKey;
    if (!apiKey) {
      throw new ValidationError('TMDB API Key is missing. Please configure it in settings.');
    }
    const request = buildTMDBRequest(
      TMDB_BASE_URL,
      `/find/${tvdbId}`,
      apiKey,
      ['external_source=tvdb_id'],
    );
    const response = await this.httpClient.get(request.url, { headers: request.headers });
    if (!response.ok) return null;
    const body = JSON.parse(response.body) as { tv_results?: Array<{ id?: number }> };
    const found = body.tv_results?.[0]?.id;
    return typeof found === 'number' && found > 0 ? found : null;
  }

  /**
   * TMDB's `/similar` is often weak (it can return unrelated foreign titles for a well-known show),
   * while `/recommendations` is the good signal. Use recommendations first, then append the similar
   * results that are not already listed — one grid, deduped, recommendations winning.
   */
  private async fetchRecommendations(basePath: string): Promise<TMDBMovieResult[]> {
    const [recommended, similar] = await Promise.all([
      this.fetchList(`${basePath}/recommendations`),
      this.fetchList(`${basePath}/similar`).catch(() => [] as TMDBMovieResult[]),
    ]);
    const seen = new Set(recommended.map((row) => row.id));
    return [...recommended, ...similar.filter((row) => !seen.has(row.id))];
  }

  private async fetchList(path: string): Promise<TMDBMovieResult[]> {
    const settings = await this.settingsService.get();
    const apiKey = settings.apiKeys?.tmdbApiKey;
    if (!apiKey) {
      throw new ValidationError('TMDB API Key is missing. Please configure it in settings.');
    }
    const request = buildTMDBRequest(TMDB_BASE_URL, path, apiKey, ['page=1']);
    const response = await this.httpClient.get(request.url, { headers: request.headers });
    if (!response.ok) {
      throw new ProviderUnavailableError(`Failed to fetch similar titles from TMDB: ${response.status}`);
    }
    return (JSON.parse(response.body) as TMDBListResponse).results ?? [];
  }

  /** Resolve library availability in one query per media type, then map the TMDB rows. */
  private async annotate(
    mediaType: SimilarMediaType,
    rows: TMDBMovieResult[],
    limit: number,
  ): Promise<SimilarTitle[]> {
    const selected = rows.slice(0, Math.max(1, limit));
    const ids = selected.map((row) => row.id).filter((id) => Number.isInteger(id) && id > 0);
    const inLibrary = new Map<number, number>();
    if (ids.length > 0) {
      const table = mediaType === 'MOVIE' ? (this.prisma as any).movie : (this.prisma as any).series;
      const found = (await table?.findMany?.({
        where: { tmdbId: { in: ids } },
        select: { id: true, tmdbId: true },
      })) as Array<{ id: number; tmdbId: number | null }> | undefined;
      for (const row of found ?? []) {
        if (row.tmdbId !== null) inLibrary.set(row.tmdbId, row.id);
      }
    }
    return selected.map((row) => {
      const year = yearOf(row.release_date ?? row.first_air_date ?? null);
      const libraryId = inLibrary.get(row.id) ?? null;
      return {
        mediaType,
        tmdbId: row.id,
        title: (row.title ?? row.name ?? '').trim(),
        year,
        posterUrl: posterUrl(row.poster_path),
        overview: row.overview ?? null,
        voteAverage: typeof row.vote_average === 'number' ? row.vote_average : null,
        inLibrary: libraryId !== null,
        libraryId,
      };
    }).filter((row) => row.title.length > 0);
  }
}
