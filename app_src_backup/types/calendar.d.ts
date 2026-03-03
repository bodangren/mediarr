export interface CalendarEpisode {
    id: number;
    seriesId: number;
    seriesTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    episodeTitle: string;
    airDate: string;
    airTime?: string;
    status: 'downloaded' | 'missing' | 'airing' | 'unaired';
    hasFile: boolean;
    monitored: boolean;
}
export interface CalendarMovie {
    id: number;
    movieId: number;
    title: string;
    releaseType: 'cinema' | 'digital' | 'physical';
    releaseDate: string;
    posterUrl?: string;
    status: 'downloaded' | 'monitored' | 'missing' | 'unmonitored';
    hasFile: boolean;
    monitored: boolean;
    certification?: string;
    runtime?: number;
}
export type CalendarEvent = {
    type: 'episode';
    data: CalendarEpisode;
} | {
    type: 'movie';
    data: CalendarMovie;
};
export interface CalendarFilters {
    contentType?: 'all' | 'movies' | 'tv';
    seriesId?: number;
    movieId?: number;
    tags?: number[];
    status?: ('downloaded' | 'missing' | 'airing' | 'unaired' | 'monitored' | 'unmonitored');
    releaseTypes?: ('cinema' | 'digital' | 'physical')[];
}
export interface CalendarListParams {
    start: string;
    end: string;
    contentType?: 'all' | 'movies' | 'tv';
    seriesId?: number;
    movieId?: number;
    tags?: number[];
    status?: 'downloaded' | 'missing' | 'airing' | 'unaired' | 'monitored' | 'unmonitored';
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
//# sourceMappingURL=calendar.d.ts.map