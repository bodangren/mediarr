import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
export declare const providerTypeSchema: z.ZodEnum<["tmdb-popular", "tmdb-list"]>;
export type ProviderType = z.infer<typeof providerTypeSchema>;
export declare const tmdbPopularConfigSchema: z.ZodObject<{
    mediaType: z.ZodDefault<z.ZodOptional<z.ZodEnum<["movie", "series", "both"]>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    mediaType: "series" | "movie" | "both";
    limit: number;
}, {
    mediaType?: "series" | "movie" | "both" | undefined;
    limit?: number | undefined;
}>;
export type TMDBPopularConfig = z.infer<typeof tmdbPopularConfigSchema>;
export declare const tmdbListConfigSchema: z.ZodObject<{
    listId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    listId: string;
}, {
    listId: string;
}>;
export type TMDBListConfig = z.infer<typeof tmdbListConfigSchema>;
export declare const importListSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    providerType: z.ZodString;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    rootFolderPath: z.ZodString;
    qualityProfileId: z.ZodNumber;
    languageProfileId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    monitorType: z.ZodString;
    enabled: z.ZodBoolean;
    syncInterval: z.ZodNumber;
    lastSyncAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    qualityProfile: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: number;
    }, {
        name: string;
        id: number;
    }>;
}, "strip", z.ZodTypeAny, {
    qualityProfileId: number;
    name: string;
    id: number;
    enabled: boolean;
    config: Record<string, unknown>;
    providerType: string;
    rootFolderPath: string;
    monitorType: string;
    syncInterval: number;
    createdAt: string;
    qualityProfile: {
        name: string;
        id: number;
    };
    updatedAt: string;
    languageProfileId?: number | null | undefined;
    lastSyncAt?: string | null | undefined;
}, {
    qualityProfileId: number;
    name: string;
    id: number;
    enabled: boolean;
    config: Record<string, unknown>;
    providerType: string;
    rootFolderPath: string;
    monitorType: string;
    syncInterval: number;
    createdAt: string;
    qualityProfile: {
        name: string;
        id: number;
    };
    updatedAt: string;
    languageProfileId?: number | null | undefined;
    lastSyncAt?: string | null | undefined;
}>;
export type ImportList = z.infer<typeof importListSchema>;
export declare const importListExclusionSchema: z.ZodObject<{
    id: z.ZodNumber;
    importListId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    tmdbId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    imdbId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tvdbId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    title: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    id: number;
    createdAt: string;
    tmdbId?: number | null | undefined;
    imdbId?: string | null | undefined;
    tvdbId?: number | null | undefined;
    importListId?: number | null | undefined;
}, {
    title: string;
    id: number;
    createdAt: string;
    tmdbId?: number | null | undefined;
    imdbId?: string | null | undefined;
    tvdbId?: number | null | undefined;
    importListId?: number | null | undefined;
}>;
export type ImportListExclusion = z.infer<typeof importListExclusionSchema>;
export declare const providerInfoSchema: z.ZodObject<{
    type: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    name: string;
}, {
    type: string;
    name: string;
}>;
export type ProviderInfo = z.infer<typeof providerInfoSchema>;
export declare const syncResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    addedCount: z.ZodNumber;
    skippedCount: z.ZodNumber;
    errorCount: z.ZodNumber;
    errors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    addedCount: number;
    skippedCount: number;
    errorCount: number;
    errors?: string[] | undefined;
}, {
    success: boolean;
    addedCount: number;
    skippedCount: number;
    errorCount: number;
    errors?: string[] | undefined;
}>;
export type SyncResult = z.infer<typeof syncResultSchema>;
export declare const createImportListInputSchema: z.ZodObject<{
    name: z.ZodString;
    providerType: z.ZodString;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    rootFolderPath: z.ZodString;
    qualityProfileId: z.ZodNumber;
    languageProfileId: z.ZodOptional<z.ZodNumber>;
    monitorType: z.ZodString;
    enabled: z.ZodOptional<z.ZodBoolean>;
    syncInterval: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    qualityProfileId: number;
    name: string;
    config: Record<string, unknown>;
    providerType: string;
    rootFolderPath: string;
    monitorType: string;
    enabled?: boolean | undefined;
    syncInterval?: number | undefined;
    languageProfileId?: number | undefined;
}, {
    qualityProfileId: number;
    name: string;
    config: Record<string, unknown>;
    providerType: string;
    rootFolderPath: string;
    monitorType: string;
    enabled?: boolean | undefined;
    syncInterval?: number | undefined;
    languageProfileId?: number | undefined;
}>;
export type CreateImportListInput = z.infer<typeof createImportListInputSchema>;
export declare const updateImportListInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    providerType: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    rootFolderPath: z.ZodOptional<z.ZodString>;
    qualityProfileId: z.ZodOptional<z.ZodNumber>;
    languageProfileId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    monitorType: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    syncInterval: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    qualityProfileId?: number | undefined;
    name?: string | undefined;
    enabled?: boolean | undefined;
    config?: Record<string, unknown> | undefined;
    providerType?: string | undefined;
    rootFolderPath?: string | undefined;
    monitorType?: string | undefined;
    syncInterval?: number | undefined;
    languageProfileId?: number | null | undefined;
}, {
    qualityProfileId?: number | undefined;
    name?: string | undefined;
    enabled?: boolean | undefined;
    config?: Record<string, unknown> | undefined;
    providerType?: string | undefined;
    rootFolderPath?: string | undefined;
    monitorType?: string | undefined;
    syncInterval?: number | undefined;
    languageProfileId?: number | null | undefined;
}>;
export type UpdateImportListInput = z.infer<typeof updateImportListInputSchema>;
export declare const createExclusionInputSchema: z.ZodObject<{
    importListId: z.ZodOptional<z.ZodNumber>;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    imdbId: z.ZodOptional<z.ZodString>;
    tvdbId: z.ZodOptional<z.ZodNumber>;
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    tmdbId?: number | undefined;
    imdbId?: string | undefined;
    tvdbId?: number | undefined;
    importListId?: number | undefined;
}, {
    title: string;
    tmdbId?: number | undefined;
    imdbId?: string | undefined;
    tvdbId?: number | undefined;
    importListId?: number | undefined;
}>;
export type CreateExclusionInput = z.infer<typeof createExclusionInputSchema>;
export declare function createImportListsApi(client: ApiHttpClient): {
    list(): Promise<ImportList[]>;
    get(id: number): Promise<ImportList>;
    create(input: CreateImportListInput): Promise<ImportList>;
    update(id: number, input: UpdateImportListInput): Promise<ImportList>;
    delete(id: number): Promise<{
        success: boolean;
    }>;
    sync(id: number): Promise<SyncResult>;
    getProviders(): Promise<ProviderInfo[]>;
    listExclusions(): Promise<ImportListExclusion[]>;
    createExclusion(input: CreateExclusionInput): Promise<ImportListExclusion>;
    deleteExclusion(id: number): Promise<{
        success: boolean;
    }>;
};
//# sourceMappingURL=importListsApi.d.ts.map