import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock webtorrent before importing TorrentManager
vi.mock('webtorrent', () => {
  function MockWebTorrent() {
    this.torrents = [];
    this.add = vi.fn().mockReturnValue({
      infoHash: 'test-hash',
      name: 'Test',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloaded: 0,
      uploaded: 0,
      length: 1000,
      timeRemaining: Infinity,
      path: '/data/downloads/incomplete',
      paused: false,
      done: false,
      on: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      destroy: vi.fn((opts, cb) => {
        if (typeof opts === 'function') opts();
        else if (cb) cb();
      }),
    });
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
    delete: vi.fn().mockResolvedValue({}),
    syncPeers: vi.fn().mockResolvedValue(undefined),
  };
}

describe('TorrentManager speed limits', () => {
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
      manager = null;
    }
  });

  it('should apply a global download speed limit', () => {
    manager.setDownloadSpeedLimit(1024 * 1024); // 1 MB/s

    const client = manager.getClient();
    expect(client.throttleDownload).toHaveBeenCalledWith(1024 * 1024);
  });

  it('should apply a global upload speed limit', () => {
    manager.setUploadSpeedLimit(512 * 1024); // 512 KB/s

    const client = manager.getClient();
    expect(client.throttleUpload).toHaveBeenCalledWith(512 * 1024);
  });

  it('should remove the download speed limit when set to -1', () => {
    manager.setDownloadSpeedLimit(-1);

    const client = manager.getClient();
    expect(client.throttleDownload).toHaveBeenCalledWith(-1);
  });

  it('should remove the upload speed limit when set to -1', () => {
    manager.setUploadSpeedLimit(-1);

    const client = manager.getClient();
    expect(client.throttleUpload).toHaveBeenCalledWith(-1);
  });

  it('should allow setting both speed limits at once', () => {
    manager.setSpeedLimits({ download: 2048 * 1024, upload: 1024 * 1024 });

    const client = manager.getClient();
    expect(client.throttleDownload).toHaveBeenCalledWith(2048 * 1024);
    expect(client.throttleUpload).toHaveBeenCalledWith(1024 * 1024);
  });

  it('should throw if manager is not initialized', async () => {
    await manager.destroy();

    const freshManager = TorrentManager.getInstance(mockRepo);
    expect(() => freshManager.setDownloadSpeedLimit(1024)).toThrow(/not initialized/i);
    expect(() => freshManager.setUploadSpeedLimit(1024)).toThrow(/not initialized/i);

    manager = freshManager;
  });
});
