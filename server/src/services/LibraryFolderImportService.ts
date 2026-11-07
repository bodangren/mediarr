import fs from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseClient } from '../db/drizzleClient';
import { ExistingLibraryScanner } from './ExistingLibraryScanner';
import { ImportMatchService } from './ImportMatchService';
import { BulkImportService } from './BulkImportService';
import { Parser } from '../utils/Parser';

export interface FolderImportStats {
  foldersScanned: number;
  foldersSkipped: number;
  imported: number;
  unmatched: string[];
  failed: number;
  errors: Array<{ folderPath: string; error: string }>;
}

type ImportItem = {
  folderPath: string;
  mediaType: 'movie' | 'series';
  matchId: number;
  files: Array<{ path: string; size: number; extension: string; parsedInfo?: unknown }>;
  renameFiles: boolean;
  rootFolderPath: string;
  qualityProfileId: number;
};

/** Clean a folder name into a searchable title ("Mobland 2025" -> "Mobland"). */
export function folderTitle(folderName: string): string {
  return folderName
    .replace(/\s*\[[^\]]*\]/g, ' ')
    .replace(/\s*[\(\[]?\d{4}[\)\]]?\s*$/g, ' ')
    .replace(/\s+S\d{1,2}(\.?\d{1,2})?$/i, ' ')
    .replace(/\s+Season\s+\d+$/i, ' ')
    .replace(/[._]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Normalised comparison key for a folder/title. */
export function seriesKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(\d{4}\)\s*$/, '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/**
 * Whether a candidate is confidently the same title as the folder.
 *
 * `ImportMatchService.matchFolder` derives its search title from *filenames*,
 * and on this library that produced confident-looking nonsense: "Mr. Robot"
 * matched "PONY.MOV", "Weeds (2005)" matched "Kumamiko - Girl Meets Bear",
 * "American Dad!" matched "The Pilot" (8 of 18 TV imports were wrong on
 * 2026-11-08). Searching by the folder name and requiring the keys to agree
 * turns those into honest "unmatched" reports instead.
 */
export function isConfidentSeriesMatch(candidateTitle: string, folderName: string): boolean {
  const candidate = seriesKey(candidateTitle);
  const folder = seriesKey(folderTitle(folderName));
  if (!candidate || !folder) return false;
  if (candidate === folder) return true;
  const shorter = candidate.length <= folder.length ? candidate : folder;
  const longer = candidate.length <= folder.length ? folder : candidate;
  if (longer.includes(shorter) && shorter.length / longer.length >= 0.6) {
    return true;
  }
  return false;
}

/**
 * Imports media folders that the library scan never registers.
 *
 * `LibraryScanService` only validates rows that already exist; files on disk
 * without a database row are counted and dropped. On 2026-11-08 that left 26 of
 * 54 series folders and 18 of 551 movie folders invisible while the daily scan
 * reported success. This service closes both gaps through the same
 * scanner/match/bulk-import pipeline the web UI's "Import Existing" uses.
 */
export class LibraryFolderImportService {
  private readonly scanner: ExistingLibraryScanner;
  private readonly matchService: ImportMatchService;
  private readonly importService: BulkImportService;

  constructor(
    private readonly prisma: DatabaseClient,
    metadataProvider: ConstructorParameters<typeof ImportMatchService>[0],
    overrides: {
      scanner?: Pick<ExistingLibraryScanner, 'scan'>;
      matchService?: Pick<ImportMatchService, 'searchByTitle'>;
      importService?: Pick<BulkImportService, 'executeImport'>;
    } = {},
  ) {
    this.scanner = (overrides.scanner as ExistingLibraryScanner) ?? new ExistingLibraryScanner();
    this.matchService = (overrides.matchService as ImportMatchService)
      ?? new ImportMatchService(metadataProvider);
    this.importService = (overrides.importService as BulkImportService)
      ?? new BulkImportService(prisma as any, metadataProvider as any);
  }

  private async listFolders(root: string): Promise<string[]> {
    let entries;
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(root, entry.name))
      .sort();
  }

  private async registeredKeys(mediaType: 'movie' | 'series'): Promise<Set<string>> {
    const table = mediaType === 'movie' ? (this.prisma as any).movie : (this.prisma as any).series;
    const rows = await table.findMany({ select: { title: true, path: true } });
    const keys = new Set<string>();
    for (const row of rows as Array<{ title?: string | null; path?: string | null }>) {
      if (row.title) keys.add(seriesKey(row.title));
      if (row.path) keys.add(seriesKey(path.basename(row.path)));
    }
    return keys;
  }

  private async defaultQualityProfileId(): Promise<number | null> {
    const profile = await (this.prisma as any).qualityProfile.findFirst({ select: { id: true } });
    return profile?.id ?? null;
  }

  async run(options: {
    movieRootFolder?: string;
    tvRootFolder?: string;
    renameFiles?: boolean;
    dryRun?: boolean;
  }): Promise<FolderImportStats> {
    const stats: FolderImportStats = {
      foldersScanned: 0,
      foldersSkipped: 0,
      imported: 0,
      unmatched: [],
      failed: 0,
      errors: [],
    };

    const qualityProfileId = await this.defaultQualityProfileId();
    if (qualityProfileId === null) {
      throw new Error('LibraryFolderImportService: no quality profile configured');
    }

    const roots: Array<{ root: string; mediaType: 'movie' | 'series' }> = [];
    if (options.movieRootFolder) roots.push({ root: options.movieRootFolder, mediaType: 'movie' });
    if (options.tvRootFolder) roots.push({ root: options.tvRootFolder, mediaType: 'series' });

    for (const { root, mediaType } of roots) {
      const known = await this.registeredKeys(mediaType);
      for (const folder of await this.listFolders(root)) {
        stats.foldersScanned += 1;
        const folderName = path.basename(folder);
        if (known.has(seriesKey(folderName))) {
          stats.foldersSkipped += 1;
          continue;
        }

        let scanResult;
        try {
          scanResult = await this.scanner.scan(folder);
        } catch (error) {
          stats.failed += 1;
          stats.errors.push({
            folderPath: folder,
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }

        const candidatesFolders = scanResult.folders.filter(entry => entry.files.length > 0);
        if (candidatesFolders.length === 0) {
          stats.foldersSkipped += 1;
          continue;
        }

        const items: ImportItem[] = [];
        for (const scanned of candidatesFolders) {
          let candidates: Awaited<ReturnType<ImportMatchService['searchByTitle']>>;
          try {
            candidates = await this.matchService.searchByTitle(folderTitle(folderName), mediaType);
          } catch {
            candidates = [];
          }
          const best = candidates.find(candidate => isConfidentSeriesMatch(candidate.title, folderName));
          if (!best) {
            if (!stats.unmatched.includes(folderName)) stats.unmatched.push(folderName);
            continue;
          }
          const files = await Promise.all(scanned.files.map(async file => ({
            ...file,
            parsedInfo: file.parsedInfo ?? (await Parser.parse(path.basename(file.path))) ?? undefined,
          })));
          items.push({
            folderPath: scanned.path,
            mediaType,
            matchId: best.id,
            files,
            renameFiles: options.renameFiles ?? false,
            rootFolderPath: root,
            qualityProfileId,
          });
        }

        if (items.length === 0) continue;
        if (options.dryRun) {
          stats.imported += items.length;
          continue;
        }

        const result = await this.importService.executeImport(items as any);
        stats.imported += result.imported;
        stats.failed += result.failed;
        stats.errors.push(...result.errors);
      }
    }

    return stats;
  }
}
