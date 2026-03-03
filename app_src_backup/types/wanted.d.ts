export interface MissingEpisode {
    id: number;
    seriesId: number;
    seriesTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    episodeTitle: string;
    airDate: string;
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
    airDate: string;
}
export interface MissingMovie {
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
export interface CutoffUnmetMovie {
    id: number;
    movieId: number;
    title: string;
    year: number;
    posterUrl?: string;
    monitored: boolean;
    currentQuality: string;
    cutoffQuality: string;
    qualityProfileId: number;
    qualityProfileName?: string;
    fileId: number;
    filePath: string;
    fileSize: number;
}
export type WantedTab = 'missing' | 'cutoffUnmet';
export type ContentType = 'tv' | 'movies';
export type WantedItem = {
    type: 'episode';
    data: MissingEpisode | CutoffUnmetEpisode;
} | {
    type: 'movie';
    data: MissingMovie | CutoffUnmetMovie;
};
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
export interface MissingMoviesQuery {
    page?: number;
    pageSize?: number;
    sortBy?: 'cinemaDate' | 'digitalRelease' | 'title';
    sortDir?: 'asc' | 'desc';
    monitored?: boolean;
}
export interface CutoffUnmetMoviesQuery {
    page?: number;
    pageSize?: number;
    sortBy?: 'qualityGap' | 'title' | 'fileSize';
    sortDir?: 'asc' | 'desc';
}
//# sourceMappingURL=wanted.d.ts.map