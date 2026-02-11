import { TorrentManager } from './TorrentManager';
import { TorrentRepository } from '../repositories/TorrentRepository';

export class SeedingProtector {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private manager: TorrentManager,
    private repository: TorrentRepository
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

      if (shouldStop) {
        try {
          await this.manager.removeTorrent(torrent.infoHash);
          console.log(`SeedingProtector: Stopped torrent ${torrent.infoHash} due to limits reached.`);
        } catch (error) {
          console.error(`SeedingProtector: Failed to stop torrent ${torrent.infoHash}:`, error);
        }
      }
    }
  }
}
