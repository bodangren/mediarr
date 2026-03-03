import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import type { MissingEpisodesQuery, CutoffUnmetEpisodesQuery } from '../../types/wanted';
declare const seriesItemSchema: z.ZodObject<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
    monitored: z.ZodOptional<z.ZodBoolean>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
    monitored: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
    monitored: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">>;
declare const movieItemSchema: z.ZodObject<{
    id: z.ZodNumber;
    title: z.ZodString;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    year: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
    monitored: z.ZodOptional<z.ZodBoolean>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    title: z.ZodString;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    year: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
    monitored: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    title: z.ZodString;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    year: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
    monitored: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">>;
declare const wantedItemSchema: z.ZodObject<{
    type: z.ZodUnion<[z.ZodLiteral<"movie">, z.ZodLiteral<"episode">]>;
    id: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    type: z.ZodUnion<[z.ZodLiteral<"movie">, z.ZodLiteral<"episode">]>;
    id: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    type: z.ZodUnion<[z.ZodLiteral<"movie">, z.ZodLiteral<"episode">]>;
    id: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
declare const missingEpisodeSchema: z.ZodObject<{
    id: z.ZodNumber;
    seriesId: z.ZodNumber;
    seriesTitle: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    episodeTitle: z.ZodString;
    airDate: z.ZodString;
    status: z.ZodUnion<[z.ZodLiteral<"missing">, z.ZodLiteral<"unaired">]>;
    monitored: z.ZodBoolean;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    seriesId: z.ZodNumber;
    seriesTitle: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    episodeTitle: z.ZodString;
    airDate: z.ZodString;
    status: z.ZodUnion<[z.ZodLiteral<"missing">, z.ZodLiteral<"unaired">]>;
    monitored: z.ZodBoolean;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    seriesId: z.ZodNumber;
    seriesTitle: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    episodeTitle: z.ZodString;
    airDate: z.ZodString;
    status: z.ZodUnion<[z.ZodLiteral<"missing">, z.ZodLiteral<"unaired">]>;
    monitored: z.ZodBoolean;
}, z.ZodTypeAny, "passthrough">>;
declare const cutoffUnmetEpisodeSchema: z.ZodObject<{
    id: z.ZodNumber;
    seriesId: z.ZodNumber;
    seriesTitle: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    episodeTitle: z.ZodString;
    currentQuality: z.ZodString;
    cutoffQuality: z.ZodString;
    airDate: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    seriesId: z.ZodNumber;
    seriesTitle: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    episodeTitle: z.ZodString;
    currentQuality: z.ZodString;
    cutoffQuality: z.ZodString;
    airDate: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    seriesId: z.ZodNumber;
    seriesTitle: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    episodeTitle: z.ZodString;
    currentQuality: z.ZodString;
    cutoffQuality: z.ZodString;
    airDate: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
declare const metadataResultSchema: z.ZodObject<{
    mediaType: z.ZodUnion<[z.ZodLiteral<"TV">, z.ZodLiteral<"MOVIE">]>;
    title: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    mediaType: z.ZodUnion<[z.ZodLiteral<"TV">, z.ZodLiteral<"MOVIE">]>;
    title: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    mediaType: z.ZodUnion<[z.ZodLiteral<"TV">, z.ZodLiteral<"MOVIE">]>;
    title: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
declare const createdMediaSchema: z.ZodObject<{
    id: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type SeriesListItem = z.infer<typeof seriesItemSchema>;
export type MovieListItem = z.infer<typeof movieItemSchema>;
export type WantedListItem = z.infer<typeof wantedItemSchema>;
export type MissingEpisodeItem = z.infer<typeof missingEpisodeSchema>;
export type CutoffUnmetEpisodeItem = z.infer<typeof cutoffUnmetEpisodeSchema>;
export type MetadataSearchResult = z.infer<typeof metadataResultSchema>;
export type CreatedMedia = z.infer<typeof createdMediaSchema>;
export interface ListQuery {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    status?: string;
    monitored?: boolean;
    search?: string;
    filterId?: number;
    customFilter?: string;
    jump?: string;
}
export interface WantedQuery {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    type?: 'movie' | 'episode';
}
export interface AddMediaInput {
    mediaType: 'TV' | 'MOVIE';
    qualityProfileId?: number;
    monitored?: boolean;
    searchNow?: boolean;
    tmdbId?: number;
    tvdbId?: number;
    imdbId?: string;
    title?: string;
    year?: number;
    status?: string;
    overview?: string;
    network?: string;
    rootFolder?: string;
    monitor?: 'all' | 'future' | 'missing' | 'existing' | 'pilot' | 'firstSeason' | 'none';
    seriesType?: 'standard' | 'anime' | 'daily';
    seasonFolder?: boolean;
}
export type MonitoringType = 'all' | 'none' | 'firstSeason' | 'lastSeason' | 'latestSeason' | 'pilotOnly' | 'monitored' | 'existing';
export interface MonitoringResult {
    updatedEpisodes: number;
    totalEpisodes: number;
    seriesId: number;
}
export interface BulkMonitoringResult {
    results: MonitoringResult[];
}
export declare function createMediaApi(client: ApiHttpClient): {
    listSeries(query?: ListQuery): Promise<PaginatedResult<SeriesListItem>>;
    getSeries(id: number): Promise<SeriesListItem>;
    setSeriesMonitored(id: number, monitored: boolean): Promise<SeriesListItem>;
    setEpisodeMonitored(id: number, monitored: boolean): Promise<{
        id: number;
        monitored: boolean;
    }>;
    deleteSeries(id: number, deleteFiles?: boolean): Promise<{
        deleted: boolean;
        id: number;
    }>;
    listMovies(query?: ListQuery): Promise<PaginatedResult<MovieListItem>>;
    getMovie(id: number): Promise<MovieListItem>;
    setMovieMonitored(id: number, monitored: boolean): Promise<MovieListItem>;
    deleteMovie(id: number, deleteFiles?: boolean): Promise<{
        deleted: boolean;
        id: number;
    }>;
    listWanted(query?: WantedQuery): Promise<PaginatedResult<WantedListItem>>;
    listMissingEpisodes(query?: MissingEpisodesQuery): Promise<PaginatedResult<MissingEpisodeItem>>;
    listCutoffUnmetEpisodes(query?: CutoffUnmetEpisodesQuery): Promise<PaginatedResult<CutoffUnmetEpisodeItem>>;
    searchMetadata(input: {
        term: string;
        mediaType: "TV" | "MOVIE";
    }): Promise<MetadataSearchResult[]>;
    addMedia(input: AddMediaInput): Promise<CreatedMedia>;
    applySeriesMonitoring(seriesId: number, monitoringType: MonitoringType): Promise<MonitoringResult>;
    applyBulkSeriesMonitoring(seriesIds: number[], monitoringType: MonitoringType): Promise<BulkMonitoringResult>;
    setSeasonMonitoring(seriesId: number, seasonNumber: number, monitored: boolean): Promise<{
        updatedEpisodes: number;
    }>;
};
export {};
//# sourceMappingURL=mediaApi.d.ts.map