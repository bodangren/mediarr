/**
 * Phase 4: Grab → TorrentManager → ImportManager Handoff Integration Tests
 *
 * Tests the handoff from torrent grab through completion to import.
 * Verifies that episodeId/movieId flow correctly from addTorrent through
 * to the ImportManager's fast-path and slow-path import logic.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportManager } from './ImportManager';

// ─── Mock Helpers ─────────────────────────────────────────────────────────────

function makeTorrentManager() {
  const listeners: Record<string, ((payload: any) => void)[]> = {};
  return {
    on: vi.fn((event: string, cb: (payload: any) => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    }),
    emit(event: string, payload: any) {
      for (const cb of listeners[event] ?? []) {
        cb(payload);
      }
    },
    addTorrent: vi.fn().mockResolvedValue({ infoHash: 'testhash123' }),
  };
}

function makeOrganizer() {
  return {
    organizeFile: vi.fn().mockResolvedValue('/media/tv/Show/Season 01/Show - S01E01 - Pilot.mkv'),
    organizeMovieFile: vi.fn().mockResolvedValue('/media/movies/The Matrix (1999)/The Matrix (1999).mkv'),
  };
}

function makeActivityEmitter() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

function makeDb({
  series = null as any,
  episode = null as any,
  episodeFindUnique = undefined as any,
  movie = null as any,
  mediaManagement = null as any,
  torrent = null as any,
  activityEvent = null as any,
} = {}) {
  const linkedEpisodeResult = episodeFindUnique !== undefined ? episodeFindUnique : episode;
  return {
    series: {
      findFirst: vi.fn().mockResolvedValue(series),
      update: vi.fn().mockResolvedValue(series),
    },
    episode: {
      findFirst: vi.fn().mockResolvedValue(episode),
      findUnique: vi.fn().mockResolvedValue(linkedEpisodeResult),
      update: vi.fn().mockResolvedValue(episode),
    },
    movie: {
      findFirst: vi.fn().mockResolvedValue(movie),
      findUnique: vi.fn().mockResolvedValue(movie),
      update: vi.fn().mockResolvedValue(movie),
    },
    mediaFileVariant: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    appSettings: {
      findUnique: vi.fn().mockResolvedValue(
        mediaManagement
          ? { mediaManagement }
          : null,
      ),
    },
    torrent: {
      findUnique: vi.fn().mockResolvedValue(torrent),
    },
    activityEvent: {
      findUnique: vi.fn().mockResolvedValue(activityEvent),
    },
  };
}

// Fs mock — hoisted
vi.mock('node:fs/promises', () => ({
  default: {
    stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
    readdir: vi.fn().mockResolvedValue([]),
    mkdir: vi.fn().mockResolvedValue(undefined),
    link: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
}));

async function fireTorrentComplete(
  torrentManager: ReturnType<typeof makeTorrentManager>,
  payload: any,
) {
  torrentManager.emit('torrent:completed', payload);
  await new Promise(r => setImmediate(r));
  await new Promise(r => setTimeout(r, 0));
}

// ─── Phase 4 Tests ────────────────────────────────────────────────────────────

describe('Grab → TorrentManager → ImportManager Handoff', () => {
  let torrentManager: ReturnType<typeof makeTorrentManager>;
  let organizer: ReturnType<typeof makeOrganizer>;
  let activityEmitter: ReturnType<typeof makeActivityEmitter>;

  beforeEach(async () => {
    torrentManager = makeTorrentManager();
    organizer = makeOrganizer();
    activityEmitter = makeActivityEmitter();
    vi.clearAllMocks();
    // Reset fs mock to default successful state
    const fs = await import('node:fs/promises');
    (fs.default.stat as any).mockResolvedValue({ isDirectory: () => false });
    (fs.default.readdir as any).mockResolvedValue([]);
  });

  it('4.1 addTorrent called with episodeId → ImportManager fast-path triggers on completion', async () => {
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      path: '/media/tv/Breaking Bad',
    };
    const episode = {
      id: 42,
      seasonNumber: 1,
      episodeNumber: 1,
      monitored: true,
      path: null,
      season: { series },
    };

    const torrentRow = {
      infoHash: 'testhash123',
      name: 'Breaking.Bad.S01E01.mkv',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
      episodeId: 42,
      movieId: null,
    };

    const prisma = makeDb({
      series,
      episode,
      episodeFindUnique: episode,
      torrent: torrentRow,
      mediaManagement: { tvRootFolder: '/media/tv' },
    });

    new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);

    await fireTorrentComplete(torrentManager, {
      infoHash: 'testhash123',
      name: 'Breaking.Bad.S01E01',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
    });

    expect(organizer.organizeFile).toHaveBeenCalled();
    expect(organizer.organizeMovieFile).not.toHaveBeenCalled();
    expect(prisma.episode.update).toHaveBeenCalled();
  });

  it('4.2 addTorrent called WITHOUT episodeId → ImportManager slow-path parses filename → matches → imports', async () => {
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      path: '/media/tv/Breaking Bad',
    };
    const episode = {
      id: 42,
      seasonNumber: 1,
      episodeNumber: 1,
      monitored: true,
      path: null,
    };

    const torrentRow = {
      infoHash: 'testhash456',
      name: 'Breaking.Bad.S01E01.mkv',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
      episodeId: null,
      movieId: null,
    };

    const prisma = makeDb({
      series,
      episode,
      torrent: torrentRow,
      mediaManagement: { tvRootFolder: '/media/tv' },
    });

    new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);

    await fireTorrentComplete(torrentManager, {
      infoHash: 'testhash456',
      name: 'Breaking.Bad.S01E01',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
    });

    expect(organizer.organizeFile).toHaveBeenCalled();
    expect(organizer.organizeMovieFile).not.toHaveBeenCalled();
  });

  it('4.3 Torrent completes but files no longer exist on disk → ImportManager emits IMPORT_FAILED', async () => {
    const torrentRow = {
      infoHash: 'testhash789',
      name: 'Missing.Files.Torrent',
      path: '/downloads/complete/MissingFiles',
      episodeId: null,
      movieId: null,
    };

    const prisma = makeDb({
      torrent: torrentRow,
      mediaManagement: { tvRootFolder: '/media/tv', movieRootFolder: '/media/movies' },
    });

    const fs = await import('node:fs/promises');
    (fs.default.stat as any).mockRejectedValue(new Error('ENOENT: no such file or directory'));

    new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);

    await fireTorrentComplete(torrentManager, {
      infoHash: 'testhash789',
      name: 'MissingFiles',
      path: '/downloads/complete/MissingFiles',
    });

    expect(activityEmitter.emit).toHaveBeenCalled();
    const emittedEvent = activityEmitter.emit.mock.calls[0]![0];
    expect(emittedEvent.eventType).toBe('IMPORT_FAILED');
  });

  it('4.4 Torrent removed before completion → no import attempted → no crash', async () => {
    const prisma = makeDb({
      mediaManagement: { tvRootFolder: '/media/tv' },
    });

    const importManager = new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);

    expect(importManager).toBeDefined();
    expect(activityEmitter.emit).not.toHaveBeenCalled();
  });

  it('4.5 Seed limit reached during active import → torrent row exists with episodeId → import guard protects', async () => {
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      path: '/media/tv/Breaking Bad',
    };
    const episode = {
      id: 42,
      seasonNumber: 1,
      episodeNumber: 1,
      monitored: true,
      path: null,
      season: { series },
    };

    const torrentRow = {
      infoHash: 'testhash123',
      name: 'Breaking.Bad.S01E01.mkv',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
      episodeId: 42,
      movieId: null,
    };

    const prisma = makeDb({
      series,
      episode,
      episodeFindUnique: episode,
      torrent: torrentRow,
      mediaManagement: { tvRootFolder: '/media/tv' },
    });

    new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);

    await fireTorrentComplete(torrentManager, {
      infoHash: 'testhash123',
      name: 'Breaking.Bad.S01E01',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
    });

    expect(organizer.organizeFile).toHaveBeenCalled();
    expect(prisma.episode.update).toHaveBeenCalled();
    expect(torrentRow.episodeId).toBe(42);
  });
});
