import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { Parser, type ParsedDirectory, type ParsedInfo } from '../utils/Parser';

export interface ScannedFile {
  path: string;
  size: number;
  extension: string;
  nfoPath?: string | undefined;
  parsedInfo?: ParsedInfo | undefined;
}

export interface ScannedFolder {
  path: string;
  type: 'movie' | 'series' | 'unknown';
  files: ScannedFile[];
  nfoData?: NfoData | undefined;
  parsedTitle?: string | undefined;
  parsedYear?: number | undefined;
}

export interface NfoData {
  imdbId?: string | undefined;
  tmdbId?: number | undefined;
  tvdbId?: number | undefined;
  title?: string | undefined;
  year?: number | undefined;
}

export interface ScanResult {
  rootPath: string;
  folders: ScannedFolder[];
  totalFiles: number;
  scanDurationMs: number;
}

const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.ts', '.m4v', '.mov', '.wmv']);
const NFO_EXTENSION = '.nfo';

// Matches "Season 1", "Season 01", "S01", "S1", "Specials", "Extras", "Bonus", etc.
const SEASON_DIR_PATTERN = /^(?:season\s*\d+|s\d+|specials?|extras?|bonus(?:\s+features?)?|behind\s+the\s+scenes|featurettes?)$/i;

export class ExistingLibraryScanner {
  async scan(rootPath: string): Promise<ScanResult> {
    const startTime = Date.now();

    const entries = await this.scanDirectory(rootPath);

    const folderPaths = new Set<string>();
    for (const entry of entries) {
      if (entry.type === 'folder') {
        folderPaths.add(entry.path);
      } else if (entry.type === 'video') {
        folderPaths.add(path.dirname(entry.path));
      }
    }

    const allFolders = await Promise.all([...folderPaths].map((p) => this.processFolder(p)));
    const nonEmpty = allFolders.filter((f) => f.files.length > 0);
    const folders = this.consolidateSeasonFolders(nonEmpty);
    const totalFiles = folders.reduce((sum, f) => sum + f.files.length, 0);

    return {
      rootPath,
      folders,
      totalFiles,
      scanDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Merges season subfolders (e.g. "Season 01/", "S02/") into their parent
   * show folder so the show is presented as a single import unit.
   *
   * If the parent folder has no direct video files of its own (the common
   * case), a synthetic show folder is created from the parent directory name.
   * If the parent already has direct files the season files are appended.
   */
  private consolidateSeasonFolders(folders: ScannedFolder[]): ScannedFolder[] {
    const byPath = new Map<string, ScannedFolder>(folders.map((f) => [f.path, f]));
    const seasonPaths = new Set<string>();

    for (const folder of folders) {
      if (!SEASON_DIR_PATTERN.test(path.basename(folder.path))) continue;

      seasonPaths.add(folder.path);
      const showPath = path.dirname(folder.path);

      if (!byPath.has(showPath)) {
        const showName = path.basename(showPath);
        const parsed = Parser.parseDirectory(showName);
        byPath.set(showPath, {
          path: showPath,
          type: 'series',
          files: [],
          nfoData: folder.nfoData,
          parsedTitle: parsed.title ?? folder.nfoData?.title,
          parsedYear: parsed.year ?? folder.nfoData?.year,
        });
      }

      const showFolder = byPath.get(showPath)!;
      showFolder.type = 'series';
      showFolder.files.push(...folder.files);
      // Prefer show-level NFO; fall back to season NFO only if nothing yet set
      if (!showFolder.nfoData && folder.nfoData) {
        showFolder.nfoData = folder.nfoData;
      }
    }

    return [...byPath.values()].filter((f) => !seasonPaths.has(f.path));
  }

  private async processFolder(folderPath: string): Promise<ScannedFolder> {
    const { files, nfoFiles } = await this.getVideoFiles(folderPath);

    let nfoData: NfoData | undefined;
    if (nfoFiles.length > 0 && nfoFiles[0]) {
      nfoData = await this.parseNfoFile(nfoFiles[0]);
    }

    const folderName = path.basename(folderPath);
    const folderParsed = Parser.parseDirectory(folderName);

    const type = this.detectFolderType(files, folderParsed);

    return {
      path: folderPath,
      type,
      files,
      nfoData,
      parsedTitle: folderParsed.title ?? nfoData?.title,
      parsedYear: folderParsed.year ?? nfoData?.year,
    };
  }

  private detectFolderType(files: ScannedFile[], folderParsed: ParsedDirectory): 'movie' | 'series' | 'unknown' {
    if (folderParsed.type) {
      return folderParsed.type;
    }

    const hasEpisodePatterns = files.some(
      (f) => f.parsedInfo?.seasonNumber !== undefined && !!f.parsedInfo.episodeNumbers?.length,
    );

    if (hasEpisodePatterns) {
      return 'series';
    }

    if (files.length === 1) {
      return 'movie';
    }

    if (files.length > 1) {
      const allHaveSeasonEpisode = files.every(
        (f) => f.parsedInfo?.seasonNumber !== undefined && f.parsedInfo?.episodeNumbers?.length,
      );

      if (allHaveSeasonEpisode) {
        return 'series';
      }

      const seriesTitles = new Set(
        files.map((f) => f.parsedInfo?.seriesTitle?.toLowerCase()).filter(Boolean),
      );
      if (seriesTitles.size === 1) {
        return 'series';
      }
    }

    return 'movie';
  }

  private async getVideoFiles(folderPath: string): Promise<{ files: ScannedFile[]; nfoFiles: string[] }> {
    let entries: Dirent[];

    try {
      entries = await fs.readdir(folderPath, { withFileTypes: true });
    } catch {
      return { files: [], nfoFiles: [] };
    }

    const nfoFiles: string[] = [];
    const videoEntries: Dirent[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const nameLower = entry.name.toLowerCase();
      if (nameLower.endsWith(NFO_EXTENSION)) {
        nfoFiles.push(path.join(folderPath, entry.name));
      } else if (VIDEO_EXTENSIONS.has(path.extname(nameLower))) {
        videoEntries.push(entry);
      }
    }

    // Build a Map for O(1) NFO sidecar lookups
    const nfoByBaseName = new Map<string, string>();
    for (const nfo of nfoFiles) {
      nfoByBaseName.set(path.basename(nfo, NFO_EXTENSION).toLowerCase(), nfo);
    }

    const fileResults = await Promise.all(
      videoEntries.map(async (entry): Promise<ScannedFile | null> => {
        const filePath = path.join(folderPath, entry.name);
        let size: number;
        try {
          const stat = await fs.stat(filePath);
          size = stat.size;
        } catch {
          return null;
        }

        const ext = path.extname(entry.name).toLowerCase();
        const parsedSeries = Parser.parse(entry.name);
        const parsedMovie = parsedSeries ? null : Parser.parseMovie(entry.name);
        const parsedInfo = parsedSeries
          ?? (parsedMovie
            ? {
                movieTitle: parsedMovie.title,
                year: parsedMovie.year,
                quality: parsedMovie.quality,
                episodeNumbers: [],
                type: 'movie' as const,
              }
            : undefined);

        const videoBaseName = entry.name.replace(/\.[^.]+$/, '').toLowerCase();
        const correspondingNfo = nfoByBaseName.get(videoBaseName);

        return { path: filePath, size, extension: ext, nfoPath: correspondingNfo, parsedInfo };
      }),
    );

    return { files: fileResults.filter((f): f is ScannedFile => f !== null), nfoFiles };
  }

  private async parseNfoFile(nfoPath: string): Promise<NfoData> {
    const result: NfoData = {};

    try {
      const content = await fs.readFile(nfoPath, 'utf-8');

      let imdbMatch = content.match(/imdb\.com\/title\/(tt\d+)/i);
      if (!imdbMatch) {
        imdbMatch = content.match(/<id>(tt\d+)<\/id>/i);
      }
      if (imdbMatch?.[1]) {
        result.imdbId = imdbMatch[1];
      }

      let tmdbMatch = content.match(/themoviedb\.org\/movie\/(\d+)/i);
      if (!tmdbMatch) {
        tmdbMatch = content.match(/<tmdbid>(\d+)<\/tmdbid>/i);
      }
      if (tmdbMatch?.[1]) {
        result.tmdbId = parseInt(tmdbMatch[1], 10);
      }

      // Modern Kodi/Jellyfin NFO: <uniqueid type="tvdb">110381</uniqueid>
      let tvdbMatch = content.match(/<uniqueid[^>]+type=["']tvdb["'][^>]*>(\d+)<\/uniqueid>/i);
      if (!tvdbMatch) {
        tvdbMatch = content.match(/thetvdb\.com\/\?tab=series&id=(\d+)/i);
      }
      if (!tvdbMatch) {
        tvdbMatch = content.match(/thetvdb\.com\/series\/[^/]+\/id\/(\d+)/i);
      }
      if (!tvdbMatch) {
        tvdbMatch = content.match(/<tvdbid>(\d+)<\/tvdbid>/i);
      }
      // <id> in a <tvshow> block is the legacy Kodi TVDB ID — only use it
      // when no other TVDB identifier was found, and it looks plausible
      // (real TVDB IDs are < 2,000,000; larger numbers are likely Kodi
      // internal database IDs or IMDB numeric IDs).
      if (!tvdbMatch && content.includes('<tvshow>')) {
        const idMatch = content.match(/<id>(\d+)<\/id>/i);
        if (idMatch?.[1] && parseInt(idMatch[1], 10) < 2_000_000) {
          tvdbMatch = idMatch;
        }
      }
      if (tvdbMatch?.[1]) {
        result.tvdbId = parseInt(tvdbMatch[1], 10);
      }

      const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch?.[1]) {
        result.title = titleMatch[1].trim();
      }

      const yearMatch = content.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch?.[1]) {
        result.year = parseInt(yearMatch[1], 10);
      }
    } catch {
      // Return empty result on parse failure
    }

    return result;
  }

  private async scanDirectory(dirPath: string): Promise<Array<{ path: string; type: 'folder' | 'video' }>> {
    let entries: Dirent[];

    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }

    const dirs: string[] = [];
    const localVideos: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        dirs.push(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          localVideos.push(fullPath);
        }
      }
    }

    // Recurse into all subdirectories in parallel
    const subResultArrays = await Promise.all(dirs.map((d) => this.scanDirectory(d)));

    const results: Array<{ path: string; type: 'folder' | 'video' }> = [];

    for (const video of localVideos) {
      results.push({ path: video, type: 'video' });
    }

    for (const subResults of subResultArrays) {
      results.push(...subResults);
    }

    // Emit this directory as a folder entry if it directly contains videos
    if (localVideos.length > 0) {
      results.push({ path: dirPath, type: 'folder' });
    }

    return results;
  }
}
