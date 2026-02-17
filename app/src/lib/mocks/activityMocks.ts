/**
 * Mock data for Activity Views (Queue, History, Blocklist)
 * Supports both TV series and Movies
 */

// Queue mock data
export interface MockQueueItem {
  id: string;
  movieId?: number;
  movieTitle?: string;
  moviePosterUrl?: string;
  releaseTitle: string;
  status: 'queued' | 'downloading' | 'importing' | 'completed' | 'failed' | 'paused';
  progress: number;
  size: number;
  downloaded: number;
  speed?: number; // bytes/sec
  timeRemaining?: number; // seconds
  quality: string;
  language?: string;
  protocol: 'torrent' | 'usenet';
  indexer?: string;
  episodeId?: number; // For TV (keep existing)
}

export const mockQueueItems: MockQueueItem[] = [
  {
    id: 'torrent-1',
    movieId: 101,
    movieTitle: 'Dune: Part Two',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    releaseTitle: 'Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.Atmos.DV.MP4.x265',
    status: 'downloading',
    progress: 67.5,
    size: 15_000_000_000,
    downloaded: 10_125_000_000,
    speed: 25_000_000,
    timeRemaining: 1800,
    quality: 'WEBDL-2160p',
    language: 'English',
    protocol: 'torrent',
    indexer: '1337x',
  },
  {
    id: 'torrent-2',
    movieId: 102,
    movieTitle: 'Oppenheimer',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    releaseTitle: 'Oppenheimer.2023.1080p.BluRay.REMUX.AVC.DTS-HD.MA.5.1',
    status: 'queued',
    progress: 0,
    size: 50_000_000_000,
    downloaded: 0,
    quality: 'Bluray-1080p Remux',
    language: 'English',
    protocol: 'usenet',
    indexer: 'NZBgeek',
  },
  {
    id: 'torrent-3',
    movieId: 103,
    movieTitle: 'The Batman',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/74xTEgt7R36Fber9Tav5PXS5qG4.jpg',
    releaseTitle: 'The.Batman.2022.4K.UHD.BluRay.2160p.HEVC.Atmos.TrueHD.7.1',
    status: 'importing',
    progress: 100,
    size: 70_000_000_000,
    downloaded: 70_000_000_000,
    quality: 'Bluray-2160p',
    language: 'English',
    protocol: 'torrent',
    indexer: 'RARBG',
  },
  {
    id: 'torrent-4',
    movieId: 104,
    movieTitle: 'Everything Everywhere All at Once',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    releaseTitle: 'Everything.Everywhere.All.at.Once.2022.1080p.WEB-DL.H264.AC3-EVO',
    status: 'failed',
    progress: 45,
    size: 5_000_000_000,
    downloaded: 2_250_000_000,
    quality: 'WEBDL-1080p',
    language: 'English',
    protocol: 'torrent',
    indexer: 'LimeTorrents',
  },
  {
    id: 'torrent-5',
    movieId: 105,
    movieTitle: 'Parasite',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    releaseTitle: 'Parasite.2019.1080p.BluRay.x264-SPARKS',
    status: 'completed',
    progress: 100,
    size: 4_500_000_000,
    downloaded: 4_500_000_000,
    quality: 'Bluray-1080p',
    language: 'Korean',
    protocol: 'torrent',
    indexer: 'YTS',
  },
  {
    id: 'torrent-6',
    movieId: 106,
    movieTitle: 'Interstellar',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    releaseTitle: 'Interstellar.2014.4K.UHD.BluRay.2160p.HEVC.TrueHD.7.1',
    status: 'paused',
    progress: 23.5,
    size: 55_000_000_000,
    downloaded: 12_925_000_000,
    speed: 0,
    quality: 'Bluray-2160p',
    language: 'English',
    protocol: 'torrent',
    indexer: '1337x',
  },
  // TV episode in queue (existing)
  {
    id: 'torrent-7',
    episodeId: 1001,
    releaseTitle: 'Breaking.Bad.S05E14.720p.HDTV.X264-DIMENSION',
    status: 'downloading',
    progress: 85,
    size: 1_200_000_000,
    downloaded: 1_020_000_000,
    speed: 5_000_000,
    timeRemaining: 60,
    quality: 'HDTV-720p',
    language: 'English',
    protocol: 'torrent',
    indexer: 'EZTV',
  },
];

