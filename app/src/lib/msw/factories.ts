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
  qualityProfileId: number;
  added?: string;
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

export interface MockMissingMovie {
  id: number;
  movieId: number;
  title: string;
  year: number;
  posterUrl?: string;
  status: 'missing' | 'announced' | 'incinemas' | 'released';
  monitored: boolean;
  cinemaDate?: string;
  physicalRelease?: string;
  digitalRelease?: string;
  qualityProfileId: number;
  qualityProfileName?: string;
  runtime?: number;
  certification?: string;
  genres?: string[];
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
  missingMovies: MockMissingMovie[];
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
    qualityProfileId: (index % 2) + 1,
    added: new Date(REFERENCE_DATE.getTime() - index * 86_400_000).toISOString(),
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

function buildMissingMovie(rng: () => number, index: number): MockMissingMovie {
  const id = index + 1;
  const movieId = 100 + id;
  const title = ['Dune: Part Two', 'Godzilla x Kong: The New Empire', 'Civil War', 'Furiosa: A Mad Max Saga', 'Inside Out 2'][index % 5] ?? `Missing Movie ${id}`;

  return {
    id,
    movieId,
    title,
    year: 2023 + (index % 2),
    posterUrl: `https://image.tmdb.org/t/p/w200/mock${id}.jpg`,
    status: ['missing', 'announced', 'incinemas', 'released'][index % 4] as 'missing' | 'announced' | 'incinemas' | 'released',
    monitored: rng() > 0.15,
    cinemaDate: index % 3 === 0 ? '2024-03-01' : undefined,
    digitalRelease: index % 3 === 1 ? '2024-05-14' : undefined,
    physicalRelease: index % 3 === 2 ? '2024-06-18' : undefined,
    qualityProfileId: index % 2 === 0 ? 1 : 2,
    qualityProfileName: index % 2 === 0 ? 'HD-1080p' : 'UHD-2160p',
    runtime: 100 + (index % 10) * 10,
    certification: ['PG-13', 'R', 'PG'][index % 3],
    genres: ['Action', 'Adventure', 'Sci-Fi'].slice(0, 1 + (index % 3)),
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
    missingMovies: Array.from({ length: 8 }, (_unused, index) => buildMissingMovie(rng, index)),
    indexers: Array.from({ length: 6 }, (_unused, index) => buildIndexer(rng, index)),
    torrents: Array.from({ length: 8 }, (_unused, index) => buildTorrent(rng, index)),
    activity: Array.from({ length: 14 }, (_unused, index) => ({
      id: index + 1,
      eventType: index % 2 === 0 ? 'MEDIA_ADDED' : 'GRAB_RELEASE',
      sourceModule: index % 2 === 0 ? 'library' : 'search',
      summary: index % 2 === 0 ? 'Media added to library' : 'Release grabbed and sent to queue',
      success: true,
      occurredAt: new Date(REFERENCE_DATE.getTime() - index * 1000 * 60 * 3).toISOString(),
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

// Deterministic reference date for all mock fixtures so MSW responses are
// stable across test runs regardless of when the suite executes.
const REFERENCE_DATE = new Date('2026-06-12T00:00:00.000Z');

export interface MockBackup {
  id: number;
  name: string;
  path: string;
  size: number;
  created: string;
  type: 'manual' | 'scheduled';
}

export interface MockBackupSchedule {
  enabled: boolean;
  interval: string;
  retentionDays: number;
  lastBackup: string | null;
  nextBackup: string;
}

export function createMockBackup(id: number, overrides?: Partial<MockBackup>): MockBackup {
  const name = `backup-${REFERENCE_DATE.toISOString().slice(0, 10)}-${id}.db`;
  return {
    id,
    name,
    path: `/data/backups/${name}`,
    size: 1_048_576,
    created: new Date(REFERENCE_DATE.getTime() - (id - 1) * 86_400_000).toISOString(),
    type: id === 1 ? 'scheduled' : 'manual',
    ...overrides,
  };
}

export function createMockBackupSchedule(overrides?: Partial<MockBackupSchedule>): MockBackupSchedule {
  return {
    enabled: true,
    interval: 'daily',
    retentionDays: 30,
    lastBackup: null,
    nextBackup: new Date(REFERENCE_DATE.getTime() + 86_400_000).toISOString(),
    ...overrides,
  };
}

export interface MockBlocklist {
  id: number;
  title: string;
  indexer: string;
  reason: string;
  createdAt: string;
}

export function createMockBlocklist(id: number, overrides?: Partial<MockBlocklist>): MockBlocklist {
  return {
    id,
    title: 'Bad Release',
    indexer: 'Indexer 1',
    reason: 'Poor quality',
    createdAt: REFERENCE_DATE.toISOString(),
    ...overrides,
  };
}

export interface MockCollection {
  id: number;
  name: string;
  type: string;
  monitored: boolean;
  movieCount?: number;
  seriesCount?: number;
}

export function createMockCollection(id: number, overrides?: Partial<MockCollection>): MockCollection {
  const defaults: MockCollection =
    id === 1
      ? { id, name: 'Marvel Cinematic Universe', type: 'movie', monitored: true, movieCount: 30 }
      : id === 2
        ? { id, name: 'Breaking Bad Collection', type: 'series', monitored: true, seriesCount: 1 }
        : { id, name: `Collection ${id}`, type: 'movie', monitored: true, movieCount: 10 };
  return { ...defaults, ...overrides };
}

export interface MockCustomFormat {
  id: number;
  name: string;
  type: string;
  specifications: unknown[];
}

export function createMockCustomFormat(id: number, overrides?: Partial<MockCustomFormat>): MockCustomFormat {
  const defaults: MockCustomFormat =
    id === 1
      ? { id, name: 'HDR', type: 'quality', specifications: [] }
      : id === 2
        ? { id, name: 'Atmos Audio', type: 'audio', specifications: [] }
        : { id, name: `Custom Format ${id}`, type: 'quality', specifications: [] };
  return { ...defaults, ...overrides };
}

export interface MockImportList {
  id: number;
  name: string;
  enabled: boolean;
  implementation: string;
}

export function createMockImportList(id: number, overrides?: Partial<MockImportList>): MockImportList {
  const defaults: MockImportList =
    id === 1
      ? { id, name: 'TMDB Popular Movies', enabled: true, implementation: 'TMDbImportList' }
      : id === 2
        ? { id, name: 'Trakt Watchlist', enabled: false, implementation: 'TraktImportList' }
        : { id, name: `Import List ${id}`, enabled: true, implementation: 'TMDbImportList' };
  return { ...defaults, ...overrides };
}

export interface MockImportListExclusion {
  id: number;
  tmdbId: number;
  title: string;
  movieYear: number | null;
}

export function createMockImportListExclusion(
  id: number,
  overrides?: Partial<MockImportListExclusion>,
): MockImportListExclusion {
  return {
    id,
    tmdbId: 99999,
    title: 'Excluded Movie',
    movieYear: 2020,
    ...overrides,
  };
}

export interface MockImportListProvider {
  id: string;
  name: string;
  enabled: boolean;
  implementation: string;
}

export function createMockImportListProvider(
  id: string,
  overrides?: Partial<MockImportListProvider>,
): MockImportListProvider {
  const defaults: MockImportListProvider =
    id === 'tmdb'
      ? { id: 'tmdb', name: 'TMDb', enabled: true, implementation: 'TMDbImportList' }
      : id === 'trakt'
        ? { id: 'trakt', name: 'Trakt', enabled: false, implementation: 'TraktImportList' }
        : { id, name: `Provider ${id}`, enabled: true, implementation: 'TMDbImportList' };
  return { ...defaults, ...overrides };
}

export interface MockLogFile {
  filename: string;
  size: number;
  lastModified: string;
  content: string;
}

export function createMockLogFile(filename: string, overrides?: Partial<MockLogFile>): MockLogFile {
  return {
    filename,
    size: filename === 'mediarr.log' ? 102_400 : 51_200,
    lastModified: REFERENCE_DATE.toISOString(),
    content: '[2026-06-12 10:00:00] INFO: System started\n[2026-06-12 10:00:01] INFO: Indexers loaded',
    ...overrides,
  };
}

export interface MockUpdate {
  version: string;
  releaseDate: string;
  installedAt?: string;
  status?: string;
  changelog?: string;
}

export function createMockUpdate(version: string, overrides?: Partial<MockUpdate>): MockUpdate {
  const defaults: Record<string, MockUpdate> = {
    '1.0.0': {
      version: '1.0.0',
      releaseDate: '2026-06-01',
      installedAt: '2026-06-01T00:00:00Z',
      status: 'success',
    },
    '1.1.0': {
      version: '1.1.0',
      releaseDate: '2026-06-10',
      changelog: 'Bug fixes and improvements',
    },
  };
  return { ...(defaults[version] ?? { version, releaseDate: REFERENCE_DATE.toISOString() }), ...overrides };
}

export interface MockDashboardCalendarItem {
  id: number;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string;
  monitored: boolean;
}

export function createMockDashboardCalendarItem(
  id: number,
  overrides?: Partial<MockDashboardCalendarItem>,
): MockDashboardCalendarItem {
  return {
    id,
    seriesId: 1,
    seriesTitle: 'Example Series',
    seasonNumber: 2,
    episodeNumber: id,
    title: `Episode ${id}`,
    airDate: new Date(REFERENCE_DATE.getTime() + 7 * 86_400_000).toISOString(),
    monitored: true,
    ...overrides,
  };
}

export interface MockDashboardDiskSpace {
  path: string;
  freeBytes: number;
  totalBytes: number;
  usedPercent: number;
}

export function createMockDashboardDiskSpace(path: string): MockDashboardDiskSpace {
  return path === '/media'
    ? { path: '/media', freeBytes: 500_000_000_000, totalBytes: 1_000_000_000_000, usedPercent: 50 }
    : { path, freeBytes: 100_000_000_000, totalBytes: 200_000_000_000, usedPercent: 50 };
}

export interface MockCategory {
  id: number;
  name: string;
  description: string | null;
  minSize: number | null;
  maxSize: number | null;
}

export function createMockCategory(id: number, overrides?: Partial<MockCategory>): MockCategory {
  const defaults: MockCategory[] = [
    { id: 1, name: 'Movies (HD)', description: 'High definition movies', minSize: 10_737_418_240, maxSize: 53_687_091_200 },
    { id: 2, name: 'Movies (SD)', description: 'Standard definition movies', minSize: 734_003_200, maxSize: 10_737_418_240 },
    { id: 3, name: 'TV Episodes (HD)', description: 'High definition TV episodes', minSize: 536_870_912, maxSize: 4_294_967_296 },
    { id: 4, name: 'TV Episodes (SD)', description: 'Standard definition TV episodes', minSize: 73_400_320, maxSize: 536_870_912 },
  ];
  return { ...(defaults[id - 1] ?? { id, name: `Category ${id}`, description: null, minSize: null, maxSize: null }), ...overrides };
}

export interface MockProxy {
  id: number;
  name: string;
  type: string;
  hostname: string;
  port: number;
  username: string | null;
  password: string | null;
  enabled: boolean;
}

export function createMockProxy(id: number, overrides?: Partial<MockProxy>): MockProxy {
  return {
    id,
    name: 'Default Proxy',
    type: 'http',
    hostname: 'proxy.example',
    port: 8080,
    username: null,
    password: null,
    enabled: true,
    ...overrides,
  };
}

export interface MockQualityProfile {
  id: number;
  name: string;
  cutoff: number;
  items: unknown[];
  languageProfileId: number | null;
}

export function createMockQualityProfile(id: number, overrides?: Partial<MockQualityProfile>): MockQualityProfile {
  const defaults: MockQualityProfile[] = [
    {
      id: 1,
      name: 'HD-1080p',
      cutoff: 7,
      items: [{ quality: { id: 1, name: 'HDTV-720p', source: 'television', resolution: '720p' }, allowed: true }],
      languageProfileId: null,
    },
    {
      id: 2,
      name: 'UHD-2160p',
      cutoff: 9,
      items: [{ quality: { id: 1, name: 'HDTV-2160p', source: 'television', resolution: '2160p' }, allowed: true }],
      languageProfileId: null,
    },
  ];
  return {
    ...(defaults[id - 1] ?? { id, name: `Profile ${id}`, cutoff: 7, items: [], languageProfileId: null }),
    ...overrides,
  };
}

export interface MockQualityDefinition {
  id: number;
  name: string;
  source: string;
  resolution: string;
  weight: number;
}

export function createMockQualityDefinitions(): MockQualityDefinition[] {
  return [
    { id: 1, name: 'HDTV-720p', source: 'television', resolution: '720p', weight: 1 },
    { id: 2, name: 'WEBDL-720p', source: 'web', resolution: '720p', weight: 2 },
    { id: 3, name: 'Bluray-720p', source: 'bluray', resolution: '720p', weight: 3 },
    { id: 4, name: 'HDTV-1080p', source: 'television', resolution: '1080p', weight: 4 },
    { id: 5, name: 'WEBDL-1080p', source: 'web', resolution: '1080p', weight: 5 },
    { id: 6, name: 'Bluray-1080p', source: 'bluray', resolution: '1080p', weight: 6 },
    { id: 7, name: 'HDTV-2160p', source: 'television', resolution: '2160p', weight: 7 },
    { id: 8, name: 'WEBDL-2160p', source: 'web', resolution: '2160p', weight: 8 },
    { id: 9, name: 'Bluray-2160p', source: 'bluray', resolution: '2160p', weight: 9 },
  ];
}

export interface MockDownloadClientSettings {
  maxActiveDownloads: number;
  maxActiveSeeds: number;
  globalDownloadLimitKbps: number | null;
  globalUploadLimitKbps: number | null;
  incompleteDirectory: string;
  completeDirectory: string;
  seedRatioLimit: number;
  seedTimeLimitMinutes: number;
  seedLimitAction: string;
}

export function createMockDownloadClientSettings(
  overrides?: Partial<MockDownloadClientSettings>,
): MockDownloadClientSettings {
  return {
    maxActiveDownloads: 3,
    maxActiveSeeds: 5,
    globalDownloadLimitKbps: null,
    globalUploadLimitKbps: null,
    incompleteDirectory: '/tmp/incomplete',
    completeDirectory: '/tmp/complete',
    seedRatioLimit: 1.5,
    seedTimeLimitMinutes: 60,
    seedLimitAction: 'pause',
    ...overrides,
  };
}

export interface MockMediaNamingSettings {
  movieRootFolder: string;
  tvRootFolder: string;
  movieNamingPattern: string;
  seriesNamingPattern: string;
}

export function createMockMediaNamingSettings(overrides?: Partial<MockMediaNamingSettings>): MockMediaNamingSettings {
  return {
    movieRootFolder: '/media/movies',
    tvRootFolder: '/media/series',
    movieNamingPattern: '{Movie Title} ({Release Year})',
    seriesNamingPattern: '{Series Title}',
    ...overrides,
  };
}

export interface MockSubtitleProvider {
  id: string;
  name: string;
  enabled: boolean;
  languages: string[];
  implementation: string;
  apiKey?: string;
}

export function createMockSubtitleProvider(id: string, overrides?: Partial<MockSubtitleProvider>): MockSubtitleProvider {
  const defaults: MockSubtitleProvider =
    id === 'opensubtitles'
      ? { id: 'opensubtitles', name: 'OpenSubtitles', enabled: true, languages: ['en', 'fr'], implementation: 'OpenSubtitles' }
      : id === 'addic7ed'
        ? { id: 'addic7ed', name: 'Addic7ed', enabled: false, languages: ['en'], implementation: 'Addic7ed' }
        : { id, name: `Provider ${id}`, enabled: true, languages: ['en'], implementation: id };
  return { ...defaults, ...overrides };
}

export interface MockSubtitleHistoryItem {
  id: number;
  subtitleId: string;
  languageCode: string;
  provider: string;
  movieId: number | null;
  seriesId: number | null;
  seasonNumber: number;
  episodeNumber: number;
  downloadedAt: string;
  status: string;
}

export function createMockSubtitleHistoryItem(
  id: number,
  overrides?: Partial<MockSubtitleHistoryItem>,
): MockSubtitleHistoryItem {
  return {
    id,
    subtitleId: `sub-${id}`,
    languageCode: 'en',
    provider: 'opensubtitles',
    movieId: null,
    seriesId: 1,
    seasonNumber: 1,
    episodeNumber: 1,
    downloadedAt: REFERENCE_DATE.toISOString(),
    status: 'downloaded',
    ...overrides,
  };
}

export interface MockSubtitleBlacklistItem {
  id: number;
  movieId?: number;
  seriesId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  languageCode: string;
  reason: string;
}

export function createMockSubtitleBlacklistMovie(
  id: number,
  overrides?: Partial<MockSubtitleBlacklistItem>,
): MockSubtitleBlacklistItem {
  return { id, movieId: 1, languageCode: 'en', reason: 'Poor quality', ...overrides };
}

export function createMockSubtitleBlacklistSeries(
  id: number,
  overrides?: Partial<MockSubtitleBlacklistItem>,
): MockSubtitleBlacklistItem {
  return { id, seriesId: 1, seasonNumber: 1, episodeNumber: 1, languageCode: 'fr', reason: 'Wrong language', ...overrides };
}
