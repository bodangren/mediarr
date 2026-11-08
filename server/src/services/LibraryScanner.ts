import fs from 'node:fs/promises';
import path from 'node:path';
import { releaseParser } from './ReleaseParser';

/**
 * Service to scan local directories for existing media files and match them to episodes.
 */
export class LibraryScanner {
  private static videoExtensions = new Set(['.mkv', '.mp4', '.avi', '.ts', '.m4v']);

  constructor(private readonly prisma: any) {}

  /**
   * Scan a series directory recursively.
   */
  async scanSeries(series: { id: number; path: string; title: string }): Promise<void> {
    if (!series.path) return;

    try {
      await fs.access(series.path);
    } catch (error) {
      console.warn(`Series path ${series.path} is not accessible`);
      return;
    }

    const files = await this.getAllFiles(series.path);
    
    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      if (!LibraryScanner.videoExtensions.has(ext)) continue;

      const filename = path.basename(filePath);
      const parsed = await releaseParser.parse(filename);

      if (parsed && parsed.seasonNumber !== undefined && parsed.episodeNumbers.length > 0) {
        // Find matching episode in DB
        const episode = await this.prisma.episode.findFirst({
          where: {
            seriesId: series.id,
            seasonNumber: parsed.seasonNumber,
            episodeNumber: parsed.episodeNumbers[0],
          }
        });

        if (episode) {
          await this.prisma.episode.update({
            where: { id: episode.id },
            data: { path: filePath }
          });
        }
      }
    }
  }

  /**
   * Scan a movie directory and attach an existing movie file path.
   */
  async scanMovie(movie: { id: number; path: string; title: string; year: number }): Promise<void> {
    if (!movie.path) return;

    try {
      await fs.access(movie.path);
    } catch {
      console.warn(`Movie path ${movie.path} is not accessible`);
      return;
    }

    const files = await this.getAllFiles(movie.path);
    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      if (!LibraryScanner.videoExtensions.has(ext)) continue;
      if (!this.matchesMovieFile(movie, filePath)) continue;

      await this.prisma.movie.update({
        where: { id: movie.id },
        data: { path: filePath },
      });
      return;
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    return collectFiles(dir);
  }

  private matchesMovieFile(movie: { title: string; year: number }, filePath: string): boolean {
    const filename = path.basename(filePath).toLowerCase();
    const cleanTitle = movie.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanFilename = filename.replace(/[^a-z0-9]/g, '');
    const hasTitle = cleanFilename.includes(cleanTitle);
    const hasYear = cleanFilename.includes(String(movie.year));
    return hasTitle && hasYear;
  }
}


export interface ScanIo {
  readdir(dir: string): Promise<string[]>;
  stat(file: string): Promise<{ isDirectory(): boolean }>;
}

/**
 * Recursively lists files, skipping unreadable directories/entries with a warning instead of aborting
 * the whole scan (tech-debt 2026-07-28: one unreadable subdirectory failed an entire library scan).
 */
export async function collectFiles(
  dir: string,
  io: ScanIo = fs,
  warn: (message: string) => void = (message) => console.warn(message),
): Promise<string[]> {
  let names: string[];
  try {
    names = await io.readdir(dir);
  } catch (error) {
    warn(`Skipping unreadable directory ${dir}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }

  const results: string[] = [];
  for (const name of names) {
    const filePath = path.join(dir, name);
    let stat: { isDirectory(): boolean };
    try {
      stat = await io.stat(filePath);
    } catch (error) {
      warn(`Skipping unreadable entry ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (stat.isDirectory()) {
      results.push(...await collectFiles(filePath, io, warn));
    } else {
      results.push(filePath);
    }
  }
  return results;
}
