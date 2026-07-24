import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportManager } from './ImportManager';
import { isImportIncomplete } from './importGuard';

const fsState = vi.hoisted(() => ({
  directoryPath: null as string | null,
  files: [] as string[],
}));

vi.mock('node:fs', () => ({
  default: {
    statSync: vi.fn().mockReturnValue({ dev: 2049 }),
  },
}));

vi.mock('node:fs/promises', () => ({
  default: {
    stat: vi.fn(async (target: string) => ({
      isDirectory: () => target === fsState.directoryPath,
    })),
    readdir: vi.fn(async () => fsState.files),
  },
}));

const singleFilePath = '/downloads/Example.Show.S01E01E02.1080p.mkv';
const organizedPath = '/media/tv/Example Show/Season 01/Example Show - S01E01-E02.mkv';
const series = {
  id: 1,
  title: 'Example Show',
  cleanTitle: 'exampleshow',
  path: '/media/tv/Example Show',
};

interface EpisodeRecord {
  id: number;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  path: string | null;
  season: { series: typeof series };
}

function episode(id: number, episodeNumber: number): EpisodeRecord {
  return {
    id,
    seriesId: series.id,
    seasonNumber: 1,
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    path: null,
    season: { series },
  };
}

function makeTorrentManager() {
  const listeners = new Map<string, Array<(payload: {
    infoHash: string;
    name: string;
    path: string;
  }) => void>>();
  return {
    on: vi.fn((event: string, listener: (payload: {
      infoHash: string;
      name: string;
      path: string;
    }) => void) => {
      const eventListeners = listeners.get(event) ?? [];
      eventListeners.push(listener);
      listeners.set(event, eventListeners);
    }),
    emit(event: string, payload: { infoHash: string; name: string; path: string }) {
      for (const listener of listeners.get(event) ?? []) {
        listener(payload);
      }
    },
  };
}

function makeHarness({
  linkedIds = [10, 11, 10],
  episodes = [episode(10, 1), episode(11, 2)],
  infoHash = 'multi-episode',
  torrentPath = singleFilePath,
  torrentName = 'Example.Show.S01E01E02.1080p.mkv',
} = {}) {
  const state = new Map(episodes.map(item => [item.id, { ...item }]));
  const organizer = {
    organizeFile: vi.fn().mockResolvedValue(organizedPath),
    organizeMovieFile: vi.fn(),
  };
  const activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) };
  const onEpisodeImported = vi.fn().mockResolvedValue(undefined);
  const notifyDownload = vi.fn().mockResolvedValue(undefined);
  const torrentManager = makeTorrentManager();

  const prisma = {
    torrent: {
      findUnique: vi.fn().mockResolvedValue({
        episodeId: linkedIds[0] ?? null,
        episodeIds: linkedIds,
        movieId: null,
      }),
    },
    episode: {
      findUnique: vi.fn(async ({ where }: { where: { id: number } }) => state.get(where.id) ?? null),
      findFirst: vi.fn(async ({ where }: {
        where: { seriesId: number; seasonNumber: number; episodeNumber: number };
      }) => [...state.values()].find(item => (
        item.seriesId === where.seriesId
        && item.seasonNumber === where.seasonNumber
        && item.episodeNumber === where.episodeNumber
      )) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: number }; data: { path: string } }) => {
        const current = state.get(where.id);
        if (!current) throw new Error(`episode ${where.id} not found`);
        const updated = { ...current, ...data };
        state.set(where.id, updated);
        return updated;
      }),
      updateMany: vi.fn(async ({ where, data }: {
        where: { id: { in: number[] } };
        data: { path: string };
      }) => {
        let count = 0;
        for (const id of where.id.in) {
          const current = state.get(id);
          if (!current) continue;
          state.set(id, { ...current, ...data });
          count += 1;
        }
        return { count };
      }),
    },
    series: {
      findFirst: vi.fn().mockResolvedValue(series),
      update: vi.fn(),
    },
    movie: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    mediaFileVariant: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    appSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  };

  new ImportManager(
    torrentManager,
    organizer as never,
    prisma as never,
    activityEventEmitter as never,
    { onEpisodeImported },
    { notifyDownload } as never,
  );

  return {
    activityEventEmitter,
    notifyDownload,
    onEpisodeImported,
    organizer,
    prisma,
    state,
    torrentManager,
    torrent: { infoHash, name: torrentName, path: torrentPath },
  };
}

async function importTorrent(harness: ReturnType<typeof makeHarness>): Promise<void> {
  harness.torrentManager.emit('torrent:completed', harness.torrent);
  const expectedEventCount = harness.torrent.path === fsState.directoryPath
    ? fsState.files.length
    : 1;
  await vi.waitFor(() => {
    expect(harness.activityEventEmitter.emit).toHaveBeenCalledTimes(expectedEventCount);
  });
  await new Promise<void>(resolve => setImmediate(resolve));
}

