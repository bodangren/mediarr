import fs from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseClient } from '../db/drizzleClient';
import { ExistingLibraryScanner } from './ExistingLibraryScanner';
import { ImportMatchService } from './ImportMatchService';
import { BulkImportService } from './BulkImportService';
import { Parser } from '../utils/Parser';

const VIDEO_EXTENSIONS_FOR_IMPORT = new Set(['.mkv', '.mp4', '.avi', '.ts', '.m4v']);

/**
 * Directories that hold bonus material, not episodes.
 *
 * Measured 2026-11-19: six files under `Season NN/Featurettes/` in Archer and
 * Orange Is the New Black are not episodes, so every 30-minute import pass
 * treated them as "episodes added to a known series", asked the metadata
 * provider about them, and failed (`[BulkImport] Failed to import
 * "/data/TV/Archer (2009)": fetch failed` twice a pass, forever). Had the fetch
 * succeeded they would have been filed as episodes — wrong rows in the library.
 */
const EXTRAS_DIRECTORY_NAMES = new Set([
  'featurette', 'featurettes', 'extra', 'extras', 'bonus', 'bonus material', 'bonusmaterial',
  'behind the scenes', 'deleted scenes', 'interview', 'interviews', 'trailer',
  'trailers', 'sample', 'samples', 'subs', 'subtitles',
]);

/** True when any path segment below the series folder marks bonus material. */
export function isExtrasPath(filePath: string, seriesPath?: string | null): boolean {
  const relative = seriesPath && filePath.startsWith(seriesPath)
    ? filePath.slice(seriesPath.length)
    : filePath;
  return relative
    .split(/[\\/]+/)
    .filter(Boolean)
    .slice(0, -1)
    .some(segment => EXTRAS_DIRECTORY_NAMES.has(segment.trim().toLowerCase()));
}

/**
 * Depth-first file walk.
 *
 * `fs.readdir({ recursive: true })` is pathologically slow on Node 24 for these
 * trees: 95 s for /data/Movies where this takes 246 ms (measured 2026-11-08).
 */
