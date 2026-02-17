import type { HttpClient } from '../../indexers/HttpClient';
import type { SettingsService } from '../SettingsService';
import type { ImportListProvider, ImportListItem } from './ImportListProvider';

export interface TMDBListConfig {
  listId: number;
}

export class TMDBListProvider implements ImportListProvider {
  readonly type = 'tmdb-list';
  readonly name = 'TMDB List';

  private readonly baseUrl = 'https://api.themoviedb.org/3';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly settingsService: SettingsService,
  ) {}

  validateConfig(config: Record<string, unknown>): boolean {
    const listId = config.listId;
    if (listId === undefined || listId === null) {
      return false;
    }
    if (typeof listId !== 'number' || !Number.isFinite(listId) || listId <= 0) {
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

    const listId = config.listId as number;
    if (!listId) {
      throw new Error('List ID is required for TMDB List provider');
    }

    const items: ImportListItem[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${this.baseUrl}/list/${listId}?api_key=${encodeURIComponent(apiKey)}&page=${page}`;
      const response = await this.httpClient.get(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`TMDB List ${listId} not found`);
        }
        throw new Error(`Failed to fetch TMDB list: ${response.status} ${response.body}`);
      }

      const data = JSON.parse(response.body) as {
        items?: Array<{
          id: number;
          title?: string;
          name?: string;
          media_type?: string;
          release_date?: string;
          first_air_date?: string;
        }>;
        page?: number;
        total_pages?: number;
      };

      const results = data.items ?? [];

      for (const item of results) {
        const mediaType = item.media_type === 'tv' ? 'series' : 'movie';
        items.push({
          tmdbId: item.id,
          title: item.title ?? item.name ?? 'Unknown',
          year: this.parseYear(item.release_date ?? item.first_air_date),
          mediaType: mediaType as 'movie' | 'series',
        });
      }

      hasMore = data.page !== undefined && data.total_pages !== undefined && data.page < data.total_pages;
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