// History mock data
export interface MockHistoryItem {
  id: number;
  eventType: string;
  sourceModule?: string;
  entityRef?: string;
  summary: string;
  success?: boolean;
  details?: unknown;
  occurredAt: string;
  // Movie-specific
  movieId?: number;
  movieTitle?: string;
  moviePosterUrl?: string;
  quality?: string;
  indexer?: string;
  releaseTitle?: string;
}

export const mockHistoryItems: MockHistoryItem[] = [
  {
    id: 1,
    eventType: 'MOVIE_IMPORTED',
    sourceModule: 'radarr',
    entityRef: 'movie:101',
    summary: 'Dune: Part Two imported from Dune.Part.Two.2024.2160p.WEB-DL',
    movieId: 101,
    movieTitle: 'Dune: Part Two',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    quality: 'WEBDL-2160p',
    indexer: '1337x',
    releaseTitle: 'Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.Atmos.DV.MP4.x265',
    success: true,
    details: {
      downloadClient: 'Transmission',
      downloadId: 'torrent-1',
      filePath: '/Movies/Dune Part Two (2024)/Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.Atmos.DV.MP4.x265.mkv',
    },
    occurredAt: '2026-02-16T10:30:00.000Z',
  },
  {
    id: 2,
    eventType: 'MOVIE_GRABBED',
    sourceModule: 'radarr',
    entityRef: 'movie:102',
    summary: 'Grabbed: Oppenheimer.2023.1080p.BluRay.REMUX',
    movieId: 102,
    movieTitle: 'Oppenheimer',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    quality: 'Bluray-1080p Remux',
    indexer: 'NZBgeek',
    releaseTitle: 'Oppenheimer.2023.1080p.BluRay.REMUX.AVC.DTS-HD.MA.5.1',
    success: true,
    details: {
      indexer: 'NZBgeek',
      releaseGroup: '-none-',
      age: '2 hours',
      size: '50 GB',
    },
    occurredAt: '2026-02-16T09:45:00.000Z',
  },
  {
    id: 3,
    eventType: 'DOWNLOAD_FAILED',
    sourceModule: 'radarr',
    entityRef: 'movie:104',
    summary: 'Download failed: Everything Everywhere All at Once',
    movieId: 104,
    movieTitle: 'Everything Everywhere All at Once',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    quality: 'WEBDL-1080p',
    indexer: 'LimeTorrents',
    releaseTitle: 'Everything.Everywhere.All.at.Once.2022.1080p.WEB-DL.H264.AC3-EVO',
    success: false,
    details: {
      downloadClient: 'Transmission',
      downloadId: 'torrent-4',
      errorMessage: 'Connection timed out',
      trackerStatus: 'Not working',
    },
    occurredAt: '2026-02-16T08:15:00.000Z',
  },
  {
    id: 4,
    eventType: 'MOVIE_FILE_DELETED',
    sourceModule: 'radarr',
    entityRef: 'movie:103',
    summary: 'Movie file deleted: The Batman',
    movieId: 103,
    movieTitle: 'The Batman',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/74xTEgt7R36Fber9Tav5PXS5qG4.jpg',
    quality: 'Bluray-2160p',
    success: true,
    details: {
      filePath: '/Movies/The Batman (2022)/The.Batman.2022.4K.UHD.BluRay.2160p.HEVC.Atmos.TrueHD.7.1.mkv',
      reason: 'Manual deletion',
      deletedBy: 'admin',
    },
    occurredAt: '2026-02-16T07:00:00.000Z',
  },
  {
    id: 5,
    eventType: 'MOVIE_RENAMED',
    sourceModule: 'radarr',
    entityRef: 'movie:105',
    summary: 'Parasite renamed to standard format',
    movieId: 105,
    movieTitle: 'Parasite',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    quality: 'Bluray-1080p',
    success: true,
    details: {
      oldPath: '/Movies/Parasite (2019) [1080p]/Parasite.2019.1080p.BluRay.x264-SPARKS.mkv',
      newPath: '/Movies/Parasite (2019)/Parasite (2019) - [1080p].mkv',
    },
    occurredAt: '2026-02-16T06:30:00.000Z',
  },
  // TV events (existing)
  {
    id: 6,
    eventType: 'RELEASE_GRABBED',
    sourceModule: 'prowlarr',
    entityRef: 'series:1',
    summary: 'Grabbed release from Indexer A',
    success: true,
    occurredAt: '2026-02-15T09:00:00.000Z',
  },
  {
    id: 7,
    eventType: 'INDEXER_QUERY',
    sourceModule: 'prowlarr',
    entityRef: 'movie:42',
    summary: 'Initial indexer query executed',
    details: {
      query: 'Dune Part Two',
      indexer: 'Indexer A',
      category: 2000,
    },
    success: true,
    occurredAt: '2026-02-15T10:00:00.000Z',
  },
  {
    id: 8,
    eventType: 'INDEXER_AUTH',
    sourceModule: 'prowlarr',
    entityRef: 'indexer:7',
    summary: 'Authentication failed for private indexer',
    details: {
      reason: 'Invalid API key',
    },
    success: false,
    occurredAt: '2026-02-15T07:30:00.000Z',
  },
];

