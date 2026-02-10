import type { BaseIndexer } from './BaseIndexer';
import { TorznabIndexer, ScrapingIndexer } from './BaseIndexer';
import type { HttpClient } from './HttpClient';

export interface TestResult {
  success: boolean;
  message: string;
}

type FetchFn = typeof globalThis.fetch;

/**
 * Tests indexer connectivity and basic functionality.
 */
export class IndexerTester {
  constructor(private client: HttpClient) {}

  /**
   * Unified test: routes to the appropriate test method based on indexer type.
   */
  async test(indexer: BaseIndexer, fetchFn?: FetchFn): Promise<TestResult> {
    if (indexer instanceof TorznabIndexer) {
      return this.testTorznab(indexer, fetchFn);
    }
    if (indexer instanceof ScrapingIndexer) {
      return this.testScraping(indexer, fetchFn);
    }
    return { success: false, message: `Unknown indexer type: ${indexer.implementation}` };
  }

  /**
   * Test a Torznab indexer by requesting the caps endpoint.
   */
  async testTorznab(indexer: TorznabIndexer, fetchFn?: FetchFn): Promise<TestResult> {
    try {
      const url = indexer.buildTestUrl();
      const response = await this.client.get(url, {}, fetchFn);

      if (!response.ok) {
        return {
          success: false,
          message: `Torznab test failed with HTTP ${response.status}`,
        };
      }

      // Validate that the response looks like Torznab XML
      if (!response.body.includes('<caps') && !response.body.includes('<searching')) {
        return {
          success: false,
          message: 'Torznab test returned invalid response (not valid caps XML)',
        };
      }

      return {
        success: true,
        message: `Torznab test successful for ${indexer.name}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Torznab test failed: ${error.message}`,
      };
    }
  }

  /**
   * Test a scraping indexer by verifying the site homepage is reachable.
   */
  async testScraping(indexer: ScrapingIndexer, fetchFn?: FetchFn): Promise<TestResult> {
    try {
      const response = await this.client.get(indexer.baseUrl, {}, fetchFn);

      if (!response.ok) {
        return {
          success: false,
          message: `Scraping test failed with HTTP ${response.status} for ${indexer.name}`,
        };
      }

      return {
        success: true,
        message: `Scraping test successful for ${indexer.name}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Scraping test failed: ${error.message}`,
      };
    }
  }
}
