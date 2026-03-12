import { TorrentManager } from './TorrentManager';
import { TorrentRepository } from '../repositories/TorrentRepository';

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

  /**
   * Starts the periodic check for seeding limits.
   * @param intervalMs How often to check in milliseconds (default: 1 minute)
   */
  start(intervalMs: number = 60000): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.checkLimits(), intervalMs);
  }

  /**
   * Stops the periodic check.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Checks all seeding torrents against their configured limits.
   * Skips removal for torrents whose linked episode or movie has not yet been imported.
   */
  async checkLimits(): Promise<void> {
    const torrents = await this.repository.findAll();

    for (const torrent of torrents) {
      if (torrent.status !== 'seeding') continue;

      let shouldStop = false;

      // Check ratio limit
      if (torrent.stopAtRatio !== null && torrent.ratio >= torrent.stopAtRatio) {
        shouldStop = true;
      }

      // Check time limit (in minutes)
      if (torrent.stopAtTime !== null && torrent.completedAt) {
        const minutesSeeding = (Date.now() - torrent.completedAt.getTime()) / 60000;
        if (minutesSeeding >= torrent.stopAtTime) {
          shouldStop = true;
        }
      }

      if (!shouldStop) continue;

      // Guard: do not delete the torrent if the linked media has not been imported.
      // Removing files for a failed import would make retrying impossible.
      const importGuard = await this.isImportIncomplete(torrent);
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

  /**
   * Returns true when the torrent has a linked media record that has not yet
   * been imported (path is null or the record no longer exists).
   */
  private async isImportIncomplete(
    torrent: { infoHash: string; episodeId: number | null; movieId: number | null },
  ): Promise<{ incomplete: boolean; reason?: string }> {
    if (!this.prisma) {
      return { incomplete: false };
    }

    if (torrent.episodeId !== null) {
      const episode = await this.prisma.episode.findUnique({
        where: { id: torrent.episodeId },
        select: { path: true },
      });
      if (!episode) {
        return { incomplete: true, reason: `episode id=${torrent.episodeId} not found` };
      }
      if (!episode.path) {
        return { incomplete: true, reason: `episode id=${torrent.episodeId} has no path (import pending)` };
      }
    }

    if (torrent.movieId !== null) {
      const movie = await this.prisma.movie.findUnique({
        where: { id: torrent.movieId },
        select: { path: true },
      });
      if (!movie) {
        return { incomplete: true, reason: `movie id=${torrent.movieId} not found` };
      }
      if (!movie.path) {
        return { incomplete: true, reason: `movie id=${torrent.movieId} has no path (import pending)` };
      }
    }

    return { incomplete: false };
  }
}
