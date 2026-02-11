import WebTorrent from 'webtorrent';
import { TorrentRepository } from '../repositories/TorrentRepository';
import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

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

const DEFAULT_DOWNLOAD_PATH = '/data/downloads/incomplete';
const COMPLETE_DOWNLOAD_PATH = '/data/downloads/complete';

/**
 * Singleton manager that wraps the WebTorrent client and handles
 * lifecycle events including persistence via TorrentRepository.
 */
export class TorrentManager extends EventEmitter {
  private static instance: TorrentManager | null = null;

  private client: WebTorrent.Instance | null = null;
  private initialized = false;

  private constructor(private repository: TorrentRepository) {
    super();
  }

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

    // Set up completion handler
    torrent.on('done', () => {
      this.handleTorrentCompletion(torrent);
    });

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
   * Handles torrent completion by moving files and updating the database.
   */
  private async handleTorrentCompletion(torrent: any): Promise<void> {
    const infoHash = torrent.infoHash;
    const currentPath = torrent.path;

    // Skip file move if already in complete directory (or a subdirectory of it)
    if (currentPath.startsWith(COMPLETE_DOWNLOAD_PATH)) {
      await this.repository.update(infoHash, {
        status: 'seeding',
        completedAt: new Date(),
      });
      return;
    }

    try {
      // Ensure complete directory exists
      await fs.mkdir(COMPLETE_DOWNLOAD_PATH, { recursive: true });

      // Move files from incomplete to complete
      // If the torrent is a single file, currentPath might be the file's directory.
      // If it's a folder, currentPath is the parent of that folder.
      // WebTorrent usually downloads to 'path/torrent-name'.
      const sourceDir = path.join(currentPath, torrent.name);
      const targetDir = path.join(COMPLETE_DOWNLOAD_PATH, torrent.name);

      // Check if source exists (it might not if it was a single file download directly into currentPath)
      // but usually WebTorrent creates a subfolder if there are multiple files or if it's configured so.
      // For simplicity and matching current tests/logic:
      try {
        await fs.rename(sourceDir, targetDir);
      } catch (e) {
        // Fallback: maybe the source is just currentPath itself? 
        // (This happens if 'path' was set to the exact folder containing the files)
        await fs.rename(currentPath, targetDir);
      }

      // Update the torrent's path in WebTorrent
      torrent.path = targetDir;

      // Update database
      await this.repository.update(infoHash, {
        status: 'seeding',
        path: targetDir,
        completedAt: new Date(),
      });

      this.emit('torrent:completed', {
        infoHash,
        name: torrent.name,
        path: targetDir,
      });
    } catch (error) {
      // Update status to error on failure
      await this.repository.updateStatus(infoHash, 'error');
      console.error(`Failed to move files for torrent ${infoHash}:`, error);
    }
  }

  /**
   * Returns standardized status for all torrents in the database.
   */
  async getTorrentsStatus(): Promise<any[]> {
    const torrents = await this.repository.findAll();
    return torrents.map(t => this.mapTorrentToStatus(t));
  }

  /**
   * Returns standardized status for a single torrent by infoHash.
   */
  async getTorrentStatus(infoHash: string): Promise<any> {
    const torrent = await this.repository.findByInfoHash(infoHash);
    if (!torrent) {
      throw new Error(`Torrent with infoHash '${infoHash}' not found in database`);
    }
    return this.mapTorrentToStatus(torrent);
  }

  /**
   * Maps a database Torrent record to a standardized status object for API responses.
   */
  private mapTorrentToStatus(torrent: any): any {
    return {
      infoHash: torrent.infoHash,
      name: torrent.name,
      status: torrent.status,
      progress: torrent.progress,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed,
      size: torrent.size.toString(),
      downloaded: torrent.downloaded.toString(),
      uploaded: torrent.uploaded.toString(),
      eta: torrent.eta,
      path: torrent.path,
      completedAt: torrent.completedAt,
    };
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

      const webTorrent = this.client!.add(source, { path: torrent.path });

      // Set up completion handler for resumed torrents
      webTorrent.on('done', () => {
        this.handleTorrentCompletion(webTorrent);
      });
    }
  }
}
