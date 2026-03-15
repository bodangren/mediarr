import { TorrentRepository } from '../repositories/TorrentRepository';
import type { Torrent } from '@prisma/client';
import { promises as fs, constants as fsConstants } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export interface AddTorrentOptions {
  magnetUrl?: string;
  torrentFile?: Buffer;
  path?: string;
  name?: string;
  size?: number;
  episodeId?: number;
  movieId?: number;
}

export interface TorrentInfo {
  infoHash: string;
  name: string;
  path: string;
}

const DEFAULT_DOWNLOAD_PATH = '/data/downloads/incomplete';
const COMPLETE_DOWNLOAD_PATH = '/data/downloads/complete';
const DEFAULT_MAGNET_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
];
const ACTIVE_SYNC_INTERVAL_MS = 5000;
const IDLE_SYNC_INTERVAL_MS = 30000;
const INFO_HASH_WAIT_TIMEOUT_MS = 1000;
const INFO_HASH_POLL_INTERVAL_MS = 50;
const SQLITE_INT_MAX = 2_147_483_647;

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
  
  private seedRatioLimit: number = 0;
  private seedTimeLimitMinutes: number = 0;
  private seedLimitAction: 'pause' | 'remove' = 'pause';
  private maxActiveDownloads: number = 0; // 0 = unlimited

  // Tracks the DB-stored uploaded bytes at the start of each session per torrent,
  // so that lifetime upload totals survive WebTorrent restarting its session counters.
  private sessionUploadedBaselines = new Map<string, bigint>();

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

    // @ts-ignore - webtorrent has no bundled types
    const { default: WebTorrent } = await import('webtorrent');
    this.client = new WebTorrent();
    (this.client as any).on('error', (error: unknown) => {
      console.error('WebTorrent client error:', error);
    });
    (this.client as any).on('warning', (warning: unknown) => {
      console.warn('WebTorrent client warning:', warning);
    });
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
   * Updates default download directories and seed limits used by torrent lifecycle.
   */
  setDownloadPaths(settings: {
    incomplete?: string;
    complete?: string;
    seedRatioLimit?: number;
    seedTimeLimitMinutes?: number;
    seedLimitAction?: 'pause' | 'remove';
    maxActiveDownloads?: number;
  }): void {
    if (settings.incomplete !== undefined) {
      this.incompleteDownloadPath = settings.incomplete;
    }
    if (settings.complete !== undefined) {
      this.completeDownloadPath = settings.complete;
    }
    if (settings.seedRatioLimit !== undefined) {
      this.seedRatioLimit = settings.seedRatioLimit;
    }
    if (settings.seedTimeLimitMinutes !== undefined) {
      this.seedTimeLimitMinutes = settings.seedTimeLimitMinutes;
    }
    if (settings.seedLimitAction !== undefined) {
      this.seedLimitAction = settings.seedLimitAction;
    }
    if (settings.maxActiveDownloads !== undefined) {
      this.maxActiveDownloads = settings.maxActiveDownloads;
    }
  }

  /**
   * Checks if a seeding torrent has exceeded its configured ratio or time limits.
   * If a limit is exceeded, applies the configured action (pause or remove).
   * Accepts the already-fetched DB record to avoid a redundant round-trip.
   */
  public async checkSeedLimits(dbTorrent: Torrent): Promise<void> {
    if (dbTorrent.status !== 'seeding' || !dbTorrent.completedAt) {
      return;
    }

    const effectiveRatioLimit = dbTorrent.stopAtRatio ?? this.seedRatioLimit;
    const effectiveTimeLimit = dbTorrent.stopAtTime ?? this.seedTimeLimitMinutes;

    let limitReached = false;
    let reason = '';

    if (effectiveRatioLimit > 0 && dbTorrent.ratio >= effectiveRatioLimit) {
      limitReached = true;
      reason = `Ratio limit reached: ${dbTorrent.ratio.toFixed(2)} >= ${effectiveRatioLimit}`;
    } else if (effectiveTimeLimit > 0) {
      const minutesSeeding = (Date.now() - dbTorrent.completedAt.getTime()) / (1000 * 60);
      if (minutesSeeding >= effectiveTimeLimit) {
        limitReached = true;
        reason = `Time limit reached: ${Math.floor(minutesSeeding)} >= ${effectiveTimeLimit} minutes`;
      }
    }

    if (limitReached) {
      const { infoHash, name } = dbTorrent;
      const action = this.seedLimitAction;
      console.log(`Torrent ${infoHash} reached seed limit (${reason}). Action: ${action}`);

      if (action === 'pause') {
        await this.pauseTorrent(infoHash);
      } else {
        await this.removeTorrent(infoHash);
      }

      this.emit('torrent:seeding_complete', { infoHash, name, reason });
    }
  }
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

    const preparedMagnetUrl = this.prepareMagnetUrl(options.magnetUrl, options.name);
    const source = preparedMagnetUrl || options.torrentFile;
    if (!source) {
      throw new Error('Either magnetUrl or torrentFile must be provided');
    }

    const configuredPath = options.path ?? this.incompleteDownloadPath;
    const downloadPath = configuredPath.trim();
    if (!downloadPath) {
      throw new Error('Incomplete download directory is not configured. Configure it in Settings > Clients.');
    }

    const atLimit = this.maxActiveDownloads > 0
      && (await this.repository.countByStatus('downloading')) >= this.maxActiveDownloads;

    const infoHashHint = this.extractInfoHashFromMagnet(preparedMagnetUrl);
    if (infoHashHint) {
      const existingRow = await this.repository.findByInfoHash(infoHashHint);
      if (existingRow) {
        return {
          infoHash: existingRow.infoHash,
          name: existingRow.name,
          path: existingRow.path,
        };
      }

      const existingClientTorrent = await this.findTorrent(infoHashHint);
      if (existingClientTorrent) {
        return {
          infoHash: infoHashHint,
          name: existingClientTorrent.name || options.name || 'Unknown',
          path: existingClientTorrent.path || downloadPath,
        };
      }
    }

    // If the active download limit is reached, store the torrent as queued so it
    // is visible in the UI and will be promoted automatically when a slot opens.
    if (atLimit) {
      // We don't have an infoHash yet (magnet requires network resolution), so
      // use the hint from the magnet URI if available, otherwise use a placeholder.
      const queuedInfoHash = infoHashHint ?? `queued-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await this.repository.upsert({
        infoHash: queuedInfoHash,
        name: options.name ?? 'Unknown',
        status: 'queued',
        progress: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: null,
        size: BigInt(options.size ?? 0),
        downloaded: BigInt(0),
        uploaded: BigInt(0),
        ratio: 0,
        path: downloadPath,
        completedAt: null,
        stopAtRatio: null,
        stopAtTime: null,
        magnetUrl: preparedMagnetUrl ?? null,
        torrentFile: options.torrentFile ?? null,
        episodeId: options.episodeId ?? null,
        movieId: options.movieId ?? null,
      });
      return { infoHash: queuedInfoHash, name: options.name ?? 'Unknown', path: downloadPath };
    }

    const torrent = this.client.add(source, { path: downloadPath });

    this.attachTorrentLifecycleHandlers(torrent);

    const infoHash = await this.resolveInfoHash(torrent, preparedMagnetUrl);
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
        magnetUrl: preparedMagnetUrl || null,
        torrentFile: options.torrentFile || null,
        episodeId: options.episodeId ?? null,
        movieId: options.movieId ?? null,
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

  private prepareMagnetUrl(magnetUrl?: string, name?: string): string | undefined {
    if (!magnetUrl || !magnetUrl.startsWith('magnet:?')) {
      return magnetUrl;
    }

    const normalized = this.normalizeMagnetParameters(magnetUrl);
    const hasTrackers = /(?:[?&])tr=/i.test(normalized);
    const hasDisplayName = /(?:[?&])dn=/i.test(normalized);

    let result = normalized;
    if (!hasTrackers) {
      for (const tracker of DEFAULT_MAGNET_TRACKERS) {
        const separator = result.includes('?') ? '&' : '?';
        result += `${separator}tr=${tracker}`;
      }
    }

    if (name && !hasDisplayName) {
      const separator = result.includes('?') ? '&' : '?';
      result += `${separator}dn=${encodeURIComponent(name)}`;
    }

    return result;
  }

  private normalizeMagnetParameters(magnetUrl: string): string {
    const [base, query = ''] = magnetUrl.split('?', 2);
    const params = query
      .split('&')
      .filter(Boolean)
      .map((pair) => {
        const eqIndex = pair.indexOf('=');
        if (eqIndex < 0) {
          return pair;
        }

        const key = pair.slice(0, eqIndex);
        const value = pair.slice(eqIndex + 1);
        if (key === 'xt' || key === 'tr') {
          try {
            return `${key}=${decodeURIComponent(value)}`;
          } catch {
            return pair;
          }
        }
        return pair;
      });

    if (params.length === 0) {
      return base;
    }

    return `${base}?${params.join('&')}`;
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
  private async findTorrent(infoHash: string): Promise<any | null> {
    const client = this.client as any;
    if (typeof client.get === 'function') {
      const maybeTorrent = client.get(infoHash);
      const torrent = typeof maybeTorrent?.then === 'function'
        ? await maybeTorrent
        : maybeTorrent;
      return torrent ?? null;
    }

    const torrents = Array.isArray(client.torrents) ? client.torrents : [];
    return torrents.find((torrent: any) => torrent?.infoHash === infoHash) ?? null;
  }

  /**
   * Finds a torrent in the WebTorrent client by infoHash. Throws if not found.
   */
  private async findTorrentOrThrow(infoHash: string): Promise<any> {
    const torrent = await this.findTorrent(infoHash);
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
    const torrent = await this.findTorrentOrThrow(infoHash);
    torrent.pause();
    await this.repository.updateStatus(infoHash, 'paused');
  }

  /**
   * Resumes a paused torrent and updates the database status to 'downloading'.
   */
  async resumeTorrent(infoHash: string): Promise<void> {
    this.ensureInitialized();
    const torrent = await this.findTorrentOrThrow(infoHash);
    torrent.resume();
    await this.repository.updateStatus(infoHash, 'downloading');
  }

  /**
   * Removes a torrent from the client, deletes its files from disk, and deletes it from the database.
   */
  async removeTorrent(infoHash: string): Promise<void> {
    this.ensureInitialized();

    // Fetch DB record first to get the path and status before we delete it
    const dbTorrent = await this.repository.findByInfoHash(infoHash);

    // Queued torrents exist only in the DB — skip the WebTorrent removal attempt
    if (dbTorrent?.status !== 'queued') {
      try {
        const torrent = await this.findTorrentOrThrow(infoHash);
        (this.client as any).remove(torrent, { destroyStore: true });
      } catch (error) {
        if (!(error instanceof Error) || !/not found/i.test(error.message)) {
          throw error;
        }
      }
    }
    
    // Delete files manually to be safe, especially if they were moved to the completed folder
    if (dbTorrent && dbTorrent.path && dbTorrent.name) {
      try {
        const fullPath = path.join(dbTorrent.path, dbTorrent.name);
        await fs.rm(fullPath, { recursive: true, force: true });
      } catch (fsError) {
        console.error(`Failed to delete files for torrent ${infoHash} at ${dbTorrent.path}:`, fsError);
      }
    }

    const wasDownloading = dbTorrent?.status === 'downloading';
    await this.repository.delete(infoHash);
    this.sessionUploadedBaselines.delete(infoHash);

    // Freeing an active download slot may allow a queued torrent to start.
    if (wasDownloading) {
      void this.promoteNextQueued();
    }
  }

  /**
   * If slots are available, promotes the oldest queued torrent to actively downloading.
   * Called after a download finishes, errors out, or is removed.
   */
  private async promoteNextQueued(): Promise<void> {
    if (this.maxActiveDownloads > 0) {
      const activeCount = await this.repository.countByStatus('downloading');
      if (activeCount >= this.maxActiveDownloads) return;
    }

    const queued = await this.repository.findOldestQueued();
    if (!queued) return;

    const source = queued.magnetUrl
      ? this.normalizeMagnetParameters(queued.magnetUrl)
      : queued.torrentFile;
    if (!source) {
      await this.repository.updateStatus(queued.infoHash, 'error');
      return;
    }

    try {
      await this.repository.updateStatus(queued.infoHash, 'downloading');
      const torrent = this.client!.add(source, { path: queued.path });
      this.attachTorrentLifecycleHandlers(torrent);

      // Once the real infoHash resolves, update the DB record (the queued row may
      // have used a placeholder hash if only a torrent file was available).
      const resolvedHash = await this.resolveInfoHash(torrent, queued.magnetUrl ?? undefined);
      if (resolvedHash && resolvedHash !== queued.infoHash) {
        await this.repository.delete(queued.infoHash);
        await this.repository.upsert({
          infoHash: resolvedHash,
          name: torrent.name || queued.name,
          status: 'downloading',
          progress: 0,
          downloadSpeed: 0,
          uploadSpeed: 0,
          eta: null,
          size: BigInt(torrent.length || 0),
          downloaded: BigInt(0),
          uploaded: BigInt(0),
          ratio: 0,
          path: queued.path,
          completedAt: null,
          stopAtRatio: queued.stopAtRatio,
          stopAtTime: queued.stopAtTime,
          magnetUrl: queued.magnetUrl,
          torrentFile: queued.torrentFile,
          episodeId: queued.episodeId,
          movieId: queued.movieId,
        });
      }
    } catch (err) {
      console.error(`Failed to promote queued torrent ${queued.infoHash}:`, err);
      await this.repository.updateStatus(queued.infoHash, 'error');
    }
  }

  private attachTorrentLifecycleHandlers(torrent: any): void {
    torrent.on('done', () => {
      void this.handleTorrentCompletion(torrent);
    });

    torrent.on('warning', (warning: unknown) => {
      const torrentRef = this.normalizeInfoHash(torrent?.infoHash) ?? torrent?.name ?? 'unknown';
      console.warn(`WebTorrent warning for ${torrentRef}:`, warning);
    });

    torrent.on('error', (error: unknown) => {
      const infoHash = this.normalizeInfoHash(torrent?.infoHash);
      const torrentRef = infoHash ?? torrent?.name ?? 'unknown';
      console.error(`WebTorrent error for ${torrentRef}:`, error);

      if (infoHash) {
        void this.repository
          .updateStatus(infoHash, 'error')
          .then(() => this.promoteNextQueued())
          .catch((persistError: unknown) => {
            console.error(`Failed to persist error status for ${infoHash}:`, persistError);
          });
      }
    });
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
      void this.promoteNextQueued();
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

      // Update the torrent's path in WebTorrent to the parent directory so that
      // on restart, client.add(source, { path }) correctly resolves files at
      // completeDownloadPath/torrent.name rather than double-nesting the name.
      torrent.path = completeDownloadPath;

      // Update database — store the parent (completeDownloadPath) not the subfolder,
      // so loadExistingTorrents can re-add with the correct parent path on restart.
      await this.repository.update(infoHash, {
        status: 'seeding',
        path: completeDownloadPath,
        completedAt: new Date(),
      });

      // Emit the actual torrent subfolder path so ImportManager knows where the files are.
      this.emit('torrent:completed', {
        infoHash,
        name: torrent.name,
        path: targetDir,
      });

      void this.promoteNextQueued();
    } catch (error) {
      // Update status to error on failure
      await this.repository.updateStatus(infoHash, 'error');
      console.error(`Failed to move files for torrent ${infoHash}:`, error);
      void this.promoteNextQueued();
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
   * Returns standardized status for torrents that are actively downloading or queued.
   */
  async getActiveTorrents(): Promise<any[]> {
    const torrents = await this.repository.findByStatuses(['downloading', 'queued']);
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
          const downloadedBytes = BigInt(Math.floor(Number(torrent.downloaded ?? 0)));
          const sessionUploadedBytes = BigInt(Math.floor(Number(torrent.uploaded ?? 0)));

          // WebTorrent resets uploaded/downloaded counters on restart. To preserve lifetime
          // upload totals we snapshot the DB value on first encounter and accumulate from there.
          if (!this.sessionUploadedBaselines.has(torrent.infoHash)) {
            const existing = await this.repository.findByInfoHash(torrent.infoHash);
            this.sessionUploadedBaselines.set(torrent.infoHash, existing?.uploaded ?? BigInt(0));
          }
          const uploadedBaseline = this.sessionUploadedBaselines.get(torrent.infoHash)!;
          const lifetimeUploadedBytes = uploadedBaseline + sessionUploadedBytes;
          const ratio = downloadedBytes === BigInt(0) ? 0 : Number(lifetimeUploadedBytes) / Number(downloadedBytes);

          const updatedTorrent = await this.repository.updateProgress(
            torrent.infoHash,
            Number(torrent.progress ?? 0),
            Number(torrent.downloadSpeed ?? 0),
            Number(torrent.uploadSpeed ?? 0),
            downloadedBytes,
            lifetimeUploadedBytes,
            ratio,
            this.normalizeEtaSeconds(torrent.timeRemaining),
          );

          await this.checkSeedLimits(updatedTorrent);

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

  private normalizeEtaSeconds(timeRemaining: unknown): number | null {
    if (typeof timeRemaining !== 'number' || !Number.isFinite(timeRemaining)) {
      return null;
    }

    // WebTorrent exposes timeRemaining in milliseconds. Persist ETA as seconds.
    const seconds = Math.floor(timeRemaining / 1000);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return null;
    }

    return Math.min(seconds, SQLITE_INT_MAX);
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
    let resumedDownloads = 0;

    for (const torrent of torrents) {
      // Seeding torrents are always resumed (they don't count against the download limit)
      if (torrent.status === 'seeding') {
        // handled below
      } else if (torrent.status === 'downloading') {
        // Respect the limit: if too many were "downloading" when the server shut down,
        // demote the excess back to queued so they remain visible and are promoted in order.
        if (this.maxActiveDownloads > 0 && resumedDownloads >= this.maxActiveDownloads) {
          await this.repository.updateStatus(torrent.infoHash, 'queued');
          continue;
        }
        resumedDownloads++;
      } else {
        // queued, paused, error, completed — skip re-adding to WebTorrent
        continue;
      }

      const source = torrent.magnetUrl
        ? this.normalizeMagnetParameters(torrent.magnetUrl)
        : torrent.torrentFile;
      if (!source) {
        // Can't resume without a magnet URL or torrent file
        await this.repository.updateStatus(torrent.infoHash, 'error');
        continue;
      }

      try {
        await fs.mkdir(torrent.path, { recursive: true });
        await fs.access(torrent.path, fsConstants.W_OK);
      } catch (error) {
        await this.repository.updateStatus(torrent.infoHash, 'error');
        console.error(
          `Skipping resume for torrent ${torrent.infoHash}: download path is not writable (${torrent.path})`,
          error,
        );
        continue;
      }

      const webTorrent = this.client!.add(source, { path: torrent.path });
      this.attachTorrentLifecycleHandlers(webTorrent);
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
