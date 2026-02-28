import { TorrentRepository } from '../repositories/TorrentRepository';
import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export interface AddTorrentOptions {
  magnetUrl?: string;
  torrentFile?: Buffer;
  path?: string;
  name?: string;
  size?: number;
}

export interface TorrentInfo {
  infoHash: string;
  name: string;
  path: string;
}

const DEFAULT_DOWNLOAD_PATH = '/data/downloads/incomplete';
const COMPLETE_DOWNLOAD_PATH = '/data/downloads/complete';
const ACTIVE_SYNC_INTERVAL_MS = 5000;
const IDLE_SYNC_INTERVAL_MS = 30000;
const INFO_HASH_WAIT_TIMEOUT_MS = 1000;
const INFO_HASH_POLL_INTERVAL_MS = 50;

/**
 * Singleton manager that wraps the WebTorrent client and handles
 * lifecycle events including persistence via TorrentRepository.
 */
export class TorrentManager extends EventEmitter {
  private static instance: TorrentManager | null = null;

  private client: any | null = null;
  private initialized = false;
  private statsSyncTimer: NodeJS.Timeout | null = null;
  private statsSyncInFlight = false;
  private statsSyncRunning = false;
  private incompleteDownloadPath = DEFAULT_DOWNLOAD_PATH;
  private completeDownloadPath = COMPLETE_DOWNLOAD_PATH;

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

    const { default: WebTorrent } = await import('webtorrent');
    this.client = new WebTorrent();
    this.initialized = true;

    await this.loadExistingTorrents();
    this.startStatsSyncLoop();
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
  getClient(): any | null {
    return this.client;
  }

  /**
   * Updates default download directories used by torrent add/completion lifecycle.
   */
  setDownloadPaths(paths: { incomplete?: string; complete?: string }): void {
    if (paths.incomplete !== undefined) {
      this.incompleteDownloadPath = paths.incomplete;
    }
    if (paths.complete !== undefined) {
      this.completeDownloadPath = paths.complete;
    }
  }

  /**
   * Returns active/idle sync interval in milliseconds.
   */
  getCurrentSyncIntervalMs(): number {
    const torrents = ((this.client as any)?.torrents ?? []) as any[];
    const hasActiveTransfers = torrents.some(torrent =>
      torrent &&
      (torrent.done === false ||
        (typeof torrent.progress === 'number' && torrent.progress < 1)),
    );
    return hasActiveTransfers ? ACTIVE_SYNC_INTERVAL_MS : IDLE_SYNC_INTERVAL_MS;
  }

  /**
   * Whether the periodic stats loop is active.
   */
  isStatsSyncRunning(): boolean {
    return this.statsSyncRunning;
  }

