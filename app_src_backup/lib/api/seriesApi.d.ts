import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const seriesSchema: z.ZodObject<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodNumber;
    monitored: z.ZodBoolean;
    qualityProfileId: z.ZodNumber;
    added: z.ZodString;
    tvdbId: z.ZodOptional<z.ZodNumber>;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    imdbId: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    overview: z.ZodOptional<z.ZodString>;
    network: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodNumber;
    monitored: z.ZodBoolean;
    qualityProfileId: z.ZodNumber;
    added: z.ZodString;
    tvdbId: z.ZodOptional<z.ZodNumber>;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    imdbId: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    overview: z.ZodOptional<z.ZodString>;
    network: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodNumber;
    monitored: z.ZodBoolean;
    qualityProfileId: z.ZodNumber;
    added: z.ZodString;
    tvdbId: z.ZodOptional<z.ZodNumber>;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    imdbId: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    overview: z.ZodOptional<z.ZodString>;
    network: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
declare const seriesOrganizePreviewSchema: z.ZodObject<{
    seriesId: z.ZodNumber;
    seriesTitle: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeId: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    episodeTitle: z.ZodOptional<z.ZodString>;
    currentPath: z.ZodString;
    newPath: z.ZodString;
    isNewPath: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    currentPath: string;
    seasonNumber: number;
    episodeNumber: number;
    episodeId: number;
    seriesId: number;
    seriesTitle: string;
    newPath: string;
    isNewPath: boolean;
    episodeTitle?: string | undefined;
}, {
    currentPath: string;
    seasonNumber: number;
    episodeNumber: number;
    episodeId: number;
    seriesId: number;
    seriesTitle: string;
    newPath: string;
    isNewPath: boolean;
    episodeTitle?: string | undefined;
}>;
declare const episodeImportFileSchema: z.ZodObject<{
    path: z.ZodString;
    size: z.ZodNumber;
    parsedSeriesTitle: z.ZodOptional<z.ZodString>;
    parsedSeasonNumber: z.ZodOptional<z.ZodNumber>;
    parsedEpisodeNumber: z.ZodOptional<z.ZodNumber>;
    parsedEndingEpisodeNumber: z.ZodOptional<z.ZodNumber>;
    parsedQuality: z.ZodOptional<z.ZodString>;
    match: z.ZodOptional<z.ZodObject<{
        seriesId: z.ZodNumber;
        seasonId: z.ZodOptional<z.ZodNumber>;
        episodeId: z.ZodOptional<z.ZodNumber>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        seriesId: number;
        confidence: number;
        episodeId?: number | undefined;
        seasonId?: number | undefined;
    }, {
        seriesId: number;
        confidence: number;
        episodeId?: number | undefined;
        seasonId?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    size: number;
    match?: {
        seriesId: number;
        confidence: number;
        episodeId?: number | undefined;
        seasonId?: number | undefined;
    } | undefined;
    parsedQuality?: string | undefined;
    parsedSeriesTitle?: string | undefined;
    parsedSeasonNumber?: number | undefined;
    parsedEpisodeNumber?: number | undefined;
    parsedEndingEpisodeNumber?: number | undefined;
}, {
    path: string;
    size: number;
    match?: {
        seriesId: number;
        confidence: number;
        episodeId?: number | undefined;
        seasonId?: number | undefined;
    } | undefined;
    parsedQuality?: string | undefined;
    parsedSeriesTitle?: string | undefined;
    parsedSeasonNumber?: number | undefined;
    parsedEpisodeNumber?: number | undefined;
    parsedEndingEpisodeNumber?: number | undefined;
}>;
declare const seriesSearchResultSchema: z.ZodObject<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodOptional<z.ZodNumber>;
    overview: z.ZodOptional<z.ZodString>;
    posterUrl: z.ZodOptional<z.ZodString>;
    tvdbId: z.ZodOptional<z.ZodNumber>;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    seasons: z.ZodOptional<z.ZodArray<z.ZodObject<{
        seasonNumber: z.ZodNumber;
        episodeCount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        seasonNumber: number;
        episodeCount?: number | undefined;
    }, {
        seasonNumber: number;
        episodeCount?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    id: number;
    tmdbId?: number | undefined;
    year?: number | undefined;
    overview?: string | undefined;
    posterUrl?: string | undefined;
    tvdbId?: number | undefined;
    seasons?: {
        seasonNumber: number;
        episodeCount?: number | undefined;
    }[] | undefined;
}, {
    title: string;
    id: number;
    tmdbId?: number | undefined;
    year?: number | undefined;
    overview?: string | undefined;
    posterUrl?: string | undefined;
    tvdbId?: number | undefined;
    seasons?: {
        seasonNumber: number;
        episodeCount?: number | undefined;
    }[] | undefined;
}>;
export type Series = z.infer<typeof seriesSchema>;
export type SeriesOrganizePreview = z.infer<typeof seriesOrganizePreviewSchema>;
export type EpisodeImportFile = z.infer<typeof episodeImportFileSchema>;
export type SeriesSearchResult = z.infer<typeof seriesSearchResultSchema>;
export interface BulkSeriesChanges {
    qualityProfileId?: number;
    monitored?: boolean;
    rootFolderPath?: string;
    seasonFolder?: boolean;
    addTags?: string[];
    removeTags?: string[];
}
export interface BulkUpdateResult {
    updated: number;
    failed: number;
    errors?: Array<{
        seriesId: number;
        error: string;
    }>;
}
export interface SeriesOrganizePreviewInput {
    seriesIds: number[];
}
export interface SeriesOrganizeApplyInput {
    seriesIds: number[];
}
export interface EpisodeImportScanInput {
    path: string;
}
export interface EpisodeImportApplyFile {
    path: string;
    seriesId: number;
    seasonId: number;
    episodeId: number;
    quality?: string;
    language?: string;
}
export interface EpisodeImportApplyInput {
    files: EpisodeImportApplyFile[];
}
export declare function createSeriesApi(client: ApiHttpClient): {
    bulkUpdate(seriesIds: number[], changes: BulkSeriesChanges): Promise<BulkUpdateResult>;
    getRootFolders(): Promise<{
        rootFolders: string[];
    }>;
    previewOrganize(input: SeriesOrganizePreviewInput): Promise<{
        previews: SeriesOrganizePreview[];
    }>;
    applyOrganize(input: SeriesOrganizeApplyInput): Promise<{
        renamed: number;
        failed: number;
        errors: Array<{
            episodeId: number;
            error: string;
        }>;
    }>;
    scanImport(input: EpisodeImportScanInput): Promise<{
        files: EpisodeImportFile[];
    }>;
    applyImport(input: EpisodeImportApplyInput): Promise<{
        imported: number;
        failed: number;
        errors: Array<{
            path: string;
            error: string;
        }>;
    }>;
    getSeriesWithEpisodes(seriesId: number): Promise<{
        id: number;
        title: string;
        seasons: Array<{
            id: number;
            seasonNumber: number;
            episodes: Array<{
                id: number;
                episodeNumber: number;
                title: string;
            }>;
        }>;
    }>;
};
export {};
//# sourceMappingURL=seriesApi.d.ts.map