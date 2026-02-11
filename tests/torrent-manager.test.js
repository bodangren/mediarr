import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock webtorrent before importing TorrentManager
vi.mock('webtorrent', () => {
  const mockTorrent = {
    infoHash: 'existing-hash-123',
    name: 'Existing Torrent',
    progress: 0.75,
    downloadSpeed: 1024,
    uploadSpeed: 512,
    downloaded: 750,
    uploaded: 256,
    length: 1000,
    timeRemaining: 60000,
    path: '/downloads/incomplete',
    paused: false,
    done: false,
    on: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    destroy: vi.fn((opts, cb) => {
      if (typeof opts === 'function') {
        opts();
      } else if (cb) {
        cb();
      }
    }),
  };

  function MockWebTorrent() {
    this.torrents = [];
    this.add = vi.fn().mockReturnValue(mockTorrent);
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

/**
 * Creates a mock TorrentRepository with vi.fn() stubs.
 */
function createMockRepository() {
  return {
    upsert: vi.fn().mockResolvedValue({}),
    findByInfoHash: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue({}),
    updateProgress: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    syncPeers: vi.fn().mockResolvedValue(undefined),
  };
}

describe('TorrentManager', () => {
  let manager;
  let mockRepo;

  beforeEach(() => {
    TorrentManager.resetInstance();
    mockRepo = createMockRepository();
  });

  afterEach(async () => {
    if (manager) {
      await manager.destroy();
      manager = null;
    }
  });

  it('should create a WebTorrent client on initialization', async () => {
    manager = TorrentManager.getInstance(mockRepo);
    await manager.initialize();

    expect(manager.isInitialized()).toBe(true);
  });

  it('should enforce singleton pattern', () => {
    const instance1 = TorrentManager.getInstance(mockRepo);
    const instance2 = TorrentManager.getInstance(mockRepo);

    expect(instance1).toBe(instance2);
  });

  it('should load existing torrents from the database on startup', async () => {
    const existingTorrents = [
      {
        id: 1,
        infoHash: 'hash-from-db-1',
        name: 'DB Torrent 1',
        status: 'downloading',
        progress: 0.5,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: null,
        size: BigInt(1000000),
        downloaded: BigInt(500000),
        uploaded: BigInt(0),
        ratio: 0,
        path: '/downloads/incomplete',
        added: new Date(),
        completedAt: null,
        stopAtRatio: null,
        stopAtTime: null,
        magnetUrl: 'magnet:?xt=urn:btih:hash-from-db-1',
        torrentFile: null,
      },
      {
        id: 2,
        infoHash: 'hash-from-db-2',
        name: 'DB Torrent 2',
        status: 'paused',
        progress: 0.9,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: null,
        size: BigInt(2000000),
        downloaded: BigInt(1800000),
        uploaded: BigInt(500000),
        ratio: 0.25,
        path: '/downloads/incomplete',
        added: new Date(),
        completedAt: null,
        stopAtRatio: 1.0,
        stopAtTime: null,
        magnetUrl: 'magnet:?xt=urn:btih:hash-from-db-2',
        torrentFile: null,
      },
    ];

    mockRepo.findAll.mockResolvedValue(existingTorrents);

    manager = TorrentManager.getInstance(mockRepo);
    await manager.initialize();

    expect(mockRepo.findAll).toHaveBeenCalledOnce();
    // Only the 'downloading' torrent should be re-added to the client (not paused ones)
    const client = manager.getClient();
    expect(client.add).toHaveBeenCalledOnce();
    expect(client.add).toHaveBeenCalledWith(
      'magnet:?xt=urn:btih:hash-from-db-1',
      expect.objectContaining({ path: '/downloads/incomplete' })
    );
  });

  it('should not re-add paused or stopped torrents on startup', async () => {
    const pausedTorrents = [
      {
        id: 1,
        infoHash: 'paused-hash',
        name: 'Paused Torrent',
        status: 'paused',
        progress: 0.5,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: null,
        size: BigInt(1000),
        downloaded: BigInt(500),
        uploaded: BigInt(0),
        ratio: 0,
        path: '/downloads/incomplete',
        added: new Date(),
        completedAt: null,
        stopAtRatio: null,
        stopAtTime: null,
        magnetUrl: 'magnet:?xt=urn:btih:paused-hash',
        torrentFile: null,
      },
      {
        id: 2,
        infoHash: 'stopped-hash',
        name: 'Stopped Torrent',
        status: 'stopped',
        progress: 1.0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: null,
        size: BigInt(1000),
        downloaded: BigInt(1000),
        uploaded: BigInt(500),
        ratio: 0.5,
        path: '/downloads/complete',
        added: new Date(),
        completedAt: new Date(),
        stopAtRatio: null,
        stopAtTime: null,
        magnetUrl: 'magnet:?xt=urn:btih:stopped-hash',
        torrentFile: null,
      },
    ];

    mockRepo.findAll.mockResolvedValue(pausedTorrents);

    manager = TorrentManager.getInstance(mockRepo);
    await manager.initialize();

    const client = manager.getClient();
    expect(client.add).not.toHaveBeenCalled();
  });

  it('should destroy the WebTorrent client on shutdown', async () => {
    manager = TorrentManager.getInstance(mockRepo);
    await manager.initialize();

    const client = manager.getClient();
    await manager.destroy();

    expect(client.destroy).toHaveBeenCalledOnce();
    expect(manager.isInitialized()).toBe(false);
    manager = null; // Already destroyed
  });

  it('should skip torrents without magnetUrl or torrentFile on reload', async () => {
    const incompleteTorrents = [
      {
        id: 1,
        infoHash: 'no-source-hash',
        name: 'No Source Torrent',
        status: 'downloading',
        progress: 0.1,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: null,
        size: BigInt(1000),
        downloaded: BigInt(100),
        uploaded: BigInt(0),
        ratio: 0,
        path: '/downloads/incomplete',
        added: new Date(),
        completedAt: null,
        stopAtRatio: null,
        stopAtTime: null,
        magnetUrl: null,
        torrentFile: null,
      },
    ];

    mockRepo.findAll.mockResolvedValue(incompleteTorrents);

    manager = TorrentManager.getInstance(mockRepo);
    await manager.initialize();

    const client = manager.getClient();
    expect(client.add).not.toHaveBeenCalled();
    // Should mark it as error since it can't be resumed
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('no-source-hash', 'error');
  });
});
