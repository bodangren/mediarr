import { Parser } from '../utils/Parser';
import { Organizer } from './Organizer';
import { ActivityEventEmitter } from './ActivityEventEmitter';
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Service to bridge TorrentManager and Organizer for TV shows.
 * Listens for completed torrents and attempts to import them if they match a known series.
 */
export class ImportManager {
  constructor(
    private readonly torrentManager: any,
    private readonly organizer: Organizer,
    private readonly prisma: any,
    private readonly activityEventEmitter?: ActivityEventEmitter,
  ) {
    this.torrentManager.on('torrent:completed', (torrent: any) => {
      this.handleTorrentCompleted(torrent).catch(err => {
        console.error('Failed to import completed torrent:', err);
        this.activityEventEmitter?.emit({
          eventType: 'IMPORT_COMPLETED',
          sourceModule: 'import-manager',
          entityRef: `torrent:${torrent.infoHash}`,
          summary: `Import failed for ${torrent.name}`,
          success: false,
          details: { reason: err?.message ?? 'unknown error' },
          occurredAt: new Date(),
        });
      });
    });
  }

  private async handleTorrentCompleted(torrent: { infoHash: string; name: string; path: string }): Promise<void> {
    const files = await this.getFiles(torrent.path);
    
    for (const filePath of files) {
      const filename = path.basename(filePath);
      const parsed = Parser.parse(filename);

      if (parsed && parsed.seriesTitle) {
        // Try to find series by title (fuzzy match or exact)
        // For now, simple exact match or lowercase match
        const series = await this.prisma.series.findFirst({
          where: {
            OR: [
              { title: { contains: parsed.seriesTitle } },
              { cleanTitle: { contains: parsed.seriesTitle.toLowerCase().replace(/\s/g, '') } }
            ]
          }
        });

        if (series) {
          const episode = await this.prisma.episode.findFirst({
            where: {
              seriesId: series.id,
              seasonNumber: parsed.seasonNumber,
              episodeNumber: parsed.episodeNumbers[0]
            }
          });

          if (episode) {
            const newPath = await this.organizer.organizeFile(filePath, series, episode);
            await this.prisma.episode.update({
              where: { id: episode.id },
              data: { path: newPath }
            });

            await this.activityEventEmitter?.emit({
              eventType: 'IMPORT_COMPLETED',
              sourceModule: 'import-manager',
              entityRef: `torrent:${torrent.infoHash}`,
              summary: `Imported ${filename}`,
              success: true,
              occurredAt: new Date(),
            });
          }
        }
      }
    }
  }

  private async getFiles(dir: string): Promise<string[]> {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      return [dir];
    }

    const results: string[] = [];
    const list = await fs.readdir(dir);

    for (const file of list) {
      const filePath = path.join(dir, file);
      const fileStat = await fs.stat(filePath);

      if (fileStat.isDirectory()) {
        const subFiles = await this.getFiles(filePath);
        results.push(...subFiles);
      } else {
        const ext = path.extname(filePath).toLowerCase();
        if (['.mkv', '.mp4', '.avi', '.ts', '.m4v'].includes(ext)) {
          results.push(filePath);
        }
      }
    }

    return results;
  }
}
