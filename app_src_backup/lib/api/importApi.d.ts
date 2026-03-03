import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const detectedSeriesSchema: z.ZodObject<{
    id: z.ZodNumber;
    folderName: z.ZodString;
    path: z.ZodString;
    fileCount: z.ZodNumber;
    matchedSeriesId: z.ZodNullable<z.ZodNumber>;
    matchedSeriesTitle: z.ZodOptional<z.ZodString>;
    matchedSeriesYear: z.ZodOptional<z.ZodNumber>;
    status: z.ZodEnum<["matched", "unmatched", "pending"]>;
}, "strip", z.ZodTypeAny, {
    status: "matched" | "unmatched" | "pending";
    path: string;
    id: number;
    folderName: string;
    fileCount: number;
    matchedSeriesId: number | null;
    matchedSeriesTitle?: string | undefined;
    matchedSeriesYear?: number | undefined;
}, {
    status: "matched" | "unmatched" | "pending";
    path: string;
    id: number;
    folderName: string;
    fileCount: number;
    matchedSeriesId: number | null;
    matchedSeriesTitle?: string | undefined;
    matchedSeriesYear?: number | undefined;
}>;
declare const seriesSearchResultSchema: z.ZodObject<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodOptional<z.ZodNumber>;
    overview: z.ZodOptional<z.ZodString>;
    network: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    tvdbId: z.ZodOptional<z.ZodNumber>;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    imdbId: z.ZodOptional<z.ZodString>;
    images: z.ZodOptional<z.ZodArray<z.ZodObject<{
        coverType: z.ZodString;
        remoteUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        coverType: string;
        remoteUrl: string;
    }, {
        coverType: string;
        remoteUrl: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    id: number;
    status?: string | undefined;
    tmdbId?: number | undefined;
    year?: number | undefined;
    overview?: string | undefined;
    imdbId?: string | undefined;
    network?: string | undefined;
    tvdbId?: number | undefined;
    images?: {
        coverType: string;
        remoteUrl: string;
    }[] | undefined;
}, {
    title: string;
    id: number;
    status?: string | undefined;
    tmdbId?: number | undefined;
    year?: number | undefined;
    overview?: string | undefined;
    imdbId?: string | undefined;
    network?: string | undefined;
    tvdbId?: number | undefined;
    images?: {
        coverType: string;
        remoteUrl: string;
    }[] | undefined;
}>;
declare const importSeriesRequestSchema: z.ZodObject<{
    seriesId: z.ZodNumber;
    folderName: z.ZodString;
    path: z.ZodString;
    qualityProfileId: z.ZodNumber;
    monitored: z.ZodBoolean;
    monitorNewItems: z.ZodEnum<["all", "none", "future"]>;
    rootFolder: z.ZodString;
    seriesType: z.ZodEnum<["standard", "anime", "daily"]>;
    seasonFolder: z.ZodBoolean;
    matchedSeriesId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    path: string;
    qualityProfileId: number;
    monitored: boolean;
    rootFolder: string;
    seriesType: "standard" | "anime" | "daily";
    seasonFolder: boolean;
    monitorNewItems: "none" | "all" | "future";
    seriesId: number;
    folderName: string;
    matchedSeriesId?: number | undefined;
}, {
    path: string;
    qualityProfileId: number;
    monitored: boolean;
    rootFolder: string;
    seriesType: "standard" | "anime" | "daily";
    seasonFolder: boolean;
    monitorNewItems: "none" | "all" | "future";
    seriesId: number;
    folderName: string;
    matchedSeriesId?: number | undefined;
}>;
declare const scanFolderRequestSchema: z.ZodObject<{
    path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
}, {
    path: string;
}>;
export type DetectedSeries = z.infer<typeof detectedSeriesSchema>;
export type SeriesSearchResult = z.infer<typeof seriesSearchResultSchema>;
export type ImportSeriesRequest = z.infer<typeof importSeriesRequestSchema>;
export type ScanFolderRequest = z.infer<typeof scanFolderRequestSchema>;
export declare function createImportApi(client: ApiHttpClient): {
    scanFolder(request: ScanFolderRequest): Promise<DetectedSeries[]>;
    importSeries(request: ImportSeriesRequest): Promise<{
        id: number;
    }>;
    bulkImportSeries(requests: ImportSeriesRequest[]): Promise<{
        importedCount: number;
        ids: number[];
    }>;
};
export {};
//# sourceMappingURL=importApi.d.ts.map