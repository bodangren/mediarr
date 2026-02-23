import type { BaseIndexer, SearchQuery } from './BaseIndexer';
import { TorznabIndexer, ScrapingIndexer } from './BaseIndexer';
import type { HttpClient, HttpResponse } from './HttpClient';
import { renderCardigannTemplate, resolveCardigannUrl } from './TemplateRuntime';

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
      const url = this.buildScrapingUrl(indexer.baseUrl, searchPath.path, query, indexer.settings);
      const response = await this.client.get(url, {}, fetchFn);
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

    const url = this.buildScrapingUrl(indexer.baseUrl, firstPath.path, query, indexer.settings);
    return this.client.get(url, {}, fetchFn);
  }

  /**
   * Build a full URL by substituting template variables into the search path.
   */
  private buildScrapingUrl(
    baseUrl: string,
    pathTemplate: string,
    query: SearchQuery,
    settings: Record<string, unknown>,
  ): string {
    let renderedPath = renderCardigannTemplate(pathTemplate, {
      query,
      config: settings,
      categories: query.categories ?? [],
    }, { strict: true });

    // Also handle legacy {q} shorthand.
    renderedPath = renderedPath.replace(/\{q\}/g, encodeURIComponent(query.q ?? '').replace(/%20/g, '+'));

    return resolveCardigannUrl(baseUrl, renderedPath);
  }
}