describe('ImportManager linked multi-episode files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fsState.directoryPath = null;
    fsState.files = [];
  });

  it('organizes one physical file once and persists every deduplicated linked episode', async () => {
    const harness = makeHarness();

    await importTorrent(harness);

    expect(harness.organizer.organizeFile).toHaveBeenCalledTimes(1);
    expect(harness.organizer.organizeFile).toHaveBeenCalledWith(
      singleFilePath,
      series,
      expect.objectContaining({ id: 10, seasonNumber: 1, episodeNumber: 1 }),
      { strategy: 'hardlink' },
    );
    expect(harness.prisma.episode.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: { in: [10, 11] } },
      data: { path: organizedPath },
    });
    expect(harness.prisma.episode.update).not.toHaveBeenCalled();
    expect(harness.prisma.mediaFileVariant.upsert).toHaveBeenCalledExactlyOnceWith({
      where: { mediaType_path: { mediaType: 'EPISODE', path: organizedPath } },
      create: {
        mediaType: 'EPISODE',
        episodeId: 10,
        path: organizedPath,
        fileSize: BigInt(0),
      },
      update: { episodeId: 10 },
    });
    expect(harness.activityEventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(harness.activityEventEmitter.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'SERIES_IMPORTED',
      sourceModule: 'import-manager',
      entityRef: 'torrent:multi-episode',
      success: true,
      details: expect.objectContaining({ episodeIds: [10, 11] }),
    }));
    expect(harness.notifyDownload).toHaveBeenCalledTimes(1);
    expect(harness.onEpisodeImported.mock.calls).toEqual([[10], [11]]);

    await expect(isImportIncomplete(harness.prisma as never, {
      episodeId: 10,
      episodeIds: [10, 11, 10],
      movieId: null,
    })).resolves.toEqual({ incomplete: false });
  });

  it('fails closed before mutation when any linked episode is missing', async () => {
    const harness = makeHarness({
      episodes: [episode(10, 1)],
      infoHash: 'missing-linked-episode',
    });

    await importTorrent(harness);

    expect(harness.prisma.episode.findUnique).toHaveBeenCalledTimes(2);
    expect(harness.organizer.organizeFile).not.toHaveBeenCalled();
    expect(harness.prisma.episode.update).not.toHaveBeenCalled();
    expect(harness.prisma.episode.updateMany).not.toHaveBeenCalled();
    expect(harness.prisma.mediaFileVariant.upsert).not.toHaveBeenCalled();
    expect(harness.onEpisodeImported).not.toHaveBeenCalled();
    expect(harness.notifyDownload).not.toHaveBeenCalled();
    expect(harness.activityEventEmitter.emit).toHaveBeenCalledExactlyOnceWith({
      eventType: 'IMPORT_FAILED',
      sourceModule: 'import-manager',
      entityRef: 'torrent:missing-linked-episode',
      summary: 'Linked episode (id=11) not found for Example.Show.S01E01E02.1080p.mkv',
      success: false,
      details: {
        sourcePath: singleFilePath,
        torrentName: 'Example.Show.S01E01E02.1080p.mkv',
        reason: 'linked episode id=11 not found in library',
      },
      occurredAt: expect.any(Date),
    });
  });

  it('fails closed before mutation when the linked episodes do not exactly match the parsed file', async () => {
    const harness = makeHarness({
      episodes: [episode(10, 1), episode(11, 3)],
      infoHash: 'mismatched-linked-episodes',
    });

    await importTorrent(harness);

    expect(harness.organizer.organizeFile).not.toHaveBeenCalled();
    expect(harness.prisma.episode.update).not.toHaveBeenCalled();
    expect(harness.prisma.episode.updateMany).not.toHaveBeenCalled();
    expect(harness.prisma.mediaFileVariant.upsert).not.toHaveBeenCalled();
    expect(harness.onEpisodeImported).not.toHaveBeenCalled();
    expect(harness.notifyDownload).not.toHaveBeenCalled();
    expect(harness.activityEventEmitter.emit).toHaveBeenCalledExactlyOnceWith({
      eventType: 'IMPORT_FAILED',
      sourceModule: 'import-manager',
      entityRef: 'torrent:mismatched-linked-episodes',
      summary: 'Linked episodes do not match Example.Show.S01E01E02.1080p.mkv',
      success: false,
      details: {
        sourcePath: singleFilePath,
        torrentName: 'Example.Show.S01E01E02.1080p.mkv',
        reason: 'linked episodes do not match parsed multi-episode file',
      },
      occurredAt: expect.any(Date),
    });
  });

  it('preserves per-file processing for ordinary multi-file episode packs', async () => {
    const torrentPath = '/downloads/Example.Show.S01';
    fsState.directoryPath = torrentPath;
    fsState.files = [
      'Example.Show.S01E01.1080p.mkv',
      'Example.Show.S01E02.1080p.mkv',
    ];
    const harness = makeHarness({
      linkedIds: [10, 11],
      torrentPath,
      torrentName: 'Example.Show.S01',
    });
    harness.organizer.organizeFile.mockImplementation(async (
      _source: string,
      _series: unknown,
      linkedEpisode: EpisodeRecord,
    ) => `/media/tv/Example Show/Season 01/E${linkedEpisode.episodeNumber}.mkv`);

    await importTorrent(harness);

    expect(harness.organizer.organizeFile).toHaveBeenCalledTimes(2);
    expect(harness.prisma.episode.update).toHaveBeenCalledTimes(2);
    expect(harness.prisma.episode.updateMany).not.toHaveBeenCalled();
    expect(harness.state.get(10)?.path).toBe('/media/tv/Example Show/Season 01/E1.mkv');
    expect(harness.state.get(11)?.path).toBe('/media/tv/Example Show/Season 01/E2.mkv');
    expect(harness.onEpisodeImported.mock.calls).toEqual([[10], [11]]);
  });
});
