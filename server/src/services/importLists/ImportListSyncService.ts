import path from 'node:path';
import type { DatabaseClient } from '../../db/drizzleClient';
import type { ImportListRepository, ImportListWithProfile } from '../../repositories/ImportListRepository';
import type { MediaRepository } from '../../repositories/MediaRepository';
import type { ImportListProviderFactory, ImportListItem } from './ImportListProvider';
import { sanitizeTitle, toSortTitle } from '../../utils/stringUtils';

export interface SyncResult {
  added: number;
  skipped: number;
  exclusions: number;
  errors: Array<{ title: string; error: string }>;
}

type NormalizedImportListItem =
  | (ImportListItem & { mediaType: 'movie'; tmdbId: number })
  | (ImportListItem & { mediaType: 'series'; tvdbId: number });

export class ImportListSyncService {
  constructor(
    private readonly prisma: DatabaseClient,
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

        const normalizedItem = this.normalizeIdentifiers(item);

        const alreadyExists = await this.checkIfExists(normalizedItem);
        if (alreadyExists) {
          result.skipped++;
          continue;
        }

        const persisted = await this.addToList(importList, normalizedItem);
        if (persisted) {
          result.added++;
        }
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

  private async checkIfExists(item: NormalizedImportListItem): Promise<boolean> {
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

  private async addToList(importList: ImportListWithProfile, item: NormalizedImportListItem): Promise<boolean> {
    const cleanTitle = this.cleanTitle(item.title);
    const sortTitle = toSortTitle(item.title);
    const year = item.year ?? 0;

    if (item.mediaType === 'movie') {
      const tmdbId = item.tmdbId;
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
        tmdbId,
        title: item.title,
        cleanTitle,
        sortTitle,
        status: 'announced',
        monitored: importList.monitorType === 'movie',
        qualityProfileId: importList.qualityProfileId,
        path: this.buildMediaPath(importList.rootFolderPath, item.title, year, `tmdb-${tmdbId}`),
        year,
      };
      if (item.imdbId !== undefined) {
        movieInput.imdbId = item.imdbId;
      }
      const persisted = await this.mediaRepository.upsertMovie(movieInput);
      if (!persisted || !Number.isInteger(persisted.id) || persisted.id <= 0) {
        throw new Error(`Movie "${item.title}" was not persisted`);
      }
      return true;
    }

    const tvdbId = item.tvdbId;
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
      tvdbId,
      title: item.title,
      cleanTitle,
      sortTitle,
      status: 'continuing',
      monitored: importList.monitorType === 'series',
      qualityProfileId: importList.qualityProfileId,
      path: this.buildMediaPath(importList.rootFolderPath, item.title, year, `tvdb-${tvdbId}`),
      year,
    };
    if (item.tmdbId !== undefined) {
      seriesInput.tmdbId = item.tmdbId;
    }
    if (item.imdbId !== undefined) {
      seriesInput.imdbId = item.imdbId;
    }
    const persisted = await this.mediaRepository.upsertSeries(seriesInput);
    if (!persisted || !Number.isInteger(persisted.id) || persisted.id <= 0) {
      throw new Error(`Series "${item.title}" was not persisted`);
    }
    return true;
  }

  private normalizeIdentifiers(item: ImportListItem): NormalizedImportListItem {
    if (item.mediaType === 'movie') {
      if (!this.isPositiveInteger(item.tmdbId)) {
        throw new Error(`Movie "${item.title}" is missing a valid TMDB ID`);
      }
      return { ...item, mediaType: 'movie', tmdbId: item.tmdbId };
    }

    if (!this.isPositiveInteger(item.tvdbId)) {
      throw new Error(`Series "${item.title}" is missing a valid TVDB ID`);
    }
    return { ...item, mediaType: 'series', tvdbId: item.tvdbId };
  }

  private isPositiveInteger(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
  }

  private buildMediaPath(rootFolderPath: string, title: string, year: number, uniqueId: string): string {
    if (!rootFolderPath.trim()) {
      throw new Error(`Cannot derive a media path for "${title}": root folder is empty`);
    }

    const safeTitle = [...sanitizeTitle(title)]
      .filter((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint > 31 && codePoint !== 127;
      })
      .join('')
      .replace(/^\.+|\.+$/g, '')
      .trim();
    if (!safeTitle) {
      throw new Error(`Cannot derive a media path for "${title}": title is not filesystem-safe`);
    }

    const normalizedRoot = path.resolve(rootFolderPath);
    const yearSuffix = year > 0 ? ` (${year})` : '';
    const target = path.resolve(normalizedRoot, `${safeTitle}${yearSuffix} [${uniqueId}]`);
    if (target === normalizedRoot || !target.startsWith(`${normalizedRoot}${path.sep}`)) {
      throw new Error(`Cannot derive a media path for "${title}" outside the configured root`);
    }
    return target;
  }

  private cleanTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

}
