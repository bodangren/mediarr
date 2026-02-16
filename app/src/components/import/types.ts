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

// Re-export mock data for backward compatibility during development
// TODO: Remove these exports when backend API is implemented
export { mockDetectedSeries, mockSearchResults } from './mocks';
