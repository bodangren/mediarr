export type CalendarItemStatus = 'downloaded' | 'missing' | 'airing' | 'unaired';

export interface CalendarItem {
  id: number;
  type: 'episode' | 'movie';
  seriesId?: number;
  movieId?: number;
  title: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  date: string;
  time?: string;
  status: CalendarItemStatus;
  hasFile: boolean;
  monitored: boolean;
}

export interface CalendarListParams {
  start: string;
  end: string;
}

export interface CalendarFilters {
  contentType?: 'all' | 'movies' | 'tv';
  seriesId?: number;
  movieId?: number;
  tags?: number[];
  status?: ('downloaded' | 'missing' | 'airing' | 'unaired' | 'monitored' | 'unmonitored');
  releaseTypes?: ('cinema' | 'digital' | 'physical')[];
}

export interface CalendarOptions {
  showDayNumbers: boolean;
  showWeekNumbers: boolean;
  showMonitored: boolean;
  showUnmonitored: boolean;
  showCinemaReleases: boolean;
  showDigitalReleases: boolean;
  showPhysicalReleases: boolean;
}
