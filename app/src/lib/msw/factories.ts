export type FactoryMode = 'deterministic' | 'random';

export interface MockSeriesEpisode {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  monitored: boolean;
  path: string | null;
}

export interface MockSeries {
  id: number;
  tvdbId: number;
  title: string;
  year: number;
  status: string;
  monitored: boolean;
  seasons: Array<{
    seasonNumber: number;
    monitored: boolean;
    episodes: MockSeriesEpisode[];
  }>;
}

export interface MockMovie {
  id: number;
  tmdbId: number;
  title: string;
  year: number;
  status: string;
  monitored: boolean;
  fileVariants: Array<{ id: number; path: string }>;
}

export interface MockIndexer {
  id: number;
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: string;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
  health: {
    failureCount: number;
    lastErrorMessage: string | null;
  } | null;
}

export interface MockTorrent {
  infoHash: string;
  name: string;
  status: string;
  progress: number;
  size: string;
  downloaded: string;
  uploaded: string;
  downloadSpeed: number;
  uploadSpeed: number;
  eta: number | null;
}

export interface MockDataset {
  series: MockSeries[];
  movies: MockMovie[];
  indexers: MockIndexer[];
  torrents: MockTorrent[];
  activity: Array<{
    id: number;
    eventType: string;
    sourceModule: string;
    summary: string;
    success: boolean;
    occurredAt: string;
  }>;
  settings: {
    torrentLimits: {
      maxActiveDownloads: number;
      maxActiveSeeds: number;
      globalDownloadLimitKbps: number | null;
      globalUploadLimitKbps: number | null;
    };
    schedulerIntervals: {
      rssSyncMinutes: number;
      availabilityCheckMinutes: number;
      torrentMonitoringSeconds: number;
    };
    pathVisibility: {
      showDownloadPath: boolean;
      showMediaPath: boolean;
    };
  };
}

function createRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 48271) % 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function buildSeries(rng: () => number, index: number): MockSeries {
  const id = index + 1;
  const title = ['Andor', 'Foundation', 'Silo', 'Severance', 'Slow Horses'][index % 5] ?? `Series ${id}`;

  const seasons = [1, 2].map(seasonNumber => ({
    seasonNumber,
    monitored: true,
    episodes: [1, 2, 3].map(episodeNumber => {
      const hasFile = rng() > 0.45;
      return {
        id: id * 100 + seasonNumber * 10 + episodeNumber,
        seasonNumber,
        episodeNumber,
        title: `Episode ${episodeNumber}`,
        monitored: true,
        path: hasFile ? `/media/series/${title}/S${seasonNumber}E${episodeNumber}.mkv` : null,
      };
    }),
  }));

  return {
    id,
    tvdbId: id + 1000,
    title,
    year: 2018 + (index % 7),
    status: rng() > 0.5 ? 'continuing' : 'ended',
    monitored: rng() > 0.2,
    seasons,
  };
}

function buildMovie(rng: () => number, index: number): MockMovie {
  const id = index + 1;
  const title = ['The Matrix', 'Arrival', 'Dune', 'Interstellar', 'Blade Runner 2049'][index % 5] ?? `Movie ${id}`;
  const hasFile = rng() > 0.3;

  return {
    id,
    tmdbId: 600 + id,
    title,
    year: 1990 + index,
    status: hasFile ? 'released' : 'announced',
    monitored: rng() > 0.2,
    fileVariants: hasFile ? [{ id: id * 10, path: `/media/movies/${title}.mkv` }] : [],
  };
}

function buildIndexer(rng: () => number, index: number): MockIndexer {
  const id = index + 1;
  const failing = rng() > 0.7;

  return {
    id,
    name: `Indexer ${id}`,
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    settings: JSON.stringify({ url: `https://indexer${id}.example/api`, apiKey: `key-${id}` }),
    protocol: 'torrent',
    enabled: rng() > 0.15,
    supportsRss: true,
    supportsSearch: true,
    priority: 10 + index,
    health: failing
      ? {
          failureCount: 3,
          lastErrorMessage: 'timeout',
        }
      : {
          failureCount: 0,
          lastErrorMessage: null,
        },
  };
}

function buildTorrent(rng: () => number, index: number): MockTorrent {
  const progress = Math.round(rng() * 100);
  return {
    infoHash: `hash-${index + 1}`,
    name: `Release ${index + 1}`,
    status: progress >= 100 ? 'seeding' : 'downloading',
    progress,
    size: String(2_000_000_000),
    downloaded: String(Math.round(2_000_000_000 * (progress / 100))),
    uploaded: String(Math.round(700_000_000 * rng())),
    downloadSpeed: Math.round(1_500_000 * rng()),
    uploadSpeed: Math.round(400_000 * rng()),
    eta: progress >= 100 ? null : Math.round(5000 * rng()),
  };
}

export function createMockDataset(mode: FactoryMode = 'deterministic'): MockDataset {
  const rng = createRng(mode === 'deterministic' ? 7 : Date.now());

  return {
    series: Array.from({ length: 14 }, (_unused, index) => buildSeries(rng, index)),
    movies: Array.from({ length: 12 }, (_unused, index) => buildMovie(rng, index)),
    indexers: Array.from({ length: 6 }, (_unused, index) => buildIndexer(rng, index)),
    torrents: Array.from({ length: 8 }, (_unused, index) => buildTorrent(rng, index)),
    activity: Array.from({ length: 14 }, (_unused, index) => ({
      id: index + 1,
      eventType: index % 2 === 0 ? 'MEDIA_ADDED' : 'GRAB_RELEASE',
      sourceModule: index % 2 === 0 ? 'library' : 'search',
      summary: index % 2 === 0 ? 'Media added to library' : 'Release grabbed and sent to queue',
      success: true,
      occurredAt: new Date(Date.now() - index * 1000 * 60 * 3).toISOString(),
    })),
    settings: {
      torrentLimits: {
        maxActiveDownloads: 3,
        maxActiveSeeds: 5,
        globalDownloadLimitKbps: null,
        globalUploadLimitKbps: null,
      },
      schedulerIntervals: {
        rssSyncMinutes: 15,
        availabilityCheckMinutes: 30,
        torrentMonitoringSeconds: 5,
      },
      pathVisibility: {
        showDownloadPath: true,
        showMediaPath: true,
      },
    },
  };
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalCount = items.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / Math.max(pageSize, 1)) : 0;
  const start = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);

  return {
    items: items.slice(start, start + pageSize),
    meta: {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      totalCount,
      totalPages,
    },
  };
}
