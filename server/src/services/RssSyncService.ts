import type { PrismaClient } from '@prisma/client';
import type { HttpClient } from '../indexers/HttpClient';
import { TorznabIndexer } from '../indexers/BaseIndexer';
import { TorznabParser } from '../indexers/TorznabParser';
import type { IndexerResult } from '../indexers/IndexerResult';
import { EventEmitter } from 'events';
import { IndexerHealthRepository } from '../repositories/IndexerHealthRepository';

export interface SyncSummary {
  indexersProcessed: number;
  releasesStored: number;
  errors: string[];
}

/**
 * Service that fetches latest releases from enabled indexers via RSS
 * and stores them in the local database.
 */
export class RssSyncService extends EventEmitter {
  private torznabParser = new TorznabParser();

  constructor(
    private prisma: PrismaClient,
    private httpClient: HttpClient,
    private indexerHealthRepository?: IndexerHealthRepository,
  ) {
    super();
  }

  /**
   * Run a full RSS sync across all enabled indexers.
   */
  async sync(): Promise<SyncSummary> {
    const summary: SyncSummary = {
      indexersProcessed: 0,
      releasesStored: 0,
      errors: [],
    };

    // Fetch all enabled indexers that support RSS
    const indexers = await (this.prisma as any).indexer.findMany({
      where: { enabled: true, supportsRss: true },
    });

    for (const dbIndexer of indexers) {
      try {
        const stored = await this.syncIndexer(dbIndexer);
        summary.indexersProcessed++;
        summary.releasesStored += stored;
        if (this.indexerHealthRepository) {
          await this.indexerHealthRepository.recordSuccess(dbIndexer.id, new Date());
        }
      } catch (error: any) {
        summary.errors.push(`${dbIndexer.name}: ${error.message}`);
        if (this.indexerHealthRepository) {
          await this.indexerHealthRepository.recordFailure(
            dbIndexer.id,
            String(error?.message ?? 'Unknown sync error'),
            new Date(),
          );
        }
      }
    }

    return summary;
  }

  private async syncIndexer(dbIndexer: any): Promise<number> {
    const settings = typeof dbIndexer.settings === 'string'
      ? JSON.parse(dbIndexer.settings)
      : dbIndexer.settings;

    // Currently supports Torznab; scraping RSS would follow a similar pattern
    if (dbIndexer.implementation !== 'Torznab') {
      return 0;
    }

    const indexer = new TorznabIndexer({
      id: dbIndexer.id,
      name: dbIndexer.name,
      implementation: dbIndexer.implementation,
      protocol: dbIndexer.protocol,
      enabled: dbIndexer.enabled,
      priority: dbIndexer.priority,
      supportsRss: dbIndexer.supportsRss,
      supportsSearch: dbIndexer.supportsSearch,
      settings,
      httpClient: this.httpClient,
    });

    const rssUrl = indexer.buildRssUrl();
    const response = await this.httpClient.get(rssUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${indexer.name}`);
    }

    const results = this.torznabParser.parse(response.body);
    let stored = 0;

    for (const result of results) {
      await this.storeRelease(result, dbIndexer.id);
      stored++;
    }

    return stored;
  }

  private async storeRelease(result: IndexerResult, indexerId: number): Promise<void> {
    await (this.prisma as any).indexerRelease.upsert({
      where: { guid: result.guid },
      update: {
        title: result.title,
        seeders: result.seeders,
        leechers: result.leechers,
      },
      create: {
        guid: result.guid,
        indexerId,
        title: result.title,
        size: result.size ?? null,
        downloadUrl: result.downloadUrl ?? null,
        infoUrl: result.infoUrl ?? null,
        magnetUrl: result.magnetUrl ?? null,
        publishDate: result.publishDate,
        seeders: result.seeders ?? null,
        leechers: result.leechers ?? null,
        protocol: result.protocol,
        categories: JSON.stringify(result.categories),
        indexerFlags: result.indexerFlags ?? null,
      },
    });

    this.emit('release:stored', { ...result, indexerId });
  }
}
