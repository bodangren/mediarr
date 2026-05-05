import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TorrentManager } from './TorrentManager';

// ---------------------------------------------------------------------------
// Hoist helper mocks so they're available inside vi.mock() factory closures
// ---------------------------------------------------------------------------
const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  rename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  rm: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  access: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

const wtMocks = vi.hoisted(() => {
  const clientInstance = {
    on: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    get: vi.fn().mockReturnValue(null),
    torrents: [] as any[],
    destroy: vi.fn((cb: () => void) => cb()),
    throttleDownload: vi.fn(),
    throttleUpload: vi.fn(),
  };
  // Must be a regular function (not arrow) so it can be used with `new`
  const WebTorrentCtor = vi.fn(function WebTorrent() { return clientInstance; });
  return { clientInstance, WebTorrentCtor };
});

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return { ...actual, promises: fsMocks, constants: actual.constants };
});

vi.mock('webtorrent', () => ({ default: wtMocks.WebTorrentCtor }));

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------
const HASH_A = 'a'.repeat(40); // valid 40-char hex infoHash
const HASH_B = 'b'.repeat(40);

function makeDbTorrent(overrides: Record<string, unknown> = {}): any {
  return {
    infoHash: HASH_A,
    name: 'Test.Torrent.S01E01',
    status: 'downloading',
    path: '/data/downloads/incomplete',
    magnetUrl: `magnet:?xt=urn:btih:${HASH_A}`,
    torrentFile: null,
    episodeId: null,
    movieId: null,
    ratio: 0,
    stopAtRatio: null,
    stopAtTime: null,
    completedAt: null,
    size: BigInt(0),
    downloaded: BigInt(0),
    uploaded: BigInt(0),
    downloadSpeed: 0,
    uploadSpeed: 0,
    eta: null,
    ...overrides,
  };
}

function makeRepo() {
  return {
    upsert: vi.fn().mockResolvedValue(makeDbTorrent()),
    findByInfoHash: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    countByStatus: vi.fn().mockResolvedValue(0),
    findOldestQueued: vi.fn().mockResolvedValue(null),
    findByStatuses: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue(makeDbTorrent()),
    update: vi.fn().mockResolvedValue(makeDbTorrent()),
    updateProgress: vi.fn().mockResolvedValue(makeDbTorrent()),
    delete: vi.fn().mockResolvedValue(makeDbTorrent()),
    syncPeers: vi.fn().mockResolvedValue(undefined),
  };
}

/** Create a mock WebTorrent torrent object that supports event registration. */
function makeClientTorrent(overrides: Record<string, unknown> = {}): any {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    infoHash: HASH_A,
    name: 'Test.Torrent.S01E01',
    path: '/data/downloads/incomplete',
    length: 100,
    done: false,
    progress: 0,
    downloaded: 0,
    uploaded: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    timeRemaining: null,
    pause: vi.fn(),
    resume: vi.fn(),
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
    }),
    /** Test helper: fire a registered event */
    _emit: (event: string, ...args: unknown[]) => {
      (handlers[event] ?? []).forEach(cb => cb(...args));
    },
    ...overrides,
  };
}

/**
 * Returns an initialized TorrentManager whose WebTorrent client is replaced
 * with the shared mock (skips the real `initialize()` call).
 */
