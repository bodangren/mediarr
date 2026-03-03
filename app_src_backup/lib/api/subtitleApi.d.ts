import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const subtitleVariantSchema: z.ZodObject<{
    variantId: z.ZodNumber;
    path: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    variantId: z.ZodNumber;
    path: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    variantId: z.ZodNumber;
    path: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
declare const manualSearchCandidateSchema: z.ZodObject<{
    languageCode: z.ZodString;
    isForced: z.ZodBoolean;
    isHi: z.ZodBoolean;
    provider: z.ZodString;
    score: z.ZodNumber;
    extension: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: string;
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
    score: number;
    extension?: string | undefined;
}, {
    provider: string;
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
    score: number;
    extension?: string | undefined;
}>;
declare const manualDownloadSchema: z.ZodObject<{
    storedPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    storedPath: string;
}, {
    storedPath: string;
}>;
declare const subtitleTrackSchema: z.ZodObject<{
    languageCode: z.ZodString;
    isForced: z.ZodBoolean;
    isHi: z.ZodBoolean;
    path: z.ZodString;
    provider: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
    provider: string;
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
}, {
    path: string;
    provider: string;
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
}>;
declare const episodeSubtitleSchema: z.ZodObject<{
    episodeId: z.ZodNumber;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    subtitleTracks: z.ZodArray<z.ZodObject<{
        languageCode: z.ZodString;
        isForced: z.ZodBoolean;
        isHi: z.ZodBoolean;
        path: z.ZodString;
        provider: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        provider: string;
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
    }, {
        path: string;
        provider: string;
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
    }>, "many">;
    missingSubtitles: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    seasonNumber: number;
    episodeNumber: number;
    episodeId: number;
    subtitleTracks: {
        path: string;
        provider: string;
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
    }[];
    missingSubtitles: string[];
}, {
    seasonNumber: number;
    episodeNumber: number;
    episodeId: number;
    subtitleTracks: {
        path: string;
        provider: string;
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
    }[];
    missingSubtitles: string[];
}>;
declare const seriesSubtitleVariantSchema: z.ZodObject<{
    seriesId: z.ZodNumber;
    seasonNumber: z.ZodNumber;
    episodes: z.ZodArray<z.ZodObject<{
        episodeId: z.ZodNumber;
        seasonNumber: z.ZodNumber;
        episodeNumber: z.ZodNumber;
        subtitleTracks: z.ZodArray<z.ZodObject<{
            languageCode: z.ZodString;
            isForced: z.ZodBoolean;
            isHi: z.ZodBoolean;
            path: z.ZodString;
            provider: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: string;
            provider: string;
            languageCode: string;
            isForced: boolean;
            isHi: boolean;
        }, {
            path: string;
            provider: string;
            languageCode: string;
            isForced: boolean;
            isHi: boolean;
        }>, "many">;
        missingSubtitles: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        seasonNumber: number;
        episodeNumber: number;
        episodeId: number;
        subtitleTracks: {
            path: string;
            provider: string;
            languageCode: string;
            isForced: boolean;
            isHi: boolean;
        }[];
        missingSubtitles: string[];
    }, {
        seasonNumber: number;
        episodeNumber: number;
        episodeId: number;
        subtitleTracks: {
            path: string;
            provider: string;
            languageCode: string;
            isForced: boolean;
            isHi: boolean;
        }[];
        missingSubtitles: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    seasonNumber: number;
    seriesId: number;
    episodes: {
        seasonNumber: number;
        episodeNumber: number;
        episodeId: number;
        subtitleTracks: {
            path: string;
            provider: string;
            languageCode: string;
            isForced: boolean;
            isHi: boolean;
        }[];
        missingSubtitles: string[];
    }[];
}, {
    seasonNumber: number;
    seriesId: number;
    episodes: {
        seasonNumber: number;
        episodeNumber: number;
        episodeId: number;
        subtitleTracks: {
            path: string;
            provider: string;
            languageCode: string;
            isForced: boolean;
            isHi: boolean;
        }[];
        missingSubtitles: string[];
    }[];
}>;
declare const seriesSyncResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    episodesUpdated: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
    episodesUpdated: number;
}, {
    message: string;
    success: boolean;
    episodesUpdated: number;
}>;
declare const diskScanResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    subtitlesFound: z.ZodNumber;
    newSubtitles: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
    subtitlesFound: number;
    newSubtitles: number;
}, {
    message: string;
    success: boolean;
    subtitlesFound: number;
    newSubtitles: number;
}>;
declare const subtitleSearchResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    episodesSearched: z.ZodNumber;
    subtitlesDownloaded: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
    episodesSearched: number;
    subtitlesDownloaded: number;
}, {
    message: string;
    success: boolean;
    episodesSearched: number;
    subtitlesDownloaded: number;
}>;
declare const bulkUpdateMoviesSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    updatedCount: z.ZodNumber;
    failedCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
    updatedCount: number;
    failedCount: number;
}, {
    message: string;
    success: boolean;
    updatedCount: number;
    failedCount: number;
}>;
declare const subtitleUploadRecordSchema: z.ZodObject<{
    id: z.ZodNumber;
    mediaId: z.ZodNumber;
    mediaType: z.ZodEnum<["movie", "episode"]>;
    filePath: z.ZodString;
    language: z.ZodString;
    forced: z.ZodBoolean;
    hearingImpaired: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    mediaType: "episode" | "movie";
    id: number;
    language: string;
    forced: boolean;
    hearingImpaired: boolean;
    mediaId: number;
    filePath: string;
}, {
    mediaType: "episode" | "movie";
    id: number;
    language: string;
    forced: boolean;
    hearingImpaired: boolean;
    mediaId: number;
    filePath: string;
}>;
export type SubtitleVariantInventory = z.infer<typeof subtitleVariantSchema>;
export type ManualSearchCandidate = z.infer<typeof manualSearchCandidateSchema>;
export type BulkUpdateMoviesResult = z.infer<typeof bulkUpdateMoviesSchema>;
export type SubtitleTrack = z.infer<typeof subtitleTrackSchema>;
export type EpisodeSubtitle = z.infer<typeof episodeSubtitleSchema>;
export type SeriesSubtitleVariant = z.infer<typeof seriesSubtitleVariantSchema>;
export type SeriesSyncResult = z.infer<typeof seriesSyncResultSchema>;
export type DiskScanResult = z.infer<typeof diskScanResultSchema>;
export type SubtitleSearchResult = z.infer<typeof subtitleSearchResultSchema>;
export type SubtitleUploadRecord = z.infer<typeof subtitleUploadRecordSchema>;
export interface ManualSearchInput {
    movieId?: number;
    episodeId?: number;
    variantId?: number;
}
export interface ManualDownloadInput extends ManualSearchInput {
    candidate: ManualSearchCandidate;
}
export interface BulkUpdateMoviesInput {
    movieIds: number[];
    languageProfileId: number;
}
export interface SubtitleUploadInput {
    file: File;
    mediaId: number;
    mediaType: 'movie' | 'episode';
    language: string;
    forced: boolean;
    hearingImpaired: boolean;
    onUploadProgress?: (progress: number) => void;
}
export declare function createSubtitleApi(client: ApiHttpClient): {
    listMovieVariants(movieId: number): Promise<SubtitleVariantInventory[]>;
    listEpisodeVariants(episodeId: number): Promise<SubtitleVariantInventory[]>;
    manualSearch(input: ManualSearchInput): Promise<ManualSearchCandidate[]>;
    manualDownload(input: ManualDownloadInput): Promise<z.infer<typeof manualDownloadSchema>>;
    listSeriesVariants(seriesId: number): Promise<SeriesSubtitleVariant[]>;
    getEpisodeSubtitles(episodeId: number): Promise<EpisodeSubtitle>;
    syncSeries(seriesId: number): Promise<SeriesSyncResult>;
    scanSeriesDisk(seriesId: number): Promise<DiskScanResult>;
    searchSeriesSubtitles(seriesId: number): Promise<SubtitleSearchResult>;
    syncMovie(movieId: number): Promise<SeriesSyncResult>;
    scanMovieDisk(movieId: number): Promise<DiskScanResult>;
    searchMovieSubtitles(movieId: number): Promise<SubtitleSearchResult>;
    bulkUpdateMovies(input: BulkUpdateMoviesInput): Promise<BulkUpdateMoviesResult>;
    uploadSubtitle(input: SubtitleUploadInput): Promise<SubtitleUploadRecord>;
};
export {};
//# sourceMappingURL=subtitleApi.d.ts.map