import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs.promises before importing
vi.mock('fs', () => {
  return {
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
      rename: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockResolvedValue([]),
    },
  };
});

// Mock webtorrent before importing TorrentManager
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

    add(source, opts) {
      const onHandlers = {};
      const torrent = {
        infoHash: typeof source === 'string' && source.includes('btih:') 
          ? source.split('btih:')[1].split('&')[0]
          : 'abc123def456',
        name: typeof source === 'string' && source.includes('dn=') 
          ? decodeURIComponent(source.split('dn=')[1].split('&')[0]).replace(/\+/g, ' ')
          : 'Test Download',
        progress: 1,
        downloadSpeed: 0,
        uploadSpeed: 0,
        downloaded: 1000000,
        uploaded: 0,
        length: 1000000,
        timeRemaining: 0,
        path: opts?.path || '/downloads/incomplete',
        paused: false,
        done: true,
        on: vi.fn((event, handler) => {
          onHandlers[event] = handler;
        }),
        emit: vi.fn(async (event, ...args) => {
          if (onHandlers[event]) {
            await onHandlers[event](...args);
          }
        }),
        pause: vi.fn(),
        resume: vi.fn(),
        destroy: vi.fn((opts, cb) => {
          if (typeof opts === 'function') opts();
          else if (cb) cb();
        }),
        files: [
          {
            path: 'test-file.mkv',
            name: 'test-file.mkv',
            length: 1000000,
          },
        ],
      };
      this.torrents.push(torrent);
      return torrent;
    }

    get(infoHash) {
      return this.torrents.find((t) => t.infoHash === infoHash);
    }

    remove() {}
    destroy(cb) { if (cb) cb(); }
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
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    syncPeers: vi.fn().mockResolvedValue(undefined),
  };
}

describe('TorrentManager - Completion Logic & File Move', () => {
  let manager;
  let mockRepo;

  beforeEach(async () => {
    vi.clearAllMocks();
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

  it('should move files from incomplete/ to complete/ when torrent reaches 100%', async () => {
    const magnetUrl = 'magnet:?xt=urn:btih:abc123def456&dn=Test+Download';

    await manager.addTorrent({ magnetUrl });

    const client = manager.getClient();
    const torrent = client.torrents[0];

    await torrent.emit('done');

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(fs.mkdir).toHaveBeenCalledWith(
      '/downloads/complete',
      expect.objectContaining({ recursive: true })
    );

    // In my mock, path is /downloads/incomplete, torrent.name is Test Download
    // handleTorrentCompletion tries to rename path.join(path, name)
    expect(fs.rename).toHaveBeenCalledWith(
      path.join('/downloads/incomplete', 'Test Download'),
      path.join('/downloads/complete', 'Test Download')
    );

    expect(mockRepo.update).toHaveBeenCalledWith(
      'abc123def456',
      expect.objectContaining({
        status: 'seeding',
        path: path.join('/downloads/complete', 'Test Download'),
        completedAt: expect.any(Date),
      })
    );
  });

  it('should set completedAt timestamp when torrent finishes', async () => {
    const magnetUrl = 'magnet:?xt=urn:btih:abc123def456&dn=Test+Download';
    await manager.addTorrent({ magnetUrl });

    const client = manager.getClient();
    const torrent = client.torrents[0];

    const beforeTime = new Date();
    await torrent.emit('done');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockRepo.update).toHaveBeenCalledWith(
      'abc123def456',
      expect.objectContaining({
        completedAt: expect.any(Date),
      })
    );

    const updateCallArgs = mockRepo.update.mock.calls.find(call => call[0] === 'abc123def456');
    const completedAt = updateCallArgs[1].completedAt;
    expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
  });

  it('should update torrent path in database after file move', async () => {
    const magnetUrl = 'magnet:?xt=urn:btih:abc123def456&dn=Test+Download';
    await manager.addTorrent({ magnetUrl });

    const client = manager.getClient();
    const torrent = client.torrents[0];

    await torrent.emit('done');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockRepo.update).toHaveBeenCalledWith(
      'abc123def456',
      expect.objectContaining({
        path: path.join('/downloads/complete', 'Test Download'),
      })
    );
  });

  it('should not move files if torrent is already in complete/ directory', async () => {
    const magnetUrl = 'magnet:?xt=urn:btih:xyz789&dn=Already+Complete';

    // Add torrent with custom path already in complete/
    await manager.addTorrent({ magnetUrl, path: '/downloads/complete' });

    const client = manager.getClient();
    const torrent = client.torrents[0];

    await torrent.emit('done');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(fs.rename).not.toHaveBeenCalled();

    expect(mockRepo.update).toHaveBeenCalledWith(
      'xyz789',
      expect.objectContaining({
        status: 'seeding',
        completedAt: expect.any(Date)
      })
    );
  });

  it('should handle file move errors gracefully', async () => {
    const magnetUrl = 'magnet:?xt=urn:btih:abc123def456&dn=Test+Download';
    
    // Mock rename to fail (both attempts)
    vi.mocked(fs.rename).mockRejectedValue(new Error('Permission denied'));

    await manager.addTorrent({ magnetUrl });

    const client = manager.getClient();
    const torrent = client.torrents[0];

    await torrent.emit('done');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'abc123def456',
      'error'
    );
  });
});
