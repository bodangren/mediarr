import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';

export interface ScanSummary {
  moviesAdded: number;
  moviesMissing: number;
  tvEpisodesAdded: number;
  tvEpisodesMissing: number;
  subtitleFilesDetected: number;
  durationMs: number;
}

const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.ts', '.m4v']);
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.ass', '.sub', '.vtt']);

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries: { name: string }[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if ((entry as any).isDirectory()) {
      results.push(...await walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

export class LibraryScanService {
  constructor(private readonly prisma: PrismaClient) {}

  async scanAll(settings: { movieRootFolder: string; tvRootFolder: string }): Promise<ScanSummary> {
    const start = Date.now();
    let moviesAdded = 0;
    let moviesMissing = 0;
    let tvEpisodesAdded = 0;
    let tvEpisodesMissing = 0;
    let subtitleFilesDetected = 0;

    if (settings.movieRootFolder) {
      const r = await this.scanMovies(settings.movieRootFolder);
      moviesAdded += r.added;
      moviesMissing += r.missing;
      subtitleFilesDetected += r.subtitles;
    }

    if (settings.tvRootFolder) {
      const r = await this.scanEpisodes(settings.tvRootFolder);
      tvEpisodesAdded += r.added;
      tvEpisodesMissing += r.missing;
      subtitleFilesDetected += r.subtitles;
    }

    return { moviesAdded, moviesMissing, tvEpisodesAdded, tvEpisodesMissing, subtitleFilesDetected, durationMs: Date.now() - start };
  }

  private async scanMovies(rootPath: string): Promise<{ added: number; missing: number; subtitles: number }> {
    let added = 0;
    let missing = 0;
    let subtitles = 0;

    // Find all movies in DB
    const movies: Array<{ id: number; path: string | null; title: string; year: number }> =
      await (this.prisma as any).movie.findMany({ select: { id: true, path: true, title: true, year: true } });

    // Build a set of paths on disk
    const allFiles = await walkDir(rootPath);
    const videoFilesOnDisk = new Set(allFiles.filter(f => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase())));
    subtitles += allFiles.filter(f => SUBTITLE_EXTENSIONS.has(path.extname(f).toLowerCase())).length;

    // Check DB records against disk
    for (const movie of movies) {
      if (!movie.path) continue;
      const exists = await this.pathExists(movie.path);
      if (!exists) {
        // Mark movie path as null (missing) only if it was previously set
        await (this.prisma as any).movie.update({ where: { id: movie.id }, data: { path: null } });
        missing++;
      }
    }

    // Check disk files without DB records - find any video file that matches a movie by title+year
    const dbPaths = new Set(movies.filter(m => m.path).map(m => m.path!));
    for (const videoFile of videoFilesOnDisk) {
      if (dbPaths.has(videoFile)) continue;
      // Try to match by filename
      const filename = path.basename(videoFile).toLowerCase();
      for (const movie of movies) {
        if (movie.path) continue; // already has a path
        const cleanTitle = movie.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanFilename = filename.replace(/[^a-z0-9]/g, '');
        if (cleanFilename.includes(cleanTitle) && cleanFilename.includes(String(movie.year))) {
          await (this.prisma as any).movie.update({ where: { id: movie.id }, data: { path: videoFile } });
          added++;
          break;
        }
      }
    }

    return { added, missing, subtitles };
  }

  private async scanEpisodes(rootPath: string): Promise<{ added: number; missing: number; subtitles: number }> {
    let added = 0;
    let missing = 0;
    let subtitles = 0;

    const allFiles = await walkDir(rootPath);
    const videoFilesOnDisk = new Set(allFiles.filter(f => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase())));
    subtitles += allFiles.filter(f => SUBTITLE_EXTENSIONS.has(path.extname(f).toLowerCase())).length;

    // Check DB episodes against disk
    const episodes: Array<{ id: number; path: string | null }> =
      await (this.prisma as any).episode.findMany({ select: { id: true, path: true } });

    for (const ep of episodes) {
      if (!ep.path) continue;
      const exists = await this.pathExists(ep.path);
      if (!exists) {
        await (this.prisma as any).episode.update({ where: { id: ep.id }, data: { path: null } });
        missing++;
      }
    }

    // Find videos on disk with no matching DB path (new files)
    const dbEpPaths = new Set(episodes.filter(e => e.path).map(e => e.path!));
    for (const videoFile of videoFilesOnDisk) {
      if (!dbEpPaths.has(videoFile)) {
        // We can't auto-match episodes without metadata — just count new files for the summary
        added++;
      }
    }

    return { added, missing, subtitles };
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
