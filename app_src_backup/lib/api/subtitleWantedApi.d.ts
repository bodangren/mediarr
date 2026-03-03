import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
declare const wantedSeriesEntrySchema: z.ZodObject<{
    seriesId: z.ZodNumber;
    seriesTitle: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    episodeId: z.ZodNumber;
    episodeTitle: z.ZodString;
    missingLanguages: z.ZodArray<z.ZodString, "many">;
    lastSearch: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    episodeTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    episodeId: number;
    seriesId: number;
    seriesTitle: string;
    missingLanguages: string[];
    lastSearch?: string | undefined;
}, {
    episodeTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    episodeId: number;
    seriesId: number;
    seriesTitle: string;
    missingLanguages: string[];
    lastSearch?: string | undefined;
}>;
declare const wantedMovieEntrySchema: z.ZodObject<{
    movieId: z.ZodNumber;
    movieTitle: z.ZodString;
    year: z.ZodOptional<z.ZodNumber>;
    missingLanguages: z.ZodArray<z.ZodString, "many">;
    lastSearch: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    movieId: number;
    movieTitle: string;
    missingLanguages: string[];
    year?: number | undefined;
    lastSearch?: string | undefined;
}, {
    movieId: number;
    movieTitle: string;
    missingLanguages: string[];
    year?: number | undefined;
    lastSearch?: string | undefined;
}>;
declare const wantedCountSchema: z.ZodObject<{
    seriesCount: z.ZodNumber;
    moviesCount: z.ZodNumber;
    totalCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalCount: number;
    seriesCount: number;
    moviesCount: number;
}, {
    totalCount: number;
    seriesCount: number;
    moviesCount: number;
}>;
declare const searchTriggerResultSchema: z.ZodObject<{
    triggered: z.ZodBoolean;
    count: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    triggered: boolean;
    count?: number | undefined;
}, {
    triggered: boolean;
    count?: number | undefined;
}>;
declare const seriesItemSearchResultSchema: z.ZodObject<{
    triggered: z.ZodBoolean;
    seriesId: z.ZodNumber;
    languageCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    seriesId: number;
    languageCode: string;
    triggered: boolean;
}, {
    seriesId: number;
    languageCode: string;
    triggered: boolean;
}>;
declare const movieItemSearchResultSchema: z.ZodObject<{
    triggered: z.ZodBoolean;
    movieId: z.ZodNumber;
    languageCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    movieId: number;
    languageCode: string;
    triggered: boolean;
}, {
    movieId: number;
    languageCode: string;
    triggered: boolean;
}>;
export type WantedSeriesEntry = z.infer<typeof wantedSeriesEntrySchema>;
export type WantedMovieEntry = z.infer<typeof wantedMovieEntrySchema>;
export type WantedCount = z.infer<typeof wantedCountSchema>;
export type SearchTriggerResult = z.infer<typeof searchTriggerResultSchema>;
export type SeriesItemSearchResult = z.infer<typeof seriesItemSearchResultSchema>;
export type MovieItemSearchResult = z.infer<typeof movieItemSearchResultSchema>;
export interface WantedQueryParams {
    page?: number;
    pageSize?: number;
    languageCode?: string;
}
export declare function createSubtitleWantedApi(client: ApiHttpClient): {
    listWantedSeries(params?: WantedQueryParams): Promise<PaginatedResult<WantedSeriesEntry>>;
    listWantedMovies(params?: WantedQueryParams): Promise<PaginatedResult<WantedMovieEntry>>;
    searchAllSeries(): Promise<SearchTriggerResult>;
    searchAllMovies(): Promise<SearchTriggerResult>;
    searchSeriesItem(seriesId: number, languageCode: string): Promise<SeriesItemSearchResult>;
    searchMovieItem(movieId: number, languageCode: string): Promise<MovieItemSearchResult>;
    getWantedCount(): Promise<WantedCount>;
};
export {};
//# sourceMappingURL=subtitleWantedApi.d.ts.map