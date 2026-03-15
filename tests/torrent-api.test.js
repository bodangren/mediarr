import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Mock TorrentManager and TorrentRepository
 */
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

// Mock webtorrent
vi.mock('webtorrent', () => {
  class MockWebTorrent {
    constructor() {
      this.torrents = [];
      this.on = vi.fn();
      this.downloadSpeed = 0;
      this.uploadSpeed = 0;
      this.throttleDownload = vi.fn();
      this.throttleUpload = vi.fn();
    }
    add() { return { on: vi.fn(), infoHash: 'abc', name: 'test' }; }
    get() { return null; }
    destroy(cb) { if (cb) cb(); }
  }
  return { default: MockWebTorrent };
});

import { TorrentManager } from '../server/src/services/TorrentManager';

describe('TorrentManager - API Data', () => {
  let manager;
  let mockRepo;

  beforeEach(async () => {
    TorrentManager.resetInstance();
    mockRepo = createMockRepository();
    manager = TorrentManager.getInstance(mockRepo);
    await manager.initialize();
  });

  afterEach(async () => {
    if (manager) {
      await manager.destroy();
    }
  });

  it('should return standardized progress data for all torrents', async () => {
    const mockDbTorrents = [
      {
        infoHash: 'abc123def456',
        name: 'Test Torrent',
        status: 'downloading',
        progress: 0.45,
        downloadSpeed: 1024 * 1024, // 1 MB/s
        uploadSpeed: 512 * 1024, // 512 KB/s
        size: BigInt(1000000000),
        downloaded: BigInt(450000000),
        uploaded: BigInt(100000000),
        eta: 600,
        path: '/data/downloads/incomplete'
      }
    ];

    mockRepo.findAll.mockResolvedValue(mockDbTorrents);

    // We'll implement getTorrentsStatus() in TorrentManager
    const status = await manager.getTorrentsStatus();

    expect(status).toHaveLength(1);
    expect(status[0]).toEqual({
      infoHash: 'abc123def456',
      name: 'Test Torrent',
      status: 'downloading',
      progress: 0.45,
      downloadSpeed: 1024 * 1024,
      uploadSpeed: 512 * 1024,
      size: '1000000000', // BigInt converted to string for JSON safety
      downloaded: '450000000',
      uploaded: '100000000',
      eta: 600,
      path: '/data/downloads/incomplete'
    });
  });

  it('should return data for a single torrent by infoHash', async () => {
    const mockDbTorrent = {
      infoHash: 'abc123def456',
      name: 'Test Torrent',
      status: 'downloading',
      progress: 0.45,
      downloadSpeed: 1024 * 1024,
      uploadSpeed: 512 * 1024,
      size: BigInt(1000000000),
      downloaded: BigInt(450000000),
      uploaded: BigInt(100000000),
      eta: 600,
      path: '/data/downloads/incomplete'
    };

    mockRepo.findByInfoHash.mockResolvedValue(mockDbTorrent);

    const status = await manager.getTorrentStatus('abc123def456');

    expect(status).toEqual(expect.objectContaining({
      infoHash: 'abc123def456',
      name: 'Test Torrent',
      progress: 0.45
    }));
  });
});
