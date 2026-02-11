import fs from 'node:fs/promises';
import path from 'node:path';
import { Parser } from '../utils/Parser';

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
      const parsed = Parser.parse(filename);

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

  private async getAllFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    const list = await fs.readdir(dir);

    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        const subFiles = await this.getAllFiles(filePath);
        results.push(...subFiles);
      } else {
        results.push(filePath);
      }
    }

    return results;
  }
}
