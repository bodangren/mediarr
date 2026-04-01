import { TorrentManager } from './TorrentManager';
import { TorrentRepository } from '../repositories/TorrentRepository';
import { isImportIncomplete } from './importGuard';

interface SeedingProtectorPrisma {
  episode: {
    findUnique: (args: { where: { id: number }; select: { path: true } }) => Promise<{ path: string | null } | null>;
  };
  movie: {
    findUnique: (args: { where: { id: number }; select: { path: true } }) => Promise<{ path: string | null } | null>;
  };
}

export class SeedingProtector {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private manager: TorrentManager,
    private repository: TorrentRepository,
    private prisma?: SeedingProtectorPrisma,
  ) {}

  start(intervalMs: number = 60000): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.checkLimits(), intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkLimits(): Promise<void> {
    const torrents = await this.repository.findAll();

    for (const torrent of torrents) {
      if (torrent.status !== 'seeding') continue;

      let shouldStop = false;

      if (torrent.stopAtRatio !== null && torrent.ratio >= torrent.stopAtRatio) {
        shouldStop = true;
      }

      if (torrent.stopAtTime !== null && torrent.completedAt) {
        const minutesSeeding = (Date.now() - torrent.completedAt.getTime()) / 60000;
        if (minutesSeeding >= torrent.stopAtTime) {
          shouldStop = true;
        }
      }

      if (!shouldStop) continue;

      const importGuard = await isImportIncomplete(this.prisma, torrent);
      if (importGuard.incomplete) {
        console.log(
          `SeedingProtector: Skipping removal of ${torrent.infoHash} — linked media not yet imported (${importGuard.reason}).`,
        );
        continue;
      }

      try {
        await this.manager.removeTorrent(torrent.infoHash);
        console.log(`SeedingProtector: Stopped torrent ${torrent.infoHash} due to limits reached.`);
      } catch (error) {
        console.error(`SeedingProtector: Failed to stop torrent ${torrent.infoHash}:`, error);
      }
    }
  }
}
