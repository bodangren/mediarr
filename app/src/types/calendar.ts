export interface CalendarEpisode {
  id: number;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  airDate: string; // ISO date
  airTime?: string; // HH:mm
  status: 'downloaded' | 'missing' | 'airing' | 'unaired';
  hasFile: boolean;
  monitored: boolean;
}

export interface CalendarFilters {
  seriesId?: number;
  tags?: number[];
  status?: ('downloaded' | 'missing' | 'airing' | 'unaired');
}

export interface CalendarListParams {
  start: string;
  end: string;
  seriesId?: number;
  tags?: number[];
  status?: 'downloaded' | 'missing' | 'airing' | 'unaired';
}