function makeManager(repo = makeRepo()) {
  const manager = TorrentManager.getInstance(repo as any);
  (manager as any).initialized = true;
  (manager as any).client = wtMocks.clientInstance;
  (manager as any).incompleteDownloadPath = '/data/downloads/incomplete';
  (manager as any).completeDownloadPath = '/data/downloads/complete';
  return { manager, repo };
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('TorrentManager', () => {
  beforeEach(() => {
    // Restore default implementations that vi.resetAllMocks() clears between tests
    wtMocks.WebTorrentCtor.mockImplementation(function() { return wtMocks.clientInstance; });
    wtMocks.clientInstance.get.mockReturnValue(null);
    wtMocks.clientInstance.add.mockReturnValue(undefined);
    wtMocks.clientInstance.remove.mockReturnValue(undefined);
    fsMocks.mkdir.mockResolvedValue(undefined);
    fsMocks.rename.mockResolvedValue(undefined);
    fsMocks.rm.mockResolvedValue(undefined);
    fsMocks.access.mockResolvedValue(undefined);
  });

  afterEach(() => {
    TorrentManager.resetInstance();
    vi.resetAllMocks(); // clears both call history AND implementations
  });

  // =========================================================================
  // Phase 1 — addTorrent edge cases
  // =========================================================================
  describe('addTorrent', () => {
    it('1.1 throws when neither magnetUrl nor torrentFile is provided', async () => {
      const { manager } = makeManager();

      await expect(manager.addTorrent({ name: 'Ghost' })).rejects.toThrow(
        'Either magnetUrl or torrentFile must be provided',
      );
    });

    it('1.2 throws when the incomplete download path is blank/whitespace', async () => {
      const { manager } = makeManager();
      (manager as any).incompleteDownloadPath = '   ';

      await expect(
        manager.addTorrent({ torrentFile: Buffer.from('fake') }),
      ).rejects.toThrow('Incomplete download directory is not configured');
    });

    it('1.3 returns the existing DB record when the infoHash is already persisted', async () => {
      const { manager, repo } = makeManager();
      const existing = makeDbTorrent({ name: 'Already.In.DB' });
      repo.findByInfoHash.mockResolvedValue(existing);

      const result = await manager.addTorrent({
        magnetUrl: `magnet:?xt=urn:btih:${HASH_A}`,
      });

      expect(result.infoHash).toBe(HASH_A);
      expect(result.name).toBe('Already.In.DB');
      // Must not create a duplicate DB row
      expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('1.4 returns the client torrent when the infoHash is already in WebTorrent', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(null); // not in DB
      wtMocks.clientInstance.get.mockReturnValue({
        infoHash: HASH_A,
        name: 'Already.In.Client',
        path: '/data/downloads/incomplete',
      });

      const result = await manager.addTorrent({
        magnetUrl: `magnet:?xt=urn:btih:${HASH_A}`,
      });

      expect(result.infoHash).toBe(HASH_A);
      // Must not create a duplicate DB row
      expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('1.5 stores the torrent as queued when the active-download limit is reached', async () => {
      const { manager, repo } = makeManager();
      (manager as any).maxActiveDownloads = 2;
      repo.countByStatus.mockResolvedValue(2); // at limit
      repo.findByInfoHash.mockResolvedValue(null);
      repo.upsert.mockResolvedValue(makeDbTorrent({ status: 'queued' }));

      const result = await manager.addTorrent({
        magnetUrl: `magnet:?xt=urn:btih:${HASH_A}`,
        name: 'Queued.Torrent',
      });

      expect(repo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'queued' }),
      );
      // infoHash is extracted from the magnet hint
      expect(result.infoHash).toBe(HASH_A);
    });

    it('1.6 throws when infoHash cannot be resolved from source', async () => {
      const { manager } = makeManager();

      const noHashTorrent = makeClientTorrent({ infoHash: undefined });
      wtMocks.clientInstance.add.mockReturnValue(noHashTorrent);

      // Bypass the real polling loop — force the private helper to return undefined
      vi.spyOn(manager as any, 'resolveInfoHash').mockResolvedValue(undefined);

      await expect(
        manager.addTorrent({ torrentFile: Buffer.from('fake'), path: '/data/downloads' }),
      ).rejects.toThrow('Unable to resolve torrent infoHash from source');
    });

    it('1.7 removes torrent from client when DB persistence fails', async () => {
      const { manager, repo } = makeManager();
      const mockTorrent = makeClientTorrent();
      wtMocks.clientInstance.add.mockReturnValue(mockTorrent);
      repo.countByStatus.mockResolvedValue(0);
      repo.findByInfoHash.mockResolvedValue(null);
      // No hash in source so no hint lookup; upsert always throws
      repo.upsert.mockRejectedValue(new Error('DB write failed'));

      await expect(
        manager.addTorrent({ torrentFile: Buffer.from('fake') }),
      ).rejects.toThrow('DB write failed');

      expect(wtMocks.clientInstance.remove).toHaveBeenCalledWith(mockTorrent);
    });
  });

  // =========================================================================
  // Phase 2 — handleTorrentCompletion edge cases
  // =========================================================================
  describe('handleTorrentCompletion', () => {
    it('2.1 sets status to error and does not emit torrent:completed when complete path is empty', async () => {
      const { manager, repo } = makeManager();
      (manager as any).completeDownloadPath = '   ';

      const completedEvents: unknown[] = [];
      manager.on('torrent:completed', (e) => completedEvents.push(e));

      const torrent = makeClientTorrent({ infoHash: HASH_A, path: '/incomplete' });
      await (manager as any).handleTorrentCompletion(torrent);

      expect(repo.updateStatus).toHaveBeenCalledWith(HASH_A, 'error');
      expect(completedEvents).toHaveLength(0);
    });

    it('2.2 marks as seeding without emitting torrent:completed when already in complete dir', async () => {
      const { manager, repo } = makeManager();
      const completePath = '/data/downloads/complete';
      (manager as any).completeDownloadPath = completePath;

      const completedEvents: unknown[] = [];
      manager.on('torrent:completed', (e) => completedEvents.push(e));

      // path already starts with the complete directory → no file move needed
      const torrent = makeClientTorrent({
        infoHash: HASH_A,
        path: `${completePath}/subdir`,
        name: 'MyShow.S01E01',
      });
      await (manager as any).handleTorrentCompletion(torrent);

      expect(repo.update).toHaveBeenCalledWith(
        HASH_A,
        expect.objectContaining({ status: 'seeding', completedAt: expect.any(Date) }),
      );
      // ImportManager must NOT receive a duplicate trigger
      expect(completedEvents).toHaveLength(0);
    });

    it('2.3 emits torrent:completed with the target path when file move succeeds', async () => {
      const { manager, repo } = makeManager();
      fsMocks.mkdir.mockResolvedValue(undefined);
      fsMocks.rename.mockResolvedValue(undefined);

      const completedEvents: any[] = [];
      manager.on('torrent:completed', (e) => completedEvents.push(e));

      const torrent = makeClientTorrent({
        infoHash: HASH_A,
        path: '/data/downloads/incomplete',
        name: 'MyShow.S01E01',
      });
      await (manager as any).handleTorrentCompletion(torrent);

      const expectedTarget = '/data/downloads/complete/MyShow.S01E01';
      expect(repo.update).toHaveBeenCalledWith(
        HASH_A,
        expect.objectContaining({
          status: 'seeding',
          path: '/data/downloads/complete',
          completedAt: expect.any(Date),
        }),
      );
      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0]).toMatchObject({
        infoHash: HASH_A,
        name: 'MyShow.S01E01',
        path: expectedTarget,
      });
    });

    it('2.4 sets status to error and does not emit torrent:completed when file move fails', async () => {
      const { manager, repo } = makeManager();
      fsMocks.mkdir.mockResolvedValue(undefined);
      // Both primary rename and the fallback rename fail
      fsMocks.rename.mockRejectedValue(new Error('ENOENT: no such file'));

      const completedEvents: unknown[] = [];
      manager.on('torrent:completed', (e) => completedEvents.push(e));

      const torrent = makeClientTorrent({
        infoHash: HASH_A,
        path: '/data/downloads/incomplete',
        name: 'MyShow.S01E01',
      });
      await (manager as any).handleTorrentCompletion(torrent);

      expect(repo.updateStatus).toHaveBeenCalledWith(HASH_A, 'error');
      expect(completedEvents).toHaveLength(0);
    });
  });

  // =========================================================================
  // Phase 3 — checkSeedLimits, promoteNextQueued, loadExistingTorrents
  // =========================================================================
  describe('checkSeedLimits', () => {
    it('3.1 takes no action for a torrent that is not seeding', async () => {
      const { manager } = makeManager();
      const pauseSpy = vi.spyOn(manager, 'pauseTorrent').mockResolvedValue();
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({ status: 'downloading', ratio: 99 }),
      );

      expect(pauseSpy).not.toHaveBeenCalled();
      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('3.2 pauses torrent when global ratio limit is exceeded (pause action)', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.5;
      (manager as any).seedLimitAction = 'pause';
      const pauseSpy = vi.spyOn(manager, 'pauseTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          ratio: 2.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(pauseSpy).toHaveBeenCalledWith(HASH_A);
    });

    it('3.3 per-torrent stopAtRatio overrides the global seedRatioLimit', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 5.0; // global is high → would not trigger on its own
      (manager as any).seedLimitAction = 'remove';
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          ratio: 2.0,
          stopAtRatio: 1.5, // per-torrent override is lower → triggers
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).toHaveBeenCalledWith(HASH_A);
    });

    it('3.4 removes torrent when time-based seed limit is exceeded', async () => {
      const { manager } = makeManager();
      (manager as any).seedTimeLimitMinutes = 60;
      (manager as any).seedLimitAction = 'remove';
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      const completedAt = new Date(Date.now() - 90 * 60 * 1_000); // 90 min ago
      await manager.checkSeedLimits(
        makeDbTorrent({ status: 'seeding', completedAt }),
      );

      expect(removeSpy).toHaveBeenCalledWith(HASH_A);
    });

    it('3.4b does NOT remove torrent when time limit is not yet reached', async () => {
      const { manager } = makeManager();
      (manager as any).seedTimeLimitMinutes = 120;
      (manager as any).seedLimitAction = 'remove';
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      const completedAt = new Date(Date.now() - 30 * 60 * 1_000); // only 30 min ago
      await manager.checkSeedLimits(
        makeDbTorrent({ status: 'seeding', completedAt }),
      );

      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  describe('checkSeedLimits — import guard', () => {
    it('4.1 does NOT remove a torrent whose linked episode has path:null (import pending)', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'remove';
      const prisma = {
        episode: { findUnique: vi.fn().mockResolvedValue({ id: 10, path: null }) },
        movie: { findUnique: vi.fn() },
      };
      (manager as any).prisma = prisma;
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          episodeId: 10,
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('4.2 does NOT remove a torrent whose linked episode no longer exists in DB', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'remove';
      const prisma = {
        episode: { findUnique: vi.fn().mockResolvedValue(null) },
        movie: { findUnique: vi.fn() },
      };
      (manager as any).prisma = prisma;
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          episodeId: 99,
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('4.3 removes a torrent whose linked episode HAS been imported (path set)', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'remove';
      const prisma = {
        episode: { findUnique: vi.fn().mockResolvedValue({ id: 10, path: '/tv/Show/S01E01.mkv' }) },
        movie: { findUnique: vi.fn() },
      };
      (manager as any).prisma = prisma;
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          episodeId: 10,
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).toHaveBeenCalledWith(HASH_A);
    });

    it('4.4 does NOT remove a torrent whose linked movie has path:null (import pending)', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'remove';
      const prisma = {
        episode: { findUnique: vi.fn() },
        movie: { findUnique: vi.fn().mockResolvedValue({ id: 20, path: null }) },
      };
      (manager as any).prisma = prisma;
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          movieId: 20,
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('4.5 does NOT remove a torrent whose linked movie no longer exists in DB', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'remove';
      const prisma = {
        episode: { findUnique: vi.fn() },
        movie: { findUnique: vi.fn().mockResolvedValue(null) },
      };
      (manager as any).prisma = prisma;
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          movieId: 99,
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('4.6 removes a torrent whose linked movie HAS been imported (path set)', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'remove';
      const prisma = {
        episode: { findUnique: vi.fn() },
        movie: { findUnique: vi.fn().mockResolvedValue({ id: 20, path: '/movies/Film (2020)' }) },
      };
      (manager as any).prisma = prisma;
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          movieId: 20,
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).toHaveBeenCalledWith(HASH_A);
    });

    it('4.7 does NOT pause an unimported torrent (pause action also guarded)', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'pause';
      const prisma = {
        episode: { findUnique: vi.fn().mockResolvedValue({ id: 10, path: null }) },
        movie: { findUnique: vi.fn() },
      };
      (manager as any).prisma = prisma;
      const pauseSpy = vi.spyOn(manager, 'pauseTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          episodeId: 10,
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(pauseSpy).not.toHaveBeenCalled();
    });

    it('4.8 removes unlinked torrent when prisma is not set (backward compat)', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'remove';
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).toHaveBeenCalledWith(HASH_A);
    });
  });

  describe('promoteNextQueued', () => {
    it('3.5 is a no-op when there are no queued torrents', async () => {
      const { manager, repo } = makeManager();
      repo.findOldestQueued.mockResolvedValue(null);

      await (manager as any).promoteNextQueued();

      expect(repo.updateStatus).not.toHaveBeenCalled();
      expect(wtMocks.clientInstance.add).not.toHaveBeenCalled();
    });

    it('3.6 marks queued torrent as error when it has no source (no magnet, no file)', async () => {
      const { manager, repo } = makeManager();
      const queued = makeDbTorrent({
        status: 'queued',
        magnetUrl: null,
        torrentFile: null,
      });
      repo.findOldestQueued.mockResolvedValue(queued);

      await (manager as any).promoteNextQueued();

      expect(repo.updateStatus).toHaveBeenCalledWith(HASH_A, 'error');
      expect(wtMocks.clientInstance.add).not.toHaveBeenCalled();
    });

    it('3.6b promotes a queued torrent to downloading when a slot is available', async () => {
      const { manager, repo } = makeManager();
      const queued = makeDbTorrent({
        status: 'queued',
        magnetUrl: `magnet:?xt=urn:btih:${HASH_A}`,
      });
      repo.findOldestQueued.mockResolvedValue(queued);
      repo.countByStatus.mockResolvedValue(0); // slot available

      const promotedTorrent = makeClientTorrent();
      wtMocks.clientInstance.add.mockReturnValue(promotedTorrent);

      await (manager as any).promoteNextQueued();

      expect(repo.updateStatus).toHaveBeenCalledWith(HASH_A, 'downloading');
      expect(wtMocks.clientInstance.add).toHaveBeenCalledOnce();
    });
  });

  describe('loadExistingTorrents (via initialize)', () => {
    it('3.7 demotes excess downloading torrents to queued when maxActiveDownloads is 1', async () => {
      const repo = makeRepo();
      const torrent1 = makeDbTorrent({ infoHash: HASH_A, status: 'downloading' });
      const torrent2 = makeDbTorrent({ infoHash: HASH_B, status: 'downloading' });
      repo.findAll.mockResolvedValue([torrent1, torrent2]);

      const addedTorrent = makeClientTorrent({ infoHash: HASH_A });
      wtMocks.clientInstance.add.mockReturnValue(addedTorrent);

      const manager = TorrentManager.getInstance(repo as any);
      (manager as any).maxActiveDownloads = 1;

      await manager.initialize();

      // First torrent fits the slot, second is demoted
      expect(repo.updateStatus).toHaveBeenCalledWith(HASH_B, 'queued');
      expect(repo.updateStatus).not.toHaveBeenCalledWith(HASH_A, 'queued');

      await manager.destroy();
    });

    it('3.8 marks torrent as error when download path is not writable', async () => {
      const repo = makeRepo();
      const torrent = makeDbTorrent({ status: 'downloading' });
      repo.findAll.mockResolvedValue([torrent]);

      fsMocks.mkdir.mockResolvedValue(undefined);
      fsMocks.access.mockRejectedValue(
        Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }),
      );

      const manager = TorrentManager.getInstance(repo as any);

      await manager.initialize();

      expect(repo.updateStatus).toHaveBeenCalledWith(HASH_A, 'error');
      expect(wtMocks.clientInstance.add).not.toHaveBeenCalled();

      await manager.destroy();
    });

    it('3.9 handles DB errors gracefully — does not remove when episode.findUnique throws', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'remove';
      const prisma = {
        episode: { findUnique: vi.fn().mockRejectedValue(new Error('DB connection lost')) },
        movie: { findUnique: vi.fn() },
      };
      (manager as any).prisma = prisma;
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          episodeId: 10,
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('3.10 guards both episodeId and movieId when both are set', async () => {
      const { manager } = makeManager();
      (manager as any).seedRatioLimit = 1.0;
      (manager as any).seedLimitAction = 'remove';
      const prisma = {
        episode: { findUnique: vi.fn().mockResolvedValue({ id: 10, path: '/tv/Show/S01E01.mkv' }) },
        movie: { findUnique: vi.fn().mockResolvedValue({ id: 20, path: null }) },
      };
      (manager as any).prisma = prisma;
      const removeSpy = vi.spyOn(manager, 'removeTorrent').mockResolvedValue();

      await manager.checkSeedLimits(
        makeDbTorrent({
          status: 'seeding',
          episodeId: 10,
          movieId: 20,
          ratio: 2.0,
          stopAtRatio: 1.0,
          completedAt: new Date(Date.now() - 1_000),
        }),
      );

      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Phase 5 — removeTorrent corner cases
  // =========================================================================
  describe('removeTorrent', () => {
    it('5.1 removes from DB even when torrent is not in WebTorrent client', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ status: 'seeding' }));
      wtMocks.clientInstance.get.mockReturnValue(null);

      await manager.removeTorrent(HASH_A);

      expect(repo.delete).toHaveBeenCalledWith(HASH_A);
    });

    it('5.2 skips WebTorrent removal for queued torrents (DB-only)', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ status: 'queued' }));

      await manager.removeTorrent(HASH_A);

      expect(wtMocks.clientInstance.remove).not.toHaveBeenCalled();
      expect(repo.delete).toHaveBeenCalledWith(HASH_A);
    });

    it('5.3 does NOT delete files when DB record is null', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(null);

      await manager.removeTorrent(HASH_A);

      expect(fsMocks.rm).not.toHaveBeenCalled();
      expect(repo.delete).toHaveBeenCalledWith(HASH_A);
    });

    it('5.4 does NOT delete files when DB record has no path', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ path: null }));

      await manager.removeTorrent(HASH_A);

      expect(fsMocks.rm).not.toHaveBeenCalled();
    });

    it('5.5 handles file deletion failure gracefully (logs error, continues with DB delete)', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ status: 'seeding' }));
      fsMocks.rm.mockRejectedValue(new Error('ENOENT: no such file'));

      await manager.removeTorrent(HASH_A);

      expect(repo.delete).toHaveBeenCalledWith(HASH_A);
    });

    it('5.6 promotes queued torrent when removing a downloading torrent', async () => {
      const { manager, repo } = makeManager();
      const downloadingTorrent = makeDbTorrent({ status: 'downloading' });
      repo.findByInfoHash.mockResolvedValue(downloadingTorrent);
      repo.findOldestQueued.mockResolvedValue(makeDbTorrent({ infoHash: HASH_B, status: 'queued', magnetUrl: `magnet:?xt=urn:btih:${HASH_B}` }));
      repo.countByStatus.mockResolvedValue(0);
      wtMocks.clientInstance.get.mockReturnValue(null);

      const promotedTorrent = makeClientTorrent({ infoHash: HASH_B });
      wtMocks.clientInstance.add.mockReturnValue(promotedTorrent);

      await manager.removeTorrent(HASH_A);

      expect(repo.delete).toHaveBeenCalledWith(HASH_A);
      expect(repo.updateStatus).toHaveBeenCalledWith(HASH_B, 'downloading');
    });

    it('5.7 does NOT promote queued torrent when removing a non-downloading torrent', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ status: 'seeding' }));

      await manager.removeTorrent(HASH_A);

      expect(repo.findOldestQueued).not.toHaveBeenCalled();
    });

    it('5.8 clears session baseline on removal', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ status: 'seeding' }));
      (manager as any).sessionUploadedBaselines.set(HASH_A, BigInt(500));

      await manager.removeTorrent(HASH_A);

      expect((manager as any).sessionUploadedBaselines.has(HASH_A)).toBe(false);
    });

    it('5.9 does not throw when WebTorrent removal fails with "not found"', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ status: 'seeding' }));
      wtMocks.clientInstance.get.mockImplementation(() => { throw new Error('not found'); });

      await expect(manager.removeTorrent(HASH_A)).resolves.not.toThrow();
      expect(repo.delete).toHaveBeenCalledWith(HASH_A);
    });

    it('5.10 throws when WebTorrent removal fails with a non-"not found" error', async () => {
      const { manager, repo } = makeManager();
      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ status: 'seeding' }));
      wtMocks.clientInstance.get.mockImplementation(() => { throw new Error('internal error'); });

      await expect(manager.removeTorrent(HASH_A)).rejects.toThrow('internal error');
    });
  });

  // =========================================================================
  // Phase 6 — syncStats corner cases
  // =========================================================================
  describe('syncStats', () => {
    it('6.1 skips torrents with no infoHash', async () => {
      const { manager, repo } = makeManager();
      wtMocks.clientInstance.torrents = [{ infoHash: null }, { infoHash: undefined }, {}];

      await manager.syncStats();

      expect(repo.updateProgress).not.toHaveBeenCalled();
    });

    it('6.2 handles P2025 error by removing unmanaged torrent from client', async () => {
      const { manager, repo } = makeManager();
      const torrent = makeClientTorrent({ infoHash: HASH_A });
      wtMocks.clientInstance.torrents = [torrent];
      const p2025Error = new Error('Record not found') as Error & { code: string };
      p2025Error.code = 'P2025';
      repo.findByInfoHash.mockRejectedValue(p2025Error);

      await manager.syncStats();

      expect(wtMocks.clientInstance.remove).toHaveBeenCalledWith(torrent);
    });

    it('6.3 skips sync when statsSyncInFlight is true (backpressure)', async () => {
      const { manager, repo } = makeManager();
      (manager as any).statsSyncInFlight = true;

      await manager.syncStats();

      expect(repo.updateProgress).not.toHaveBeenCalled();
    });

    it('6.4 accumulates session uploaded baselines correctly', async () => {
      const { manager, repo } = makeManager();
      const torrent = makeClientTorrent({
        infoHash: HASH_A,
        downloaded: 1000,
        uploaded: 500,
      });
      wtMocks.clientInstance.torrents = [torrent];

      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ uploaded: BigInt(2000) }));
      repo.updateProgress.mockResolvedValue(makeDbTorrent({ status: 'downloading' }));

      await manager.syncStats();

      const call = repo.updateProgress.mock.calls[0]!;
      const lifetimeUploaded = call[5];
      expect(lifetimeUploaded).toEqual(BigInt(2000) + BigInt(500));
    });

    it('6.5 computes ratio as 0 when downloaded is 0', async () => {
      const { manager, repo } = makeManager();
      const torrent = makeClientTorrent({
        infoHash: HASH_A,
        downloaded: 0,
        uploaded: 500,
      });
      wtMocks.clientInstance.torrents = [torrent];
      repo.findByInfoHash.mockResolvedValue(makeDbTorrent({ uploaded: BigInt(0) }));
      repo.updateProgress.mockResolvedValue(makeDbTorrent({ status: 'downloading' }));

      await manager.syncStats();

      const call = repo.updateProgress.mock.calls[0]!;
      expect(call[6]).toBe(0);
    });

    it('6.6 resets statsSyncInFlight to false after completion', async () => {
      const { manager, repo } = makeManager();
      wtMocks.clientInstance.torrents = [];
      (manager as any).statsSyncInFlight = false;

      await manager.syncStats();

      expect((manager as any).statsSyncInFlight).toBe(false);
    });

    it('6.7 resets statsSyncInFlight to false even when an error occurs', async () => {
      const { manager, repo } = makeManager();
      const torrent = makeClientTorrent({ infoHash: HASH_A });
      wtMocks.clientInstance.torrents = [torrent];
      repo.findByInfoHash.mockRejectedValue(new Error('unexpected'));

      await manager.syncStats();

      expect((manager as any).statsSyncInFlight).toBe(false);
    });
  });

  describe('normalizeEtaSeconds', () => {
    it('returns null for non-number values', async () => {
      const { manager } = makeManager();
      expect((manager as any).normalizeEtaSeconds('abc')).toBeNull();
      expect((manager as any).normalizeEtaSeconds(null)).toBeNull();
      expect((manager as any).normalizeEtaSeconds(undefined)).toBeNull();
    });

    it('returns null for Infinity and NaN', async () => {
      const { manager } = makeManager();
      expect((manager as any).normalizeEtaSeconds(Infinity)).toBeNull();
      expect((manager as any).normalizeEtaSeconds(NaN)).toBeNull();
    });

    it('returns null for negative values', async () => {
      const { manager } = makeManager();
      expect((manager as any).normalizeEtaSeconds(-1000)).toBeNull();
    });

    it('converts milliseconds to seconds', async () => {
      const { manager } = makeManager();
      expect((manager as any).normalizeEtaSeconds(5000)).toBe(5);
    });

    it('clamps to SQLITE_INT_MAX', async () => {
      const { manager } = makeManager();
      const veryLarge = 2_147_483_647_000;
      expect((manager as any).normalizeEtaSeconds(veryLarge)).toBe(2_147_483_647);
    });
  });

  // =========================================================================
  // Phase 7 — addTorrent queued path with torrent file (no magnet)
  // =========================================================================
  describe('addTorrent — queued with torrent file', () => {
    it('7.1 queued torrent with torrentFile (no magnet) generates placeholder infoHash', async () => {
      const { manager, repo } = makeManager();
      (manager as any).maxActiveDownloads = 1;
      repo.countByStatus.mockResolvedValue(1);
      repo.findByInfoHash.mockResolvedValue(null);
      repo.upsert.mockResolvedValue(makeDbTorrent({ status: 'queued' }));

      const result = await manager.addTorrent({
        torrentFile: Buffer.from('fake-torrent'),
        name: 'File.Only.Torrent',
      });

      expect(repo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          magnetUrl: null,
          torrentFile: Buffer.from('fake-torrent'),
        }),
      );
      expect(result.infoHash).toMatch(/^queued-\d+-[a-z0-9]+$/);
      expect(result.name).toBe('File.Only.Torrent');
    });

    it('7.2 queued torrent with torrentFile preserves the file buffer in DB', async () => {
      const { manager, repo } = makeManager();
      (manager as any).maxActiveDownloads = 1;
      repo.countByStatus.mockResolvedValue(1);
      repo.findByInfoHash.mockResolvedValue(null);
      repo.upsert.mockResolvedValue(makeDbTorrent({ status: 'queued' }));

      const fileBuffer = Buffer.from('torrent-file-data');
      await manager.addTorrent({ torrentFile: fileBuffer });

      const upsertCall = repo.upsert.mock.calls[0]![0];
      expect(upsertCall.torrentFile).toBe(fileBuffer);
    });

    it('7.3 promotion of queued torrent-file torrent: uses torrentFile when no magnetUrl', async () => {
      const { manager, repo } = makeManager();
      const fileBuffer = Buffer.from('torrent-data');
      const queued = makeDbTorrent({
        infoHash: 'queued-placeholder',
        status: 'queued',
        magnetUrl: null,
        torrentFile: fileBuffer,
      });
      repo.findOldestQueued.mockResolvedValue(queued);
      repo.countByStatus.mockResolvedValue(0);

      const promotedTorrent = makeClientTorrent({ infoHash: HASH_A });
      wtMocks.clientInstance.add.mockReturnValue(promotedTorrent);

      await (manager as any).promoteNextQueued();

      expect(wtMocks.clientInstance.add).toHaveBeenCalledWith(fileBuffer, expect.any(Object));
    });

    it('7.4 promotion failure marks torrent as error', async () => {
      const { manager, repo } = makeManager();
      const queued = makeDbTorrent({
        infoHash: 'queued-placeholder',
        status: 'queued',
        magnetUrl: null,
        torrentFile: Buffer.from('bad-torrent'),
      });
      repo.findOldestQueued.mockResolvedValue(queued);
      repo.countByStatus.mockResolvedValue(0);
      wtMocks.clientInstance.add.mockImplementation(() => { throw new Error('invalid torrent'); });

      await (manager as any).promoteNextQueued();

      expect(repo.updateStatus).toHaveBeenCalledWith('queued-placeholder', 'error');
    });

    it('7.5 promotion replaces placeholder infoHash when real hash resolves', async () => {
      const { manager, repo } = makeManager();
      const placeholderHash = 'queued-placeholder-123';
      const queued = makeDbTorrent({
        infoHash: placeholderHash,
        status: 'queued',
        magnetUrl: null,
        torrentFile: Buffer.from('torrent-data'),
      });
      repo.findOldestQueued.mockResolvedValue(queued);
      repo.countByStatus.mockResolvedValue(0);

      const promotedTorrent = makeClientTorrent({ infoHash: HASH_A });
      wtMocks.clientInstance.add.mockReturnValue(promotedTorrent);

      await (manager as any).promoteNextQueued();

      expect(repo.delete).toHaveBeenCalledWith(placeholderHash);
      expect(repo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ infoHash: HASH_A, status: 'downloading' }),
      );
    });
  });
});