// Blocklist mock data
export interface MockBlocklistItem {
  id: number;
  // For TV
  seriesId?: number;
  seriesTitle?: string;
  episodeId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  // For Movies
  movieId?: number;
  movieTitle?: string;
  moviePosterUrl?: string;
  year?: number;
  // Common
  releaseTitle: string;
  quality?: string;
  dateBlocked: string;
  reason: string;
  indexer?: string;
  size?: number;
}

export const mockBlocklistItems: MockBlocklistItem[] = [
  {
    id: 1,
    movieId: 201,
    movieTitle: 'Avatar: The Way of Water',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
    year: 2022,
    releaseTitle: 'Avatar.The.Way.of.Water.2022.480p.HDTV.XviD',
    quality: 'HDTV-480p',
    dateBlocked: '2026-02-15T14:30:00.000Z',
    reason: 'Quality check failed: expected minimum quality of 720p',
    indexer: 'Indexer A',
    size: 1_500_000_000,
  },
  {
    id: 2,
    movieId: 202,
    movieTitle: 'Top Gun: Maverick',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/62HCnUTziyWcpDaBO2i1DX17lj82.jpg',
    year: 2022,
    releaseTitle: 'Top.Gun.Maverick.2022.720p.HDRip.X264.AC3',
    quality: 'WEBRip-720p',
    dateBlocked: '2026-02-15T12:00:00.000Z',
    reason: 'Manual block by user - wrong release',
    indexer: 'Indexer B',
    size: 3_200_000_000,
  },
  {
    id: 3,
    movieId: 203,
    movieTitle: 'Spider-Man: No Way Home',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    year: 2021,
    releaseTitle: 'Spider-Man.No.Way.Home.2021.CAM',
    quality: 'CAM',
    dateBlocked: '2026-02-14T16:45:00.000Z',
    reason: 'Quality check failed: CAM quality not allowed',
    indexer: 'Indexer C',
    size: 1_800_000_000,
  },
  {
    id: 4,
    movieId: 204,
    movieTitle: 'Barbie',
    moviePosterUrl: 'https://image.tmdb.org/t/p/w200/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
    year: 2023,
    releaseTitle: 'Barbie.2023.1080p.WEB-DL.H264.EVO',
    quality: 'WEBDL-1080p',
    dateBlocked: '2026-02-14T10:20:00.000Z',
    reason: 'Language check failed: expected English, found French',
    indexer: 'Indexer D',
    size: 4_000_000_000,
  },
  // TV episodes in blocklist (existing)
  {
    id: 5,
    seriesId: 100,
    seriesTitle: 'Test Series',
    episodeId: 1000,
    seasonNumber: 1,
    episodeNumber: 1,
    releaseTitle: 'Test.Series.S01E01.1080p.WEB-DL',
    quality: 'HDTV-1080p',
    dateBlocked: '2026-02-15T10:00:00.000Z',
    reason: 'Quality check failed: expected HDTV-720p',
    indexer: 'TestIndexer',
    size: 1_288_490_188,
  },
  {
    id: 6,
    seriesId: 101,
    seriesTitle: 'Another Series',
    episodeId: 1001,
    seasonNumber: 2,
    episodeNumber: 5,
    releaseTitle: 'Another.Series.S02E05.720p.HDTV',
    quality: 'HDTV-720p',
    dateBlocked: '2026-02-14T15:30:00.000Z',
    reason: 'Manual block by user',
    indexer: 'AnotherIndexer',
    size: 536_870_912,
  },
];
