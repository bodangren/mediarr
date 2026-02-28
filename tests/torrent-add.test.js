import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const TEST_INFO_HASH = '87773a30994884f2d5abef7cf1360cf19e91a3e6';

// Mock webtorrent before importing TorrentManager
vi.mock('webtorrent', () => {
  function createMockTorrent(overrides = {}) {
    return {
      infoHash: TEST_INFO_HASH,
      name: 'Test Download',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloaded: 0,
      uploaded: 0,
      length: 1000000,
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
    this.remove = vi.fn();
    this.destroy = vi.fn((cb) => { if (cb) cb(); });
    this.on = vi.fn();
    this.downloadSpeed = 0;
    this.uploadSpeed = 0;
    this.throttleDownload = vi.fn();
    this.throttleUpload = vi.fn();
  }

  MockWebTorrent.createMockTorrent = createMockTorrent;
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

describe('TorrentManager.addTorrent', () => {
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

  it('should add a torrent via magnet link and download to incomplete/ directory', async () => {
    const magnetUrl = `magnet:?xt=urn:btih:${TEST_INFO_HASH}&dn=Test+Download&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce`;

    const result = await manager.addTorrent({ magnetUrl });

    // Should add the magnet to the WebTorrent client
    const client = manager.getClient();
    expect(client.add).toHaveBeenCalledWith(
      magnetUrl,
      expect.objectContaining({ path: '/data/downloads/incomplete' })
    );

    // Should persist the torrent to the database
    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        infoHash: TEST_INFO_HASH,
        magnetUrl,
        status: 'downloading',
        path: '/data/downloads/incomplete',
      })
    );

    // Should return relevant torrent info
    expect(result).toEqual(
      expect.objectContaining({
        infoHash: TEST_INFO_HASH,
        name: 'Test Download',
      })
    );
  });

  it('should add a torrent via .torrent file buffer and download to incomplete/ directory', async () => {
    const torrentFileBuffer = Buffer.from('fake-torrent-file-content');

    const result = await manager.addTorrent({ torrentFile: torrentFileBuffer });

    const client = manager.getClient();
    expect(client.add).toHaveBeenCalledWith(
      torrentFileBuffer,
      expect.objectContaining({ path: '/data/downloads/incomplete' })
    );

    // Should persist with the torrentFile buffer
    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        infoHash: TEST_INFO_HASH,
        torrentFile: torrentFileBuffer,
        status: 'downloading',
        path: '/data/downloads/incomplete',
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        infoHash: TEST_INFO_HASH,
      })
    );
  });

  it('should support a custom download path', async () => {
    const magnetUrl = `magnet:?xt=urn:btih:${TEST_INFO_HASH}&dn=Custom+Path&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce`;
    const customPath = '/media/movies';

    const result = await manager.addTorrent({ magnetUrl, path: customPath });

    const client = manager.getClient();
    expect(client.add).toHaveBeenCalledWith(
      magnetUrl,
      expect.objectContaining({ path: customPath })
    );

    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        path: customPath,
      })
    );
  });

  it('should use configured incomplete directory when defaults are updated', async () => {
    const magnetUrl = `magnet:?xt=urn:btih:${TEST_INFO_HASH}&dn=Configured+Path&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce`;
    manager.setDownloadPaths({ incomplete: '/tmp/mediarr-incomplete' });

    await manager.addTorrent({ magnetUrl });

    const client = manager.getClient();
    expect(client.add).toHaveBeenCalledWith(
      magnetUrl,
      expect.objectContaining({ path: '/tmp/mediarr-incomplete' })
    );
  });

  it('should append default trackers when magnet has no tracker params', async () => {
    const magnetUrl = `magnet:?xt=urn:btih:${TEST_INFO_HASH}&dn=NoTrackers`;

    await manager.addTorrent({ magnetUrl });

    const client = manager.getClient();
    const source = client.add.mock.calls[0][0];
    expect(source).toMatch(/xt=urn%3Abtih%3A[0-9a-f]{40}/i);
    expect(source).toContain('tr=');
  });

  it('should derive infoHash from magnet URL when WebTorrent has no immediate infoHash', async () => {
    const magnetUrl = 'magnet:?xt=urn:btih:87773A30994884F2D5ABEF7CF1360CF19E91A3E6&dn=NoHashYet';
    const client = manager.getClient();

    const delayedHashTorrent = {
      infoHash: undefined,
      name: 'Unknown',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloaded: 0,
      uploaded: 0,
      length: 0,
      timeRemaining: Infinity,
      path: '/data/downloads/incomplete',
      paused: false,
      done: false,
      on: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      destroy: vi.fn(),
    };

    client.add.mockReturnValueOnce(delayedHashTorrent);

    const result = await manager.addTorrent({ magnetUrl });

    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        infoHash: '87773a30994884f2d5abef7cf1360cf19e91a3e6',
      })
    );
    expect(result.infoHash).toBe('87773a30994884f2d5abef7cf1360cf19e91a3e6');
  });

  it('should remove torrent from client when DB upsert fails', async () => {
    const magnetUrl = `magnet:?xt=urn:btih:${TEST_INFO_HASH}&dn=UpsertFail`;
    const client = manager.getClient();

    mockRepo.upsert.mockRejectedValueOnce(new Error('db write failed'));

    await expect(manager.addTorrent({ magnetUrl })).rejects.toThrow('db write failed');

    expect(client.remove).toHaveBeenCalled();
  });

  it('should throw if neither magnetUrl nor torrentFile is provided', async () => {
    await expect(manager.addTorrent({})).rejects.toThrow(
      /magnetUrl or torrentFile/i
    );

    const client = manager.getClient();
    expect(client.add).not.toHaveBeenCalled();
    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });

  it('should throw a clear error when incomplete directory is not configured', async () => {
    manager.setDownloadPaths({ incomplete: '   ' });

    await expect(
      manager.addTorrent({ magnetUrl: `magnet:?xt=urn:btih:${TEST_INFO_HASH}&dn=NoPath` })
    ).rejects.toThrow(/incomplete download directory is not configured/i);
  });

  it('should throw if the manager is not initialized', async () => {
    await manager.destroy();

    const freshManager = TorrentManager.getInstance(mockRepo);
    // Don't call initialize()

    await expect(
      freshManager.addTorrent({ magnetUrl: 'magnet:?xt=urn:btih:test' })
    ).rejects.toThrow(/not initialized/i);

    manager = freshManager; // for cleanup
  });
});
