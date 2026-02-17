import type { HttpClient } from '../../indexers/HttpClient';
import type { SettingsService } from '../SettingsService';
import type { ImportListProvider, ImportListItem } from './ImportListProvider';

export interface TMDBPopularConfig {
  mediaType?: 'movie' | 'series' | 'both';
  limit?: number;
}

export class TMDBPopularProvider implements ImportListProvider {
  readonly type = 'tmdb-popular';
  readonly name = 'TMDB Popular';

  private readonly baseUrl = 'https://api.themoviedb.org/3';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly settingsService: SettingsService,
  ) {}

  validateConfig(config: Record<string, unknown>): boolean {
    const mediaType = config.mediaType as string | undefined;
    if (mediaType && !['movie', 'series', 'both'].includes(mediaType)) {
      return false;
    }
    const limit = config.limit;
    if (limit !== undefined && (typeof limit !== 'number' || limit <= 0 || limit > 100)) {
      return false;
    }
    return true;
  }

  async fetch(config: Record<string, unknown>): Promise<ImportListItem[]> {
    const settings = await this.settingsService.get();
    const apiKey = settings.apiKeys.tmdbApiKey;

    if (!apiKey) {
      throw new Error('TMDB API Key is missing. Please configure it in settings.');
    }

    const tmdbConfig: TMDBPopularConfig = {
      mediaType: (config.mediaType as TMDBPopularConfig['mediaType']) ?? 'movie',
      limit: (config.limit as number) ?? 20,
    };

    const items: ImportListItem[] = [];

    if (tmdbConfig.mediaType === 'movie' || tmdbConfig.mediaType === 'both') {
      const movies = await this.fetchPopularMovies(apiKey, tmdbConfig.limit!);
      items.push(...movies);
    }

    if (tmdbConfig.mediaType === 'series' || tmdbConfig.mediaType === 'both') {
      const series = await this.fetchPopularSeries(apiKey, tmdbConfig.limit!);
      items.push(...series);
    }

    return items;
  }

  private async fetchPopularMovies(apiKey: string, limit: number): Promise<ImportListItem[]> {
    const items: ImportListItem[] = [];
    let page = 1;
    const totalPages = Math.ceil(limit / 20);

    while (items.length < limit && page <= totalPages) {
      const url = `${this.baseUrl}/movie/popular?api_key=${encodeURIComponent(apiKey)}&page=${page}`;
      const response = await this.httpClient.get(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch popular movies: ${response.status} ${response.body}`);
      }

      const data = JSON.parse(response.body) as { results: Array<{ id: number; title: string; release_date?: string }> };
      const results = data.results ?? [];

      for (const movie of results) {
        if (items.length >= limit) break;
        items.push({
          tmdbId: movie.id,
          title: movie.title,
          year: this.parseYear(movie.release_date),
          mediaType: 'movie',
        });
      }

      page++;
    }

    return items;
  }

  private async fetchPopularSeries(apiKey: string, limit: number): Promise<ImportListItem[]> {
    const items: ImportListItem[] = [];
    let page = 1;
    const totalPages = Math.ceil(limit / 20);

    while (items.length < limit && page <= totalPages) {
      const url = `${this.baseUrl}/tv/popular?api_key=${encodeURIComponent(apiKey)}&page=${page}`;
      const response = await this.httpClient.get(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch popular series: ${response.status} ${response.body}`);
      }

      const data = JSON.parse(response.body) as { results: Array<{ id: number; name: string; first_air_date?: string }> };
      const results = data.results ?? [];

      for (const series of results) {
        if (items.length >= limit) break;
        items.push({
          tmdbId: series.id,
          title: series.name,
          year: this.parseYear(series.first_air_date),
          mediaType: 'series',
        });
      }

      page++;
    }

    return items;
  }

  private parseYear(releaseDate?: string): number | undefined {
    if (!releaseDate) {
      return undefined;
    }

    const year = parseInt(String(releaseDate).slice(0, 4), 10);
    return Number.isFinite(year) ? year : undefined;
  }
}
