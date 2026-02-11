import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('webtorrent', () => {
  function MockWebTorrent() {
    this.torrents = [];
    this.add = vi.fn();
    this.remove = vi.fn();
    this.destroy = vi.fn((cb) => { if (cb) cb(); });
    this.on = vi.fn();
    this.downloadSpeed = 0;
    this.uploadSpeed = 0;
    this.throttleDownload = vi.fn();
    this.throttleUpload = vi.fn();
  }

  return { default: MockWebTorrent };
});

import { TorrentManager } from '../server/src/services/TorrentManager';

function createMockRepository() {
  return {
    upsert: vi.fn().mockResolvedValue({}),
    findByInfoHash: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue({}),
    updateProgress: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    syncPeers: vi.fn().mockResolvedValue(undefined),
  };
}

describe('TorrentManager stats sync loop', () => {
  let manager;
  let repository;

  beforeEach(async () => {
    TorrentManager.resetInstance();
    repository = createMockRepository();
    manager = TorrentManager.getInstance(repository);
    await manager.initialize();
  });

  afterEach(async () => {
    if (manager) {
      await manager.destroy();
    }
  });

  it('should persist progress and peers through syncStats', async () => {
    manager.getClient().torrents = [
      {
        infoHash: 'hash-1',
        progress: 0.5,
        downloadSpeed: 100,
        uploadSpeed: 20,
        downloaded: 500,
        uploaded: 100,
        timeRemaining: 60,
        peers: [
          { ip: '1.1.1.1', port: 1111, client: 'A' },
        ],
      },
    ];

    await manager.syncStats();

    expect(repository.updateProgress).toHaveBeenCalledWith(
      'hash-1',
      0.5,
      100,
      20,
      BigInt(500),
      BigInt(100),
      60,
    );
    expect(repository.syncPeers).toHaveBeenCalledWith('hash-1', [
      { ip: '1.1.1.1', port: 1111, client: 'A' },
    ]);
  });

  it('should use 5s interval when active and 30s when idle', () => {
    manager.getClient().torrents = [{ progress: 0.2, done: false }];
    expect(manager.getCurrentSyncIntervalMs()).toBe(5000);

    manager.getClient().torrents = [];
    expect(manager.getCurrentSyncIntervalMs()).toBe(30000);
  });

  it('should start sync loop on initialize and stop on destroy', async () => {
    expect(manager.isStatsSyncRunning()).toBe(true);

    await manager.destroy();

    expect(manager.isStatsSyncRunning()).toBe(false);
    manager = null;
  });

  it('should skip overlapping sync cycles and warn', async () => {
    let release;
    const blocker = new Promise(resolve => {
      release = resolve;
    });

    repository.updateProgress.mockImplementationOnce(async () => blocker);
    manager.getClient().torrents = [
      {
        infoHash: 'hash-1',
        progress: 0.3,
        downloadSpeed: 10,
        uploadSpeed: 5,
        downloaded: 300,
        uploaded: 40,
        timeRemaining: 120,
        peers: [],
      },
    ];

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const first = manager.syncStats();
    await manager.syncStats();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping torrent stats sync cycle due to backpressure'),
    );

    release();
    await first;
    warnSpy.mockRestore();
  });
});
