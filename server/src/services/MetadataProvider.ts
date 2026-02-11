import { HttpClient } from '../indexers/HttpClient';

export interface SeriesSearchResult {
  tvdbId: number;
  title: string;
  status: string;
  overview?: string;
  year?: number;
  network?: string;
  slug?: string;
  images: Array<{ coverType: string; url: string }>;
}

export interface SeriesDetails {
  series: SeriesSearchResult & { seasons: any[] };
  episodes: any[];
}

/**
 * Service to fetch metadata for TV series from SkyHook (Sonarr's metadata proxy).
 */
export class MetadataProvider {
  private readonly baseUrl = 'https://skyhook.sonarr.tv/v1/tvdb';

  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Search for a series by title.
   */
  async searchSeries(term: string, fetchFn?: any): Promise<SeriesSearchResult[]> {
    const encodedTerm = encodeURIComponent(term.toLowerCase().trim());
    const url = `${this.baseUrl}/search?term=${encodedTerm}`;
    
    const response = await this.httpClient.get(url, {}, fetchFn);
    
    if (!response.ok) {
      throw new Error(`Failed to search series: ${response.status} ${response.body}`);
    }

    return JSON.parse(response.body);
  }

  /**
   * Get full details for a series including episodes.
   */
  async getSeriesDetails(tvdbId: number, fetchFn?: any): Promise<SeriesDetails> {
    const url = `${this.baseUrl}/shows/${tvdbId}`;
    
    const response = await this.httpClient.get(url, {}, fetchFn);
    
    if (!response.ok) {
      throw new Error(`Failed to get series details: ${response.status} ${response.body}`);
    }

    const data = JSON.parse(response.body);
    
    return {
      series: data,
      episodes: data.episodes || []
    };
  }
}
