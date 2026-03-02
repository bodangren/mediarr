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
    const folders = allFolders.filter((f) => f.files.length > 0);
    const totalFiles = folders.reduce((sum, f) => sum + f.files.length, 0);

    return {
      rootPath,
      folders,
      totalFiles,
      scanDurationMs: Date.now() - startTime,
    };
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

        const videoBaseName = entry.name.replace(/\.[^.]+$/, '');
        const correspondingNfo = nfoFiles.find(
          (nfo) => path.basename(nfo, NFO_EXTENSION).toLowerCase() === videoBaseName.toLowerCase(),
        );

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

      let tvdbMatch = content.match(/thetvdb\.com\/\?tab=series&id=(\d+)/i);
      if (!tvdbMatch) {
        tvdbMatch = content.match(/thetvdb\.com\/series\/[^/]+\/id\/(\d+)/i);
      }
      if (!tvdbMatch) {
        tvdbMatch = content.match(/<tvdbid>(\d+)<\/tvdbid>/i);
      }
      if (!tvdbMatch && content.includes('<tvshow>')) {
        const idMatch = content.match(/<id>(\d+)<\/id>/i);
        if (idMatch?.[1]) {
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
    const results: Array<{ path: string; type: 'folder' | 'video' }> = [];
    let entries: Dirent[];

    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return results;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subResults = await this.scanDirectory(fullPath);
        results.push(...subResults);

        const hasDirectVideos = subResults.some(
          (r) => r.type === 'video' && path.dirname(r.path) === fullPath,
        );
        if (hasDirectVideos) {
          results.push({ path: fullPath, type: 'folder' });
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          results.push({ path: fullPath, type: 'video' });
        }
      }
    }

    return results;
  }
}
