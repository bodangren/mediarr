import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
declare const torrentSchema: z.ZodObject<{
    infoHash: z.ZodString;
    name: z.ZodString;
    status: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
    downloadSpeed: z.ZodOptional<z.ZodNumber>;
    uploadSpeed: z.ZodOptional<z.ZodNumber>;
    size: z.ZodString;
    downloaded: z.ZodString;
    uploaded: z.ZodString;
    eta: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    path: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    infoHash: z.ZodString;
    name: z.ZodString;
    status: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
    downloadSpeed: z.ZodOptional<z.ZodNumber>;
    uploadSpeed: z.ZodOptional<z.ZodNumber>;
    size: z.ZodString;
    downloaded: z.ZodString;
    uploaded: z.ZodString;
    eta: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    path: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    infoHash: z.ZodString;
    name: z.ZodString;
    status: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
    downloadSpeed: z.ZodOptional<z.ZodNumber>;
    uploadSpeed: z.ZodOptional<z.ZodNumber>;
    size: z.ZodString;
    downloaded: z.ZodString;
    uploaded: z.ZodString;
    eta: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    path: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">>;
declare const torrentMutationSchema: z.ZodObject<{
    infoHash: z.ZodString;
    status: z.ZodOptional<z.ZodString>;
    removed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    infoHash: string;
    status?: string | undefined;
    removed?: boolean | undefined;
}, {
    infoHash: string;
    status?: string | undefined;
    removed?: boolean | undefined;
}>;
export type TorrentItem = z.infer<typeof torrentSchema>;
export interface TorrentListQuery {
    page?: number;
    pageSize?: number;
}
export interface AddTorrentInput {
    magnetUrl?: string;
    path?: string;
    torrentFileBase64?: string;
}
export interface SpeedLimitsInput {
    download?: number;
    upload?: number;
}
export declare function createTorrentApi(client: ApiHttpClient): {
    list(query?: TorrentListQuery): Promise<PaginatedResult<TorrentItem>>;
    get(infoHash: string): Promise<TorrentItem>;
    add(input: AddTorrentInput): Promise<{
        infoHash: string;
        name?: string;
    }>;
    pause(infoHash: string): Promise<z.infer<typeof torrentMutationSchema>>;
    resume(infoHash: string): Promise<z.infer<typeof torrentMutationSchema>>;
    remove(infoHash: string): Promise<z.infer<typeof torrentMutationSchema>>;
    setSpeedLimits(input: SpeedLimitsInput): Promise<{
        updated: boolean;
        limits: SpeedLimitsInput;
    }>;
};
export {};
//# sourceMappingURL=torrentApi.d.ts.map