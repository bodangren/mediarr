import WebTorrent from 'webtorrent';
import { TorrentRepository } from '../repositories/TorrentRepository';

export interface AddTorrentOptions {
  magnetUrl?: string;
  torrentFile?: Buffer;
  path?: string;
}

export interface TorrentInfo {
  infoHash: string;
  name: string;
  path: string;
}

const DEFAULT_DOWNLOAD_PATH = '/downloads/incomplete';

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
   * Adds a torrent from a magnet link or .torrent file buffer.
   * Downloads to /downloads/incomplete by default, or a custom path.
   */
  async addTorrent(options: AddTorrentOptions): Promise<TorrentInfo> {
    this.ensureInitialized();

    const source = options.magnetUrl || options.torrentFile;
    if (!source) {
      throw new Error('Either magnetUrl or torrentFile must be provided');
    }

    const downloadPath = options.path || DEFAULT_DOWNLOAD_PATH;

    const torrent = this.client.add(source, { path: downloadPath });

    await this.repository.upsert({
      infoHash: torrent.infoHash,
      name: torrent.name || 'Unknown',
      status: 'downloading',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      eta: null,
      size: BigInt(torrent.length || 0),
      downloaded: BigInt(0),
      uploaded: BigInt(0),
      ratio: 0,
      path: downloadPath,
      completedAt: null,
      stopAtRatio: null,
      stopAtTime: null,
      magnetUrl: options.magnetUrl || null,
      torrentFile: options.torrentFile || null,
    });

    return {
      infoHash: torrent.infoHash,
      name: torrent.name || 'Unknown',
      path: downloadPath,
    };
  }

  /**
   * Sets the global download speed limit in bytes/sec. Use -1 to remove the limit.
   */
  setDownloadSpeedLimit(bytesPerSecond: number): void {
    this.ensureInitialized();
    (this.client as any).throttleDownload(bytesPerSecond);
  }

  /**
   * Sets the global upload speed limit in bytes/sec. Use -1 to remove the limit.
   */
  setUploadSpeedLimit(bytesPerSecond: number): void {
    this.ensureInitialized();
    (this.client as any).throttleUpload(bytesPerSecond);
  }

  /**
   * Sets both download and upload speed limits at once.
   */
  setSpeedLimits(limits: { download?: number; upload?: number }): void {
    if (limits.download !== undefined) {
      this.setDownloadSpeedLimit(limits.download);
    }
    if (limits.upload !== undefined) {
      this.setUploadSpeedLimit(limits.upload);
    }
  }

  /**
   * Finds a torrent in the WebTorrent client by infoHash. Throws if not found.
   */
  private findTorrentOrThrow(infoHash: string): any {
    const torrent = (this.client as any).get(infoHash);
    if (!torrent) {
      throw new Error(`Torrent with infoHash '${infoHash}' not found`);
    }
    return torrent;
  }

  /**
   * Guards that the manager is initialized. Throws if not.
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw new Error('TorrentManager is not initialized');
    }
  }

  /**
   * Pauses a torrent and updates the database status to 'paused'.
   */
  async pauseTorrent(infoHash: string): Promise<void> {
    this.ensureInitialized();
    const torrent = this.findTorrentOrThrow(infoHash);
    torrent.pause();
    await this.repository.updateStatus(infoHash, 'paused');
  }

  /**
   * Resumes a paused torrent and updates the database status to 'downloading'.
   */
  async resumeTorrent(infoHash: string): Promise<void> {
    this.ensureInitialized();
    const torrent = this.findTorrentOrThrow(infoHash);
    torrent.resume();
    await this.repository.updateStatus(infoHash, 'downloading');
  }

  /**
   * Removes a torrent from the client and deletes it from the database.
   */
  async removeTorrent(infoHash: string): Promise<void> {
    this.ensureInitialized();
    const torrent = this.findTorrentOrThrow(infoHash);
    (this.client as any).remove(torrent);
    await this.repository.delete(infoHash);
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
