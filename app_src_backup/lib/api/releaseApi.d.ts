import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
declare const releaseCandidateSchema: z.ZodObject<{
    indexer: z.ZodString;
    indexerId: z.ZodNumber;
    title: z.ZodString;
    guid: z.ZodOptional<z.ZodString>;
    size: z.ZodNumber;
    seeders: z.ZodNumber;
    leechers: z.ZodOptional<z.ZodNumber>;
    indexerFlags: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodString>;
    age: z.ZodOptional<z.ZodNumber>;
    publishDate: z.ZodOptional<z.ZodString>;
    categories: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    protocol: z.ZodOptional<z.ZodEnum<["torrent", "usenet"]>>;
    magnetUrl: z.ZodOptional<z.ZodString>;
    downloadUrl: z.ZodOptional<z.ZodString>;
    infoHash: z.ZodOptional<z.ZodString>;
    customFormatScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title: string;
    size: number;
    indexer: string;
    seeders: number;
    indexerId: number;
    protocol?: "torrent" | "usenet" | undefined;
    quality?: string | undefined;
    guid?: string | undefined;
    magnetUrl?: string | undefined;
    age?: number | undefined;
    publishDate?: string | undefined;
    leechers?: number | undefined;
    downloadUrl?: string | undefined;
    infoHash?: string | undefined;
    indexerFlags?: string | undefined;
    categories?: number[] | undefined;
    customFormatScore?: number | undefined;
}, {
    title: string;
    size: number;
    indexer: string;
    seeders: number;
    indexerId: number;
    protocol?: "torrent" | "usenet" | undefined;
    quality?: string | undefined;
    guid?: string | undefined;
    magnetUrl?: string | undefined;
    age?: number | undefined;
    publishDate?: string | undefined;
    leechers?: number | undefined;
    downloadUrl?: string | undefined;
    infoHash?: string | undefined;
    indexerFlags?: string | undefined;
    categories?: number[] | undefined;
    customFormatScore?: number | undefined;
}>;
declare const grabResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    downloadId: z.ZodString;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
    downloadId: string;
}, {
    message: string;
    success: boolean;
    downloadId: string;
}>;
export type ReleaseCandidate = z.infer<typeof releaseCandidateSchema>;
export type GrabResult = z.infer<typeof grabResultSchema>;
export type GrabCandidateInput = Partial<ReleaseCandidate> & {
    language?: string;
    downloadClientId?: number;
};
export type SearchParams = {
    query?: string;
    type?: 'generic' | 'tvsearch' | 'movie' | 'music' | 'book';
    season?: number;
    episode?: number;
    tvdbId?: number;
    imdbId?: string;
    tmdbId?: number;
    qualityProfileId?: number;
    year?: number;
    artist?: string;
    album?: string;
    author?: string;
    title?: string;
    categories?: number[];
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
};
export declare function createReleaseApi(client: ApiHttpClient): {
    searchCandidates(params: SearchParams): Promise<PaginatedResult<ReleaseCandidate>>;
    grabRelease(guid: string, indexerId: number, downloadClientId?: number): Promise<GrabResult>;
    grabCandidate(candidate: GrabCandidateInput): Promise<GrabResult>;
};
export {};
//# sourceMappingURL=releaseApi.d.ts.map