async function listFilesDepthFirst(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listFilesDepthFirst(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

export interface FolderImportStats {
  foldersScanned: number;
  foldersSkipped: number;
  imported: number;
  unmatched: string[];
  /** Files whose SxxEyy has no episode row (metadata numbering drift, specials). */
  unknownEpisodeFiles: string[];
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

  /** Every video path the library already knows about for one media type. */
  private async registeredVideoPaths(mediaType: 'movie' | 'series'): Promise<Set<string>> {
    const paths = new Set<string>();
    const variantType = mediaType === 'movie' ? 'MOVIE' : 'EPISODE';
    const variants = await (this.prisma as any).mediaFileVariant?.findMany?.({
      where: { mediaType: variantType },
      select: { path: true },
    }) as Array<{ path: string | null }> | undefined;
    for (const row of variants ?? []) {
      if (row.path) paths.add(row.path);
    }
    const table = mediaType === 'movie' ? (this.prisma as any).movie : (this.prisma as any).series;
    const rows = await table?.findMany?.({ select: { path: true } }) as Array<{ path: string | null }> | undefined;
    for (const row of rows ?? []) {
      if (row.path) paths.add(row.path);
    }
    return paths;
  }

  /**
   * Whether a folder that matches a known title still holds unregistered video.
   *
   * Measured 2026-11-19: fifteen video files sat inside folders whose names
   * matched a library row (`Sinners (2025)`, `Ballerina (2025)`, `Beetlejuice
   * (1988)`, …), so the folder-name skip kept them invisible for ever. Skipping
   * by name is only safe when everything in the folder is already registered.
   */
  private async folderHasUnregisteredVideo(folder: string, registered: Set<string>): Promise<boolean> {
    const files = await listFilesDepthFirst(folder);
    return files.some(file =>
      VIDEO_EXTENSIONS_FOR_IMPORT.has(path.extname(file).toLowerCase())
      && !isExtrasPath(file, folder)
      && !registered.has(file));
  }

  /**
   * Imports episode files that sit inside series the database already knows.
   *
   * The folder importer skips registered series, so episodes added to an
   * existing show were never catalogued: on 2026-11-08 the scan counted 279 such
   * files (The Sopranos 60, Archer 55, The Big Bang Theory 53, …) that the
   * client could not see.
   */
  private async importMissingEpisodes(
    tvRootFolder: string,
    qualityProfileId: number,
    stats: FolderImportStats,
    scannedFolders: Set<string>,
  ): Promise<void> {
    const seriesRows = await (this.prisma as any).series.findMany({
      select: { id: true, tvdbId: true, title: true, path: true },
    }) as Array<{ id: number; tvdbId: number; title: string; path: string | null }>;
    const episodeRows = await (this.prisma as any).episode.findMany({
      select: { path: true },
    }) as Array<{ path: string | null }>;
    const knownPaths = new Set(episodeRows.map(row => row.path).filter((value): value is string => Boolean(value)));

    for (const series of seriesRows) {
      if (!series.path) continue;
      // Only inspect folders under the TV root this run owns.
      if (!series.path.startsWith(tvRootFolder)) continue;
      if (scannedFolders.has(series.path)) continue;

      const entries = (await listFilesDepthFirst(series.path))
        .filter(file => !isExtrasPath(file, series.path));

      // A file for an episode that is already linked is a duplicate copy, not a
      // missing episode. Without this, a second import pass that names files
      // differently (e.g. "Show - S01E01 …" vs "Show (2023) - S01E01 …") copied
      // the whole season again: Monarch S2 ended up with 20 files for 10
      // episodes on 2026-11-18.
      const linkedEpisodes = new Set<string>();
      const knownEpisodes = new Set<string>();
      const seriesEpisodes = await (this.prisma as any).episode.findMany({
        where: { seriesId: series.id },
        select: { seasonNumber: true, episodeNumber: true, path: true },
      }) as Array<{ seasonNumber: number; episodeNumber: number; path: string | null }>;
      for (const episode of seriesEpisodes) {
        knownEpisodes.add(`${episode.seasonNumber}x${episode.episodeNumber}`);
        if (episode.path) {
          linkedEpisodes.add(`${episode.seasonNumber}x${episode.episodeNumber}`);
        }
      }

      const isAlreadyFiled = (filePath: string): boolean => {
        const base = path.basename(filePath);
        const match = /[Ss](\d{1,2})[Ee](\d{1,2})/.exec(base);
        if (!match) return false;
        return linkedEpisodes.has(`${Number(match[1])}x${Number(match[2])}`);
      };

      // A file whose parsed SxxEyy has no episode row can never be linked by the
      // import (it only attaches files to metadata episodes), so retrying it
      // every 30 minutes is pure churn. Measured 2026-11-19: Mr. Inbetween's
      // 2005 special parsed as S00E01 with no season-0 row and was re-imported
      // on every pass for days; the two American Dad copies were really S17E02/E03.
      const hasKnownEpisode = (filePath: string): boolean => {
        const match = /[Ss](\d{1,2})[Ee](\d{1,2})/.exec(path.basename(filePath));
        if (!match) return false;
        return knownEpisodes.has(`${Number(match[1])}x${Number(match[2])}`);
      };
      const candidates = entries.filter(file =>
        VIDEO_EXTENSIONS_FOR_IMPORT.has(path.extname(file).toLowerCase())
        && !knownPaths.has(file)
        && !isAlreadyFiled(file));
      const missing: string[] = [];
      // A series with no episode rows yet cannot judge anything: attempt the
      // import so a first-time metadata import still files its episodes.
      const canJudge = knownEpisodes.size > 0;
      for (const file of candidates) {
        if (!canJudge || hasKnownEpisode(file)) {
          missing.push(file);
        } else if (!stats.unknownEpisodeFiles.includes(file)) {
          stats.unknownEpisodeFiles.push(file);
        }
      }
      if (missing.length === 0) continue;

      const files = await Promise.all(missing.map(async file => ({
        path: file,
        size: 0,
        extension: path.extname(file),
        parsedInfo: (await Parser.parse(path.basename(file))) ?? undefined,
      })));

      try {
        const result = await this.importService.executeImport([{
          folderPath: series.path,
          mediaType: 'series',
          matchId: series.tvdbId,
          files,
          renameFiles: false,
          rootFolderPath: tvRootFolder,
          qualityProfileId,
        } as any]);
        stats.imported += result.imported;
        stats.failed += result.failed;
        stats.errors.push(...result.errors);
      } catch (error) {
        stats.failed += 1;
        stats.errors.push({
          folderPath: series.path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
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
      unknownEpisodeFiles: [],
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
      const registeredPaths = mediaType === 'movie'
        ? await this.registeredVideoPaths(mediaType)
        : new Set<string>();
      for (const folder of await this.listFolders(root)) {
        stats.foldersScanned += 1;
        const folderName = path.basename(folder);
        if (known.has(seriesKey(folderName))) {
          // Series folders are handled file-by-file by importMissingEpisodes;
          // movie folders are only skipped when every video in them is known.
          const hasNewVideo = mediaType === 'movie'
            && await this.folderHasUnregisteredVideo(folder, registeredPaths);
          if (!hasNewVideo) {
            stats.foldersSkipped += 1;
            continue;
          }
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
          const onlyNewVideos = mediaType === 'movie' && registeredPaths.size > 0
            && known.has(seriesKey(folderName));
          const scannedFiles = onlyNewVideos
            ? scanned.files.filter(file => !registeredPaths.has(file.path))
            : scanned.files;
          const files = await Promise.all(scannedFiles.map(async file => ({
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

    if (options.tvRootFolder && !options.dryRun) {
      const knownFolders = new Set<string>();
      await this.importMissingEpisodes(options.tvRootFolder, qualityProfileId, stats, knownFolders);
    }

    return stats;
  }
}
