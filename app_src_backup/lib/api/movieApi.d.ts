import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const movieSchema: z.ZodObject<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodNumber;
    monitored: z.ZodBoolean;
    qualityProfileId: z.ZodNumber;
    added: z.ZodString;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    imdbId: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    sizeOnDisk: z.ZodOptional<z.ZodNumber>;
    hasFile: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodString>;
    overview: z.ZodOptional<z.ZodString>;
    posterUrl: z.ZodOptional<z.ZodString>;
    runtime: z.ZodOptional<z.ZodNumber>;
    certification: z.ZodOptional<z.ZodString>;
    genres: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    titleSlug: z.ZodOptional<z.ZodString>;
    sortTitle: z.ZodOptional<z.ZodString>;
    studio: z.ZodOptional<z.ZodString>;
    originalLanguage: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: number;
    }, {
        name: string;
        id: number;
    }>>;
    collection: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        title: z.ZodString;
        overview: z.ZodOptional<z.ZodString>;
        posterUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        id: number;
        overview?: string | undefined;
        posterUrl?: string | undefined;
    }, {
        title: string;
        id: number;
        overview?: string | undefined;
        posterUrl?: string | undefined;
    }>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodNumber;
    monitored: z.ZodBoolean;
    qualityProfileId: z.ZodNumber;
    added: z.ZodString;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    imdbId: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    sizeOnDisk: z.ZodOptional<z.ZodNumber>;
    hasFile: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodString>;
    overview: z.ZodOptional<z.ZodString>;
    posterUrl: z.ZodOptional<z.ZodString>;
    runtime: z.ZodOptional<z.ZodNumber>;
    certification: z.ZodOptional<z.ZodString>;
    genres: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    titleSlug: z.ZodOptional<z.ZodString>;
    sortTitle: z.ZodOptional<z.ZodString>;
    studio: z.ZodOptional<z.ZodString>;
    originalLanguage: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: number;
    }, {
        name: string;
        id: number;
    }>>;
    collection: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        title: z.ZodString;
        overview: z.ZodOptional<z.ZodString>;
        posterUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        id: number;
        overview?: string | undefined;
        posterUrl?: string | undefined;
    }, {
        title: string;
        id: number;
        overview?: string | undefined;
        posterUrl?: string | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodNumber;
    monitored: z.ZodBoolean;
    qualityProfileId: z.ZodNumber;
    added: z.ZodString;
    tmdbId: z.ZodOptional<z.ZodNumber>;
    imdbId: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    sizeOnDisk: z.ZodOptional<z.ZodNumber>;
    hasFile: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodString>;
    overview: z.ZodOptional<z.ZodString>;
    posterUrl: z.ZodOptional<z.ZodString>;
    runtime: z.ZodOptional<z.ZodNumber>;
    certification: z.ZodOptional<z.ZodString>;
    genres: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    titleSlug: z.ZodOptional<z.ZodString>;
    sortTitle: z.ZodOptional<z.ZodString>;
    studio: z.ZodOptional<z.ZodString>;
    originalLanguage: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: number;
    }, {
        name: string;
        id: number;
    }>>;
    collection: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        title: z.ZodString;
        overview: z.ZodOptional<z.ZodString>;
        posterUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        id: number;
        overview?: string | undefined;
        posterUrl?: string | undefined;
    }, {
        title: string;
        id: number;
        overview?: string | undefined;
        posterUrl?: string | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">>;
declare const organizePreviewSchema: z.ZodObject<{
    movieId: z.ZodNumber;
    movieTitle: z.ZodString;
    currentPath: z.ZodString;
    newPath: z.ZodString;
    isNewPath: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    movieId: number;
    movieTitle: string;
    currentPath: string;
    newPath: string;
    isNewPath: boolean;
}, {
    movieId: number;
    movieTitle: string;
    currentPath: string;
    newPath: string;
    isNewPath: boolean;
}>;
declare const importFileSchema: z.ZodObject<{
    path: z.ZodString;
    size: z.ZodNumber;
    parsedMovieTitle: z.ZodOptional<z.ZodString>;
    parsedYear: z.ZodOptional<z.ZodNumber>;
    parsedQuality: z.ZodOptional<z.ZodString>;
    match: z.ZodOptional<z.ZodObject<{
        movieId: z.ZodNumber;
        title: z.ZodString;
        year: z.ZodNumber;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        title: string;
        year: number;
        movieId: number;
        confidence: number;
    }, {
        title: string;
        year: number;
        movieId: number;
        confidence: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    size: number;
    match?: {
        title: string;
        year: number;
        movieId: number;
        confidence: number;
    } | undefined;
    parsedMovieTitle?: string | undefined;
    parsedYear?: number | undefined;
    parsedQuality?: string | undefined;
}, {
    path: string;
    size: number;
    match?: {
        title: string;
        year: number;
        movieId: number;
        confidence: number;
    } | undefined;
    parsedMovieTitle?: string | undefined;
    parsedYear?: number | undefined;
    parsedQuality?: string | undefined;
}>;
export type Movie = z.infer<typeof movieSchema>;
export type OrganizePreview = z.infer<typeof organizePreviewSchema>;
export type ImportFile = z.infer<typeof importFileSchema>;
export interface UpdateMovieInput {
    monitored?: boolean;
    qualityProfileId?: number;
    title?: string;
    titleSlug?: string;
    overview?: string;
    studio?: string;
    certification?: string;
    genres?: string[];
    tags?: number[];
}
export interface OrganizePreviewInput {
    movieIds: number[];
}
export interface OrganizeApplyInput {
    movieIds: number[];
}
export interface ImportScanInput {
    path: string;
}
export interface ImportApplyFile {
    path: string;
    movieId: number;
    quality?: string;
    language?: string;
}
export interface ImportApplyInput {
    files: ImportApplyFile[];
}
export interface BulkMovieChanges {
    qualityProfileId?: number;
    monitored?: boolean;
    minimumAvailability?: string;
    path?: string;
    addTags?: string[];
    removeTags?: string[];
}
export interface BulkUpdateResult {
    updated: number;
    failed: number;
    errors?: Array<{
        movieId: number;
        error: string;
    }>;
}
export declare function createMovieApi(client: ApiHttpClient): {
    getById(id: number): Promise<Movie>;
    refresh(id: number): Promise<{
        id: number;
        refreshed: boolean;
    }>;
    update(id: number, input: UpdateMovieInput): Promise<Movie>;
    remove(id: number): Promise<{
        id: number;
    }>;
    deleteFile(movieId: number, fileId: number): Promise<{
        deleted: boolean;
    }>;
    previewOrganize(input: OrganizePreviewInput): Promise<{
        previews: OrganizePreview[];
    }>;
    applyOrganize(input: OrganizeApplyInput): Promise<{
        renamed: number;
        failed: number;
        errors: Array<{
            movieId: number;
            error: string;
        }>;
    }>;
    scanImport(input: ImportScanInput): Promise<{
        files: ImportFile[];
    }>;
    applyImport(input: ImportApplyInput): Promise<{
        imported: number;
        failed: number;
        errors: Array<{
            path: string;
            error: string;
        }>;
    }>;
    bulkUpdate(movieIds: number[], changes: BulkMovieChanges): Promise<BulkUpdateResult>;
    getRootFolders(): Promise<{
        rootFolders: string[];
    }>;
};
export {};
//# sourceMappingURL=movieApi.d.ts.map