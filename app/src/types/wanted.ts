export interface MissingEpisode {
  id: number;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  airDate: string; // ISO date string
  status: 'missing' | 'unaired';
  monitored: boolean;
}

export interface CutoffUnmetEpisode {
  id: number;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  currentQuality: string;
  cutoffQuality: string;
  airDate: string; // ISO date string
}

export interface WantedTab {
  type: 'missing' | 'cutoffUnmet';
}

export interface MissingEpisodesQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'airDate' | 'seriesTitle' | 'status';
  sortDir?: 'asc' | 'desc';
  seriesId?: number;
  includeUnaired?: boolean;
}

export interface CutoffUnmetEpisodesQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'airDate' | 'seriesTitle' | 'currentQuality';
  sortDir?: 'asc' | 'desc';
  seriesId?: number;
}
