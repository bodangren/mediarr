import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
declare const subtitleHistoryEntrySchema: z.ZodObject<{
    id: z.ZodNumber;
    type: z.ZodUnion<[z.ZodLiteral<"series">, z.ZodLiteral<"movie">]>;
    seriesId: z.ZodOptional<z.ZodNumber>;
    movieId: z.ZodOptional<z.ZodNumber>;
    episodeId: z.ZodOptional<z.ZodNumber>;
    seriesTitle: z.ZodOptional<z.ZodString>;
    movieTitle: z.ZodOptional<z.ZodString>;
    seasonNumber: z.ZodOptional<z.ZodNumber>;
    episodeNumber: z.ZodOptional<z.ZodNumber>;
    episodeTitle: z.ZodOptional<z.ZodString>;
    languageCode: z.ZodString;
    provider: z.ZodString;
    score: z.ZodNumber;
    action: z.ZodUnion<[z.ZodLiteral<"download">, z.ZodLiteral<"upgrade">, z.ZodLiteral<"manual">, z.ZodLiteral<"upload">]>;
    timestamp: z.ZodString;
    filePath: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    type: z.ZodUnion<[z.ZodLiteral<"series">, z.ZodLiteral<"movie">]>;
    seriesId: z.ZodOptional<z.ZodNumber>;
    movieId: z.ZodOptional<z.ZodNumber>;
    episodeId: z.ZodOptional<z.ZodNumber>;
    seriesTitle: z.ZodOptional<z.ZodString>;
    movieTitle: z.ZodOptional<z.ZodString>;
    seasonNumber: z.ZodOptional<z.ZodNumber>;
    episodeNumber: z.ZodOptional<z.ZodNumber>;
    episodeTitle: z.ZodOptional<z.ZodString>;
    languageCode: z.ZodString;
    provider: z.ZodString;
    score: z.ZodNumber;
    action: z.ZodUnion<[z.ZodLiteral<"download">, z.ZodLiteral<"upgrade">, z.ZodLiteral<"manual">, z.ZodLiteral<"upload">]>;
    timestamp: z.ZodString;
    filePath: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    type: z.ZodUnion<[z.ZodLiteral<"series">, z.ZodLiteral<"movie">]>;
    seriesId: z.ZodOptional<z.ZodNumber>;
    movieId: z.ZodOptional<z.ZodNumber>;
    episodeId: z.ZodOptional<z.ZodNumber>;
    seriesTitle: z.ZodOptional<z.ZodString>;
    movieTitle: z.ZodOptional<z.ZodString>;
    seasonNumber: z.ZodOptional<z.ZodNumber>;
    episodeNumber: z.ZodOptional<z.ZodNumber>;
    episodeTitle: z.ZodOptional<z.ZodString>;
    languageCode: z.ZodString;
    provider: z.ZodString;
    score: z.ZodNumber;
    action: z.ZodUnion<[z.ZodLiteral<"download">, z.ZodLiteral<"upgrade">, z.ZodLiteral<"manual">, z.ZodLiteral<"upload">]>;
    timestamp: z.ZodString;
    filePath: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type SubtitleHistoryEntry = z.infer<typeof subtitleHistoryEntrySchema>;
export interface HistoryQueryParams {
    page?: number;
    pageSize?: number;
    type?: 'series' | 'movies';
    provider?: string;
    languageCode?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
}
declare const historyStatsSchema: z.ZodObject<{
    period: z.ZodString;
    downloads: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        series: z.ZodNumber;
        movies: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        series: number;
        movies: number;
        date: string;
    }, {
        series: number;
        movies: number;
        date: string;
    }>, "many">;
    byProvider: z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
        provider: string;
    }, {
        count: number;
        provider: string;
    }>, "many">;
    byLanguage: z.ZodArray<z.ZodObject<{
        language: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
        language: string;
    }, {
        count: number;
        language: string;
    }>, "many">;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    period: z.ZodString;
    downloads: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        series: z.ZodNumber;
        movies: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        series: number;
        movies: number;
        date: string;
    }, {
        series: number;
        movies: number;
        date: string;
    }>, "many">;
    byProvider: z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
        provider: string;
    }, {
        count: number;
        provider: string;
    }>, "many">;
    byLanguage: z.ZodArray<z.ZodObject<{
        language: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
        language: string;
    }, {
        count: number;
        language: string;
    }>, "many">;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    period: z.ZodString;
    downloads: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        series: z.ZodNumber;
        movies: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        series: number;
        movies: number;
        date: string;
    }, {
        series: number;
        movies: number;
        date: string;
    }>, "many">;
    byProvider: z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
        provider: string;
    }, {
        count: number;
        provider: string;
    }>, "many">;
    byLanguage: z.ZodArray<z.ZodObject<{
        language: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
        language: string;
    }, {
        count: number;
        language: string;
    }>, "many">;
}, z.ZodTypeAny, "passthrough">>;
export type HistoryStats = z.infer<typeof historyStatsSchema>;
export interface StatsQueryParams {
    period: 'day' | 'week' | 'month' | 'year';
    provider?: string;
    languageCode?: string;
    action?: string;
}
export declare function createSubtitleHistoryApi(client: ApiHttpClient): {
    /**
     * List subtitle download history with optional filtering
     */
    listHistory(params?: HistoryQueryParams): Promise<PaginatedResult<SubtitleHistoryEntry>>;
    /**
     * Get aggregated statistics for subtitle downloads
     */
    getHistoryStats(params: StatsQueryParams): Promise<HistoryStats>;
    /**
     * Clear subtitle history, optionally filtered by type
     */
    clearHistory(type?: "series" | "movies"): Promise<{
        deletedCount: number;
    }>;
};
export {};
//# sourceMappingURL=subtitleHistoryApi.d.ts.map