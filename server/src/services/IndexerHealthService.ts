import type { BaseIndexer } from '../indexers/BaseIndexer';
import type { HttpClient } from '../indexers/HttpClient';
import type { IndexerHealthRepository } from '../repositories/IndexerHealthRepository';

export interface PingResult {
  success: boolean;
  message: string;
}

export class IndexerHealthService {
  constructor(
    private readonly healthRepo: IndexerHealthRepository,
    private readonly httpClient: HttpClient,
  ) {}

  async ping(indexer: BaseIndexer): Promise<PingResult> {
    const url = this.resolvePingUrl(indexer);

    try {
      const response = await this.httpClient.get(url, {}, undefined as unknown as typeof fetch);
      const success = response.ok;

      if (indexer.id > 0) {
        if (success) {
          await this.healthRepo.recordSuccess(indexer.id, new Date());
        } else {
          await this.healthRepo.recordFailure(
            indexer.id,
            `HTTP ${response.status}`,
            new Date(),
          );
        }
      }

      return {
        success,
        message: success
          ? `Ping successful for ${indexer.name}`
          : `Ping failed with HTTP ${response.status}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (indexer.id > 0) {
        await this.healthRepo.recordFailure(
          indexer.id,
          message,
          new Date(),
        );
      }

      return {
        success: false,
        message,
      };
    }
  }

  private resolvePingUrl(indexer: BaseIndexer): string {
    if (indexer.implementation === 'Cardigann') {
      return (indexer as unknown as { baseUrl: string }).baseUrl;
    }

    return (indexer as unknown as { buildTestUrl(): string }).buildTestUrl();
  }
}
