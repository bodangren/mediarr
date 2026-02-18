// Types for the Import Series feature

export interface DetectedSeries {
  id: number;
  folderName: string;
  path: string;
  fileCount: number;
  matchedSeriesId: number | null;
  matchedSeriesTitle?: string;
  matchedSeriesYear?: number;
  status: 'matched' | 'unmatched' | 'pending';
}

export interface ImportConfig {
  qualityProfileId: number;
  monitored: boolean;
  monitorNewItems: 'all' | 'none' | 'future';
  rootFolder: string;
  seriesType: 'standard' | 'anime' | 'daily';
  seasonFolder: boolean;
}

export interface SeriesSearchResult {
  id: number;
  title: string;
  year?: number;
  overview?: string;
  network?: string;
  status?: string;
  tvdbId?: number;
  tmdbId?: number;
  imdbId?: string;
  images?: Array<{ coverType: string; remoteUrl: string }>;
}

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'complete' | 'error';
  currentPath?: string;
  scannedFolders: number;
  totalFolders?: number;
  errorMessage?: string;
}

// Mock data for development/fallback
export const mockSearchResults: SeriesSearchResult[] = [
  {
    id: 1,
    title: 'Breaking Bad',
    year: 2008,
    network: 'AMC',
    status: 'ended',
    overview: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.',
  },
  {
    id: 2,
    title: 'Game of Thrones',
    year: 2011,
    network: 'HBO',
    status: 'ended',
    overview: 'Nine noble families fight for control over the lands of Westeros.',
  },
  {
    id: 3,
    title: 'The Office',
    year: 2005,
    network: 'NBC',
    status: 'ended',
    overview: 'A mockumentary on a group of typical office workers.',
  },
  {
    id: 4,
    title: 'Stranger Things',
    year: 2016,
    network: 'Netflix',
    status: 'continuing',
    overview: 'When a young boy disappears, his mother, a police chief, and his friends must confront terrifying supernatural forces.',
  },
  {
    id: 5,
    title: 'The Mandalorian',
    year: 2019,
    network: 'Disney+',
    status: 'continuing',
    overview: 'The travels of a lone bounty hunter in the outer reaches of the galaxy.',
  },
];