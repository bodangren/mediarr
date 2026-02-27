import type { BaseIndexer, SearchQuery } from './BaseIndexer';
import { TorznabIndexer, ScrapingIndexer } from './BaseIndexer';
import type { HttpClient, HttpResponse } from './HttpClient';
import { buildCardigannRequest } from './CardigannRequestBuilder';

type FetchFn = typeof globalThis.fetch;

/**
 * Translates generic search queries into indexer-specific HTTP requests.
 */
export class SearchTranslator {
  constructor(private client: HttpClient) {}

  /**
   * Execute a search against an indexer (first path only for scraping).
   */
  async search(indexer: BaseIndexer, query: SearchQuery, fetchFn?: FetchFn): Promise<HttpResponse> {
    if (indexer instanceof TorznabIndexer) {
      return this.searchTorznab(indexer, query, fetchFn);
    }
    if (indexer instanceof ScrapingIndexer) {
      return this.searchScraping(indexer, query, fetchFn);
    }
    throw new Error(`Unsupported indexer type: ${indexer.implementation}`);
  }

  /**
   * Execute a search against all paths of a scraping indexer.
   */
  async searchAll(indexer: ScrapingIndexer, query: SearchQuery, fetchFn?: FetchFn): Promise<HttpResponse[]> {
    const responses: HttpResponse[] = [];
    for (const searchPath of indexer.searchPaths) {
      const request = buildCardigannRequest(indexer.definition, searchPath, query, indexer.settings);
      const response = await this.client.get(request.url, { headers: request.headers }, fetchFn);
      responses.push(response);
    }
    return responses;
  }

  private async searchTorznab(indexer: TorznabIndexer, query: SearchQuery, fetchFn?: FetchFn): Promise<HttpResponse> {
    const url = indexer.buildSearchUrl(query);
    return this.client.get(url, {}, fetchFn);
  }

  private async searchScraping(indexer: ScrapingIndexer, query: SearchQuery, fetchFn?: FetchFn): Promise<HttpResponse> {
    const firstPath = indexer.searchPaths[0];
    if (!firstPath) {
      throw new Error(`No search paths defined for indexer: ${indexer.name}`);
    }

    const request = buildCardigannRequest(indexer.definition, firstPath, query, indexer.settings);
    return this.client.get(request.url, { headers: request.headers }, fetchFn);
  }
}