  /**
   * Adds a torrent from a magnet link or .torrent file buffer.
   * Downloads to /data/downloads/incomplete by default, or a custom path.
   */
  async addTorrent(options: AddTorrentOptions): Promise<TorrentInfo> {
    this.ensureInitialized();

    const source = options.magnetUrl || options.torrentFile;
    if (!source) {
      throw new Error('Either magnetUrl or torrentFile must be provided');
    }

    const configuredPath = options.path ?? this.incompleteDownloadPath;
    const downloadPath = configuredPath.trim();
    if (!downloadPath) {
      throw new Error('Incomplete download directory is not configured. Configure it in Settings > Clients.');
    }

    const torrent = this.client.add(source, { path: downloadPath });

    // Set up completion handler
    torrent.on('done', () => {
      this.handleTorrentCompletion(torrent);
    });

    const infoHash = await this.resolveInfoHash(torrent, options.magnetUrl);
    if (!infoHash) {
      try {
        (this.client as any).remove(torrent);
      } catch {
        // Best effort cleanup if torrent was added but cannot be persisted.
      }
      throw new Error('Unable to resolve torrent infoHash from source');
    }

    try {
      await this.repository.upsert({
        infoHash,
        name: torrent.name || options.name || 'Unknown',
        status: 'downloading',
        progress: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: null,
        size: BigInt(torrent.length || options.size || 0),
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
    } catch (error) {
      try {
        (this.client as any).remove(torrent);
      } catch {
        // Best effort cleanup if persistence fails.
      }
      throw error;
    }

    return {
      infoHash,
      name: torrent.name || options.name || 'Unknown',
      path: downloadPath,
    };
  }

  private async resolveInfoHash(torrent: any, magnetUrl?: string): Promise<string | undefined> {
    const immediate = this.normalizeInfoHash(torrent?.infoHash);
    if (immediate) {
      return immediate;
    }

    const fromMagnet = this.extractInfoHashFromMagnet(magnetUrl);
    if (fromMagnet) {
      return fromMagnet;
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < INFO_HASH_WAIT_TIMEOUT_MS) {
      await new Promise(resolve => setTimeout(resolve, INFO_HASH_POLL_INTERVAL_MS));
      const delayed = this.normalizeInfoHash(torrent?.infoHash);
      if (delayed) {
        return delayed;
      }
    }

    return undefined;
  }

  private extractInfoHashFromMagnet(magnetUrl?: string): string | undefined {
    if (!magnetUrl || !magnetUrl.startsWith('magnet:?')) {
      return undefined;
    }

    try {
      const url = new URL(magnetUrl);
      const xtValues = url.searchParams.getAll('xt');
      for (const xt of xtValues) {
        const match = /^urn:btih:([a-zA-Z0-9]+)$/i.exec(xt);
        if (!match) {
          continue;
        }

        const normalized = this.normalizeInfoHash(match[1]);
        if (normalized) {
          return normalized;
        }
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  private normalizeInfoHash(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const candidate = value.trim();
    if (/^[a-fA-F0-9]{40}$/.test(candidate)) {
      return candidate.toLowerCase();
    }

    if (/^[a-zA-Z2-7]{32}$/.test(candidate)) {
      const decoded = this.base32ToHex(candidate);
      return decoded;
    }

    return undefined;
  }

  private base32ToHex(input: string): string | undefined {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';

    for (const char of input.toUpperCase()) {
      const index = alphabet.indexOf(char);
      if (index < 0) {
        return undefined;
      }
      bits += index.toString(2).padStart(5, '0');
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
    }

    if (bytes.length < 20) {
      return undefined;
    }

    return bytes.slice(0, 20).map(b => b.toString(16).padStart(2, '0')).join('');
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
    const completeDownloadPath = this.completeDownloadPath.trim();

    if (!completeDownloadPath) {
      await this.repository.updateStatus(infoHash, 'error');
      console.error(
        `Complete download directory is not configured for torrent ${infoHash}. Configure it in Settings > Clients.`,
      );
      return;
    }

    // Skip file move if already in complete directory (or a subdirectory of it)
    if (currentPath.startsWith(completeDownloadPath)) {
      await this.repository.update(infoHash, {
        status: 'seeding',
        completedAt: new Date(),
      });
      return;
    }

    try {
      // Ensure complete directory exists
      await fs.mkdir(completeDownloadPath, { recursive: true });

      // Move files from incomplete to complete
      // If the torrent is a single file, currentPath might be the file's directory.
      // If it's a folder, currentPath is the parent of that folder.
      // WebTorrent usually downloads to 'path/torrent-name'.
      const sourceDir = path.join(currentPath, torrent.name);
      const targetDir = path.join(completeDownloadPath, torrent.name);

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
   * Synchronize torrent progress/speed/peer snapshots to persistence.
   */
  async syncStats(): Promise<void> {
    this.ensureInitialized();

    if (this.statsSyncInFlight) {
      console.warn('Skipping torrent stats sync cycle due to backpressure');
      return;
    }

    this.statsSyncInFlight = true;

    try {
      const torrents = ((this.client as any)?.torrents ?? []) as any[];
      for (const torrent of torrents) {
        if (!torrent?.infoHash) {
          continue;
        }

        try {
          await this.repository.updateProgress(
            torrent.infoHash,
            Number(torrent.progress ?? 0),
            Number(torrent.downloadSpeed ?? 0),
            Number(torrent.uploadSpeed ?? 0),
            BigInt(Math.floor(Number(torrent.downloaded ?? 0))),
            BigInt(Math.floor(Number(torrent.uploaded ?? 0))),
            typeof torrent.timeRemaining === 'number' && Number.isFinite(torrent.timeRemaining)
              ? Math.floor(torrent.timeRemaining)
              : null,
          );

          const peers = Array.isArray(torrent.peers)
            ? torrent.peers
              .filter((peer: any) =>
                peer &&
                typeof peer.ip === 'string' &&
                typeof peer.port === 'number')
              .map((peer: any) => ({
                ip: peer.ip,
                port: peer.port,
                client: typeof peer.client === 'string' ? peer.client : null,
              }))
            : [];

          await this.repository.syncPeers(torrent.infoHash, peers);
        } catch (error) {
          if ((error as { code?: string })?.code === 'P2025') {
            console.warn(
              `Removing unmanaged torrent ${torrent.infoHash} because no persistence row exists`,
            );
            try {
              (this.client as any).remove(torrent);
            } catch {
              // Ignore cleanup errors and continue sync loop.
            }
            continue;
          }

          console.error(
            `Failed to persist torrent stats for ${torrent.infoHash}:`,
            error,
          );
        }
      }
    } finally {
      this.statsSyncInFlight = false;
    }
  }

  /**
   * Destroys the WebTorrent client and cleans up resources.
   */
  async destroy(): Promise<void> {
    this.stopStatsSyncLoop();

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

  private startStatsSyncLoop(): void {
    if (this.statsSyncRunning) {
      return;
    }

    this.statsSyncRunning = true;
    this.scheduleNextStatsSyncCycle();
  }

  private stopStatsSyncLoop(): void {
    this.statsSyncRunning = false;
    if (this.statsSyncTimer) {
      clearTimeout(this.statsSyncTimer);
      this.statsSyncTimer = null;
    }
  }

  private scheduleNextStatsSyncCycle(): void {
    if (!this.statsSyncRunning) {
      return;
    }

    const intervalMs = this.getCurrentSyncIntervalMs();
    this.statsSyncTimer = setTimeout(async () => {
      await this.syncStats();
      this.scheduleNextStatsSyncCycle();
    }, intervalMs);
  }
}
