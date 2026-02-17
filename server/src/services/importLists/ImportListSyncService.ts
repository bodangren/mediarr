import type { PrismaClient } from '@prisma/client';
import type { ImportListRepository, ImportListWithProfile } from '../../repositories/ImportListRepository';
import type { MediaRepository } from '../../repositories/MediaRepository';
import type { ImportListProviderFactory, ImportListItem } from './ImportListProvider';

export interface SyncResult {
  added: number;
  skipped: number;
  exclusions: number;
  errors: Array<{ title: string; error: string }>;
}

export class ImportListSyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly importListRepository: ImportListRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly providerFactory: ImportListProviderFactory,
  ) {}

  async syncList(importListId: number): Promise<SyncResult> {
    const result: SyncResult = {
      added: 0,
      skipped: 0,
      exclusions: 0,
      errors: [],
    };

    const importList = await this.importListRepository.findById(importListId);
    if (!importList) {
      throw new Error(`Import list ${importListId} not found`);
    }

    if (!importList.enabled) {
      return result;
    }

    const provider = this.providerFactory.getProvider(importList.providerType);
    if (!provider) {
      throw new Error(`Unknown provider type: ${importList.providerType}`);
    }

    if (!provider.validateConfig(importList.config)) {
      throw new Error(`Invalid configuration for provider ${importList.providerType}`);
    }

    let items: ImportListItem[];
    try {
      items = await provider.fetch(importList.config);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch items from provider: ${message}`);
    }

    for (const item of items) {
      try {
        const exclusionCheck: { tmdbId?: number; imdbId?: string; tvdbId?: number } = {};
        if (item.tmdbId !== undefined) exclusionCheck.tmdbId = item.tmdbId;
        if (item.imdbId !== undefined) exclusionCheck.imdbId = item.imdbId;
        if (item.tvdbId !== undefined) exclusionCheck.tvdbId = item.tvdbId;
        
        const isExcluded = await this.importListRepository.isExcluded(exclusionCheck);

        if (isExcluded) {
          result.exclusions++;
          continue;
        }

        const alreadyExists = await this.checkIfExists(item);
        if (alreadyExists) {
          result.skipped++;
          continue;
        }

        await this.addToList(importList, item);
        result.added++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({ title: item.title, error: message });
      }
    }

    await this.importListRepository.updateLastSync(importListId);

    return result;
  }

  async syncAllEnabled(): Promise<Map<number, SyncResult>> {
    const results = new Map<number, SyncResult>();
    const enabledLists = await this.importListRepository.findAllEnabled();

    for (const list of enabledLists) {
      try {
        const result = await this.syncList(list.id);
        results.set(list.id, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.set(list.id, {
          added: 0,
          skipped: 0,
          exclusions: 0,
          errors: [{ title: `List ${list.name}`, error: message }],
        });
      }
    }

    return results;
  }

  private async checkIfExists(item: ImportListItem): Promise<boolean> {
    if (item.mediaType === 'movie' && item.tmdbId) {
      const existing = await this.prisma.movie.findUnique({
        where: { tmdbId: item.tmdbId },
      });
      return existing !== null;
    }

    if (item.mediaType === 'series' && item.tvdbId) {
      const existing = await this.prisma.series.findUnique({
        where: { tvdbId: item.tvdbId },
      });
      return existing !== null;
    }

    return false;
  }

  private async addToList(importList: ImportListWithProfile, item: ImportListItem): Promise<void> {
    const cleanTitle = this.cleanTitle(item.title);
    const sortTitle = this.generateSortTitle(item.title);
    const year = item.year ?? 0;

    if (item.mediaType === 'movie' && item.tmdbId) {
      const movieInput: {
        tmdbId: number;
        title: string;
        cleanTitle: string;
        sortTitle: string;
        status: string;
        monitored: boolean;
        qualityProfileId: number;
        path: string;
        year: number;
        imdbId?: string;
      } = {
        tmdbId: item.tmdbId,
        title: item.title,
        cleanTitle,
        sortTitle,
        status: 'announced',
        monitored: importList.monitorType === 'movie',
        qualityProfileId: importList.qualityProfileId,
        path: importList.rootFolderPath,
        year,
      };
      if (item.imdbId !== undefined) {
        movieInput.imdbId = item.imdbId;
      }
      await this.mediaRepository.upsertMovie(movieInput);
    }

    if (item.mediaType === 'series' && item.tvdbId) {
      const seriesInput: {
        tvdbId: number;
        title: string;
        cleanTitle: string;
        sortTitle: string;
        status: string;
        monitored: boolean;
        qualityProfileId: number;
        path: string;
        year: number;
        tmdbId?: number;
        imdbId?: string;
      } = {
        tvdbId: item.tvdbId,
        title: item.title,
        cleanTitle,
        sortTitle,
        status: 'continuing',
        monitored: importList.monitorType === 'series',
        qualityProfileId: importList.qualityProfileId,
        path: importList.rootFolderPath,
        year,
      };
      if (item.tmdbId !== undefined) {
        seriesInput.tmdbId = item.tmdbId;
      }
      if (item.imdbId !== undefined) {
        seriesInput.imdbId = item.imdbId;
      }
      await this.mediaRepository.upsertSeries(seriesInput);
    }
  }

  private cleanTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateSortTitle(title: string): string {
    const articles = ['the ', 'a ', 'an '];
    const lowerTitle = title.toLowerCase();
    
    for (const article of articles) {
      if (lowerTitle.startsWith(article)) {
        return title.slice(article.length) + ', ' + title.slice(0, article.length - 1);
      }
    }
    
    return title;
  }
}
