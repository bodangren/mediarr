import { EventEmitter } from 'node:events';
import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import type { HttpClient } from '../indexers/HttpClient';
import { BaseIndexer, type SearchQuery } from '../indexers/BaseIndexer';
import type { IndexerResult } from '../indexers/IndexerResult';
import type { TorrentRepository } from '../repositories/TorrentRepository';

export const BROWSER_ACCEPTANCE_INFO_HASH = 'abcdefabcdefabcdefabcdefabcdefabcdefabcd';
export const BROWSER_ACCEPTANCE_COMPLETION_DELAY_MS = 1_500;

export interface BrowserAcceptanceTorrentManagerOptions {
  incompleteDirectory: string;
  completeDirectory?: string;
  sourceFile?: string;
  completionDelayMs?: number;
}

export class BrowserAcceptanceIndexer extends BaseIndexer {
  constructor(httpClient: HttpClient) {
    super({ id: 990000009, name: 'Browser Acceptance Indexer', implementation: 'browser-acceptance', protocol: 'torrent', enabled: true, priority: 100, supportsRss: false, supportsSearch: true, settings: {}, httpClient });
  }
  get indexerType(): string { return 'browser-acceptance'; }
  async search(query: SearchQuery): Promise<IndexerResult[]> {
    if (!query.q?.toLowerCase().includes('browser search movie')) return [];
    return [{ title: 'Browser.Search.Movie.2026.1080p.WEB-DL-BROWSER', guid: `fixture:${BROWSER_ACCEPTANCE_INFO_HASH}`, magnetUrl: `magnet:?xt=urn:btih:${BROWSER_ACCEPTANCE_INFO_HASH}`, publishDate: new Date(), size: BigInt(100000000), seeders: 50, leechers: 1, categories: [2000], protocol: 'torrent', indexerId: this.id, indexerName: this.name }];
  }
}

export class BrowserAcceptanceTorrentManager extends EventEmitter {
  private readonly incompleteDirectory: string;
  private readonly completeDirectory?: string;
  private readonly sourceFile?: string;
  private readonly completionDelayMs: number;
  private readonly completionTimers = new Map<string, NodeJS.Timeout>();
  private readonly completionContexts = new Map<string, { name: string }>();

  constructor(
    private readonly repository: TorrentRepository,
    options: BrowserAcceptanceTorrentManagerOptions | string,
  ) {
    super();
    const resolved = typeof options === 'string'
      ? { incompleteDirectory: options }
      : options;
    this.incompleteDirectory = resolved.incompleteDirectory;
    this.completeDirectory = resolved.completeDirectory;
    this.sourceFile = resolved.sourceFile;
    this.completionDelayMs = resolved.completionDelayMs ?? BROWSER_ACCEPTANCE_COMPLETION_DELAY_MS;
  }
  setDownloadPaths(): void {}
  async initialize(): Promise<void> {}
  async destroy(): Promise<void> {
    for (const timer of this.completionTimers.values()) clearTimeout(timer);
    this.completionTimers.clear();
  }
  async addTorrent(options: { magnetUrl?: string; name?: string; size?: number; movieId?: number; episodeId?: number }) {
    if (!options.magnetUrl?.includes(BROWSER_ACCEPTANCE_INFO_HASH)) throw new Error('Unexpected browser acceptance torrent');
    const name = options.name ?? 'Browser Acceptance Download';
    await this.repository.upsert({ infoHash: BROWSER_ACCEPTANCE_INFO_HASH, name, status: 'downloading', progress: .42, downloadSpeed: 1048576, uploadSpeed: 0, eta: 120, size: options.size ?? 100000000, downloaded: 42000000, uploaded: 0, ratio: 0, path: this.incompleteDirectory, magnetUrl: options.magnetUrl, movieId: options.movieId ?? null, episodeId: options.episodeId ?? null });
    this.completionContexts.set(BROWSER_ACCEPTANCE_INFO_HASH, { name });
    this.scheduleCompletion(BROWSER_ACCEPTANCE_INFO_HASH);
    return { infoHash: BROWSER_ACCEPTANCE_INFO_HASH, name };
  }
  async getTorrentsStatus() { return (await this.repository.findAll()).map(t => ({ infoHash: t.infoHash, name: t.name, status: t.status, progress: t.progress, downloadSpeed: t.downloadSpeed, uploadSpeed: t.uploadSpeed, size: t.size.toString(), downloaded: t.downloaded.toString(), uploaded: t.uploaded.toString(), eta: t.eta, path: t.path, completedAt: t.completedAt })); }
  async getActiveTorrents() { return this.getTorrentsStatus(); }
  async getTorrentStatus(infoHash: string) { const item = (await this.getTorrentsStatus()).find(t => t.infoHash === infoHash); if (!item) throw new Error('Torrent not found'); return item; }
  async pauseTorrent(infoHash: string) {
    this.cancelCompletion(infoHash);
    return this.repository.updateStatus(infoHash, 'paused');
  }
  async resumeTorrent(infoHash: string) {
    const result = await this.repository.updateStatus(infoHash, 'downloading');
    this.scheduleCompletion(infoHash);
    return result;
  }
  async removeTorrent(infoHash: string) {
    this.cancelCompletion(infoHash);
    this.completionContexts.delete(infoHash);
    await this.repository.delete(infoHash);
  }
  async setPriority() { return undefined; }
  async setSpeedLimits() { return undefined; }

  /**
   * This fixture-only controller models the completion hand-off that a real
   * torrent runtime performs. It is not registered as an HTTP endpoint and
   * receives its source file exclusively from the disposable browser harness.
   */
  private scheduleCompletion(infoHash: string): void {
    if (!this.sourceFile || !this.completeDirectory || !this.completionContexts.has(infoHash)) return;
    this.cancelCompletion(infoHash);
    const timer = setTimeout(() => {
      this.completionTimers.delete(infoHash);
      void this.completeFixtureTorrent(infoHash);
    }, this.completionDelayMs);
    timer.unref();
    this.completionTimers.set(infoHash, timer);
  }

  private cancelCompletion(infoHash: string): void {
    const timer = this.completionTimers.get(infoHash);
    if (timer) clearTimeout(timer);
    this.completionTimers.delete(infoHash);
  }

  private async completeFixtureTorrent(infoHash: string): Promise<void> {
    const context = this.completionContexts.get(infoHash);
    if (!context || !this.sourceFile || !this.completeDirectory) return;

    const filename = `${infoHash}.mp4`;
    const stagedPath = path.join(this.incompleteDirectory, infoHash, filename);
    const completedPath = path.join(this.completeDirectory, filename);

    try {
      await mkdir(path.dirname(stagedPath), { recursive: true });
      await mkdir(this.completeDirectory, { recursive: true });
      await stat(this.sourceFile);
      await copyFile(this.sourceFile, stagedPath);
      await copyFile(stagedPath, completedPath, fsConstants.COPYFILE_EXCL);
      await rm(stagedPath, { force: true });

      // Persisting the status before emitting mirrors TorrentManager's import
      // hand-off: ImportManager receives a real file while Queue/API reads see
      // the completed record immediately.
      await this.repository.update(infoHash, {
        status: 'seeding',
        progress: 1,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: 0,
        downloaded: 100000000,
        path: this.completeDirectory,
        completedAt: new Date(),
      });
      this.emit('torrent:completed', {
        infoHash,
        name: context.name,
        path: completedPath,
      });
    } catch (error) {
      await this.repository.updateStatus(infoHash, 'error');
      console.error('Browser acceptance fixture completion failed:', error);
    }
  }
}
