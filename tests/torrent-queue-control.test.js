import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const TEST_INFO_HASH = '87773a30994884f2d5abef7cf1360cf19e91a3e6';

// Mock webtorrent before importing TorrentManager
vi.mock('webtorrent', () => {
  function createMockTorrent(overrides = {}) {
    return {
      infoHash: TEST_INFO_HASH,
      name: 'Test Download',
      progress: 0.5,
      downloadSpeed: 1024,
      uploadSpeed: 512,
      downloaded: 500000,
      uploaded: 250000,
      length: 1000000,
      timeRemaining: 60000,
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
      ...overrides,
    };
  }

  function MockWebTorrent() {
    this.torrents = [];
    this.add = vi.fn((source, opts) => {
      const torrent = createMockTorrent({ path: opts?.path || '/data/downloads/incomplete' });
      this.torrents.push(torrent);
      return torrent;
    });
    this.remove = vi.fn((torrent, opts, cb) => {
      const idx = this.torrents.indexOf(torrent);
      if (idx !== -1) this.torrents.splice(idx, 1);
      if (typeof opts === 'function') opts();
      else if (cb) cb();
    });
    this.destroy = vi.fn((cb) => { if (cb) cb(); });
    this.on = vi.fn();
    this.downloadSpeed = 0;
    this.uploadSpeed = 0;
    this.throttleDownload = vi.fn();
    this.throttleUpload = vi.fn();
    // Helper to find a torrent by infoHash
    this.get = vi.fn((infoHash) => this.torrents.find(t => t.infoHash === infoHash) || null);
  }

  MockWebTorrent.createMockTorrent = createMockTorrent;
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

describe('TorrentManager queue control', () => {
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

  describe('pauseTorrent', () => {
    it('should pause an active torrent and update the database status', async () => {
      // First add a torrent
      await manager.addTorrent({ magnetUrl: `magnet:?xt=urn:btih:${TEST_INFO_HASH}` });

      await manager.pauseTorrent(TEST_INFO_HASH);

      // Should update the DB status to 'paused'
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(TEST_INFO_HASH, 'paused');

      // Should call pause on the WebTorrent torrent object
      const client = manager.getClient();
      const torrent = client.get(TEST_INFO_HASH);
      expect(torrent.pause).toHaveBeenCalled();
    });

    it('should throw for a non-existent torrent', async () => {
      const client = manager.getClient();
      client.get.mockReturnValue(null);

      await expect(manager.pauseTorrent('nonexistent')).rejects.toThrow(/not found/i);
    });
  });

  describe('resumeTorrent', () => {
    it('should resume a paused torrent and update the database status', async () => {
      await manager.addTorrent({ magnetUrl: `magnet:?xt=urn:btih:${TEST_INFO_HASH}` });

      // Simulate paused state
      const client = manager.getClient();
      const torrent = client.get(TEST_INFO_HASH);
      torrent.paused = true;

      await manager.resumeTorrent(TEST_INFO_HASH);

      expect(mockRepo.updateStatus).toHaveBeenCalledWith(TEST_INFO_HASH, 'downloading');
      expect(torrent.resume).toHaveBeenCalled();
    });

    it('should throw for a non-existent torrent', async () => {
      const client = manager.getClient();
      client.get.mockReturnValue(null);

      await expect(manager.resumeTorrent('nonexistent')).rejects.toThrow(/not found/i);
    });
  });

  describe('removeTorrent', () => {
    it('should remove a torrent from the client and delete from database', async () => {
      await manager.addTorrent({ magnetUrl: `magnet:?xt=urn:btih:${TEST_INFO_HASH}` });

      await manager.removeTorrent(TEST_INFO_HASH);

      // Should delete from the database
      expect(mockRepo.delete).toHaveBeenCalledWith(TEST_INFO_HASH);

      // Should remove from the client
      const client = manager.getClient();
      expect(client.remove).toHaveBeenCalled();
    });

    it('should handle async client.get() when removing', async () => {
      await manager.addTorrent({ magnetUrl: `magnet:?xt=urn:btih:${TEST_INFO_HASH}` });
      const client = manager.getClient();
      const torrent = client.torrents[0];
      client.get.mockResolvedValueOnce(torrent);

      await manager.removeTorrent(TEST_INFO_HASH);

      expect(client.remove).toHaveBeenCalled();
      expect(mockRepo.delete).toHaveBeenCalledWith(TEST_INFO_HASH);
    });

    it('should delete DB-only torrent even when missing in client', async () => {
      const client = manager.getClient();
      client.get.mockReturnValue(null);

      await manager.removeTorrent(TEST_INFO_HASH);

      expect(mockRepo.delete).toHaveBeenCalledWith(TEST_INFO_HASH);
      expect(client.remove).not.toHaveBeenCalled();
    });

    it('should throw when torrent is missing in client and database', async () => {
      const client = manager.getClient();
      client.get.mockReturnValue(null);
      mockRepo.delete.mockRejectedValueOnce(new Error("Torrent with infoHash 'nonexistent' not found"));

      await expect(manager.removeTorrent('nonexistent')).rejects.toThrow(/not found/i);
    });
  });

  describe('initialization guard', () => {
    it('should throw if manager is not initialized', async () => {
      await manager.destroy();
      const freshManager = TorrentManager.getInstance(mockRepo);

      await expect(freshManager.pauseTorrent('test')).rejects.toThrow(/not initialized/i);
      await expect(freshManager.resumeTorrent('test')).rejects.toThrow(/not initialized/i);
      await expect(freshManager.removeTorrent('test')).rejects.toThrow(/not initialized/i);

      manager = freshManager;
    });
  });
});
