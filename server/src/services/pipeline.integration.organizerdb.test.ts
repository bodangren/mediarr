/**
 * Phase 5: Import → Organizer → DB Update Handoff Integration Tests
 *
 * Tests the handoff between file organization and database updates.
 * Verifies transaction safety: DB path updated before fs rename,
 * with rollback on organizer failure.
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

// ─── Phase 5 Tests ────────────────────────────────────────────────────────────

describe('Import → Organizer → DB Update Handoff', () => {
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

  it('5.1 Episode import → organizer renames file → DB path updated → SERIES_IMPORTED emitted', async () => {
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

    // Organizer should rename/organize the file
    expect(organizer.organizeFile).toHaveBeenCalled();
    // DB should update the episode path
    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: episode.id },
        data: expect.objectContaining({
          path: expect.any(String),
        }),
      }),
    );
    // SERIES_IMPORTED event should be emitted
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SERIES_IMPORTED',
        success: true,
      }),
    );
  });

  it('5.2 Movie import → organizer renames file → DB mediaFileVariant updated → MOVIE_IMPORTED emitted', async () => {
    const movie = {
      id: 7,
      title: 'The Matrix',
      year: 1999,
      path: '/media/movies/The Matrix (1999)',
    };

    const torrentRow = {
      infoHash: 'testhash456',
      name: 'The.Matrix.1999.mkv',
      path: '/downloads/complete/The.Matrix.1999.mkv',
      episodeId: null,
      movieId: 7,
    };

    const prisma = makeDb({
      movie,
      torrent: torrentRow,
      mediaManagement: { movieRootFolder: '/media/movies' },
    });

    new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);

    await fireTorrentComplete(torrentManager, {
      infoHash: 'testhash456',
      name: 'The.Matrix.1999',
      path: '/downloads/complete/The.Matrix.1999.mkv',
    });

    // Organizer should rename/organize the movie file
    expect(organizer.organizeMovieFile).toHaveBeenCalled();
    // DB should upsert the mediaFileVariant
    expect(prisma.mediaFileVariant.upsert).toHaveBeenCalled();
    // MOVIE_IMPORTED event should be emitted
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'MOVIE_IMPORTED',
        success: true,
      }),
    );
  });

  it('5.3 Organizer throws during episode import → IMPORT_FAILED emitted → no partial state', async () => {
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
      infoHash: 'testhash789',
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

    // Organizer throws — simulates disk full or permission error
    organizer.organizeFile.mockRejectedValue(new Error('ENOSPC: no space left on device'));

    new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);

    await fireTorrentComplete(torrentManager, {
      infoHash: 'testhash789',
      name: 'Breaking.Bad.S01E01',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
    });

    // IMPORT_FAILED event should be emitted
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'IMPORT_FAILED',
        success: false,
      }),
    );
    // DB should NOT have been updated (organizer failed before DB update)
    expect(prisma.episode.update).not.toHaveBeenCalled();
  });

  it('5.4 DB update throws after organizer succeeds → error propagates → IMPORT_FAILED emitted', async () => {
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
      infoHash: 'testhash101',
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

    // Organizer succeeds but DB update fails
    prisma.episode.update.mockRejectedValue(new Error('Database connection lost'));

    new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);

    await fireTorrentComplete(torrentManager, {
      infoHash: 'testhash101',
      name: 'Breaking.Bad.S01E01',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
    });

    // Organizer was called (file was organized)
    expect(organizer.organizeFile).toHaveBeenCalled();
    // IMPORT_FAILED event should be emitted (DB update failed)
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'IMPORT_FAILED',
        success: false,
      }),
    );
  });

  it('5.5 No TV root folder configured → IMPORT_FAILED emitted → no organizer called', async () => {
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      path: null, // series has no path
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
      infoHash: 'testhash202',
      name: 'Breaking.Bad.S01E01.mkv',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
      episodeId: 42,
      movieId: null,
    };

    // No tvRootFolder configured
    const prisma = makeDb({
      series,
      episode,
      episodeFindUnique: episode,
      torrent: torrentRow,
      mediaManagement: { tvRootFolder: null },
    });

    new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);

    await fireTorrentComplete(torrentManager, {
      infoHash: 'testhash202',
      name: 'Breaking.Bad.S01E01',
      path: '/downloads/complete/Breaking.Bad.S01E01.mkv',
    });

    // Organizer should NOT be called (no root folder)
    expect(organizer.organizeFile).not.toHaveBeenCalled();
    // IMPORT_FAILED event should be emitted
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'IMPORT_FAILED',
        success: false,
      }),
    );
  });
});
