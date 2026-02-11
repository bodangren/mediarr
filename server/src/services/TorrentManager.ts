import WebTorrent from 'webtorrent';
import { TorrentRepository } from '../repositories/TorrentRepository';

/**
 * Singleton manager that wraps the WebTorrent client and handles
 * lifecycle events including persistence via TorrentRepository.
 */
export class TorrentManager {
  private static instance: TorrentManager | null = null;

  private client: WebTorrent.Instance | null = null;
  private initialized = false;

  private constructor(private repository: TorrentRepository) {}

  /**
   * Returns the singleton TorrentManager instance.
   */
  static getInstance(repository: TorrentRepository): TorrentManager {
    if (!TorrentManager.instance) {
      TorrentManager.instance = new TorrentManager(repository);
    }
    return TorrentManager.instance;
  }

  /**
   * Resets the singleton (for testing only).
   */
  static resetInstance(): void {
    TorrentManager.instance = null;
  }

  /**
   * Initializes the WebTorrent client and loads existing torrents from the database.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.client = new WebTorrent();
    this.initialized = true;

    await this.loadExistingTorrents();
  }

  /**
   * Whether the manager has been initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Returns the underlying WebTorrent client.
   */
  getClient(): WebTorrent.Instance | null {
    return this.client;
  }

  /**
   * Destroys the WebTorrent client and cleans up resources.
   */
  async destroy(): Promise<void> {
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client!.destroy(() => resolve());
      });
      this.client = null;
    }
    this.initialized = false;
    TorrentManager.instance = null;
  }

  /**
   * Loads existing torrents from the database and re-adds active ones to the client.
   */
  private async loadExistingTorrents(): Promise<void> {
    const torrents = await this.repository.findAll();

    for (const torrent of torrents) {
      // Only re-add torrents that were actively downloading or seeding
      if (torrent.status !== 'downloading' && torrent.status !== 'seeding') {
        continue;
      }

      const source = torrent.magnetUrl || torrent.torrentFile;
      if (!source) {
        // Can't resume without a magnet URL or torrent file
        await this.repository.updateStatus(torrent.infoHash, 'error');
        continue;
      }

      this.client!.add(source, { path: torrent.path });
    }
  }
}
