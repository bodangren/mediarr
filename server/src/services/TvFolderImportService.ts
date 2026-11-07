import fs from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseClient } from '../db/drizzleClient';
import { ExistingLibraryScanner, type ScannedFolder } from './ExistingLibraryScanner';
import { ImportMatchService } from './ImportMatchService';
import { BulkImportService } from './BulkImportService';
import { Parser } from '../utils/Parser';

export interface TvFolderImportStats {
  foldersScanned: number;
  foldersSkipped: number;
  imported: number;
  unmatched: string[];
  failed: number;
  errors: Array<{ folderPath: string; error: string }>;
}

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

/**
 * Whether a candidate is confidently the same show as the folder.
 *
 * `ImportMatchService.matchFolder` derives its search title from *filenames*,
 * and on this library that produced confident-looking nonsense: "Mr. Robot"
 * matched "PONY.MOV", "Weeds (2005)" matched "Kumamiko - Girl Meets Bear",
 * "American Dad!" matched "The Pilot" (8 of 18 imports were wrong on
 * 2026-11-08). Searching by the folder name and requiring the keys to agree
 * turns those into honest "unmatched" reports instead.
 */
export function isConfidentSeriesMatch(candidateTitle: string, folderName: string): boolean {
  const candidate = seriesKey(candidateTitle);
  const folder = seriesKey(folderTitle(folderName));
  if (!candidate || !folder) return false;
  if (candidate === folder) return true;
  // Allow a year/naming suffix on the folder ("Mobland 2025" vs "MobLand").
  const shorter = candidate.length <= folder.length ? candidate : folder;
  const longer = candidate.length <= folder.length ? folder : candidate;
  if (shortestContained(longer, shorter) && shorter.length / longer.length >= 0.6) {
    return true;
  }
  return false;
}

function shortestContained(longer: string, shorter: string): boolean {
  return longer.includes(shorter);
}

/** Normalised comparison key for a series folder/title. */
export function seriesKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(\d{4}\)\s*$/, '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/**
 * Imports series folders that the library scan never adds.
 *
 * `LibraryScanService.scanEpisodes` only validates episodes that already exist
 * in the database; unregistered files on disk are counted ("tvEpisodesAdded")
 * but no rows are created. On 2026-11-08 that left 26 of 54 series folders in
 * `/data/TV` invisible — including whole seasons of How I Met Your Mother, For
 * All Mankind and Archer — while the daily scan reported success.
 *
 * This service closes the loop: every series folder without a database row is
 * matched against the metadata provider and imported through the same
 * scanner/match/bulk-import pipeline the web UI's "Import Existing" uses.
 */
export class TvFolderImportService {
  private readonly scanner: ExistingLibraryScanner;
  private readonly matchService: ImportMatchService;
  private readonly importService: BulkImportService;

  constructor(
    private readonly prisma: DatabaseClient,
    metadataProvider: ConstructorParameters<typeof ImportMatchService>[0],
    overrides: {
      scanner?: Pick<ExistingLibraryScanner, 'scan'>;
      matchService?: Pick<ImportMatchService, 'matchFolder'>;
      importService?: Pick<BulkImportService, 'executeImport'>;
    } = {},
  ) {
    this.scanner = (overrides.scanner as ExistingLibraryScanner) ?? new ExistingLibraryScanner();
    this.matchService = (overrides.matchService as ImportMatchService)
      ?? new ImportMatchService(metadataProvider);
    this.importService = (overrides.importService as BulkImportService)
      ?? new BulkImportService(prisma as any, metadataProvider as any);
  }

  private async listSeriesFolders(root: string): Promise<string[]> {
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

  private async registeredSeriesKeys(): Promise<Set<string>> {
    const rows = await (this.prisma as any).series.findMany({
      select: { title: true, path: true },
    });
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
    tvRootFolder: string;
    renameFiles?: boolean;
    dryRun?: boolean;
  }): Promise<TvFolderImportStats> {
    const stats: TvFolderImportStats = {
      foldersScanned: 0,
      foldersSkipped: 0,
      imported: 0,
      unmatched: [],
      failed: 0,
      errors: [],
    };

    if (!options.tvRootFolder) {
      return stats;
    }

    const qualityProfileId = await this.defaultQualityProfileId();
    if (qualityProfileId === null) {
      throw new Error('TvFolderImportService: no quality profile configured');
    }

    const known = await this.registeredSeriesKeys();
    const folders = await this.listSeriesFolders(options.tvRootFolder);

    for (const folder of folders) {
      stats.foldersScanned += 1;
      if (known.has(seriesKey(path.basename(folder)))) {
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

      const seriesFolders = scanResult.folders.filter(folderEntry => folderEntry.files.length > 0);
      if (seriesFolders.length === 0) {
        stats.foldersSkipped += 1;
        continue;
      }

      const items: Array<{
        folderPath: string;
        mediaType: 'series';
        matchId: number;
        files: ScannedFolder['files'];
        renameFiles: boolean;
        rootFolderPath: string;
        qualityProfileId: number;
      }> = [];

      const folderName = path.basename(folder);
      for (const scanned of seriesFolders) {
        let candidates: Awaited<ReturnType<ImportMatchService['matchFolder']>>;
        try {
          candidates = await this.matchService.searchByTitle(folderTitle(folderName), 'series');
        } catch {
          candidates = [];
        }
        const best = candidates.find(candidate => isConfidentSeriesMatch(candidate.title, folderName));
        if (!best) {
          stats.unmatched.push(folderName);
          continue;
        }
        const files = await Promise.all(scanned.files.map(async file => ({
          ...file,
          parsedInfo: file.parsedInfo ?? (await Parser.parse(path.basename(file.path))) ?? undefined,
        })));
        items.push({
          folderPath: scanned.path,
          mediaType: 'series',
          matchId: best.id,
          files,
          renameFiles: options.renameFiles ?? false,
          rootFolderPath: options.tvRootFolder,
          qualityProfileId,
        });
      }

      if (items.length === 0) continue;
      if (options.dryRun) {
        stats.imported += items.length;
        continue;
      }

      const result = await this.importService.executeImport(items);
      stats.imported += result.imported;
      stats.failed += result.failed;
      stats.errors.push(...result.errors);
    }

    return stats;
  }
}
