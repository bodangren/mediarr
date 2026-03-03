import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const collectionMovieSchema: z.ZodObject<{
    id: z.ZodNumber;
    tmdbId: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodNumber;
    posterUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    inLibrary: z.ZodBoolean;
    monitored: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodString>;
    quality: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    tmdbId: number;
    id: number;
    year: number;
    inLibrary: boolean;
    status?: string | undefined;
    monitored?: boolean | undefined;
    posterUrl?: string | null | undefined;
    quality?: string | null | undefined;
}, {
    title: string;
    tmdbId: number;
    id: number;
    year: number;
    inLibrary: boolean;
    status?: string | undefined;
    monitored?: boolean | undefined;
    posterUrl?: string | null | undefined;
    quality?: string | null | undefined;
}>;
declare const collectionSchema: z.ZodObject<{
    id: z.ZodNumber;
    tmdbId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    tmdbCollectionId: z.ZodOptional<z.ZodNumber>;
    name: z.ZodString;
    overview: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    posterUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    backdropUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    movieCount: z.ZodNumber;
    moviesInLibrary: z.ZodNumber;
    monitored: z.ZodBoolean;
    movies: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        tmdbId: z.ZodNumber;
        title: z.ZodString;
        year: z.ZodNumber;
        posterUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        inLibrary: z.ZodBoolean;
        monitored: z.ZodOptional<z.ZodBoolean>;
        status: z.ZodOptional<z.ZodString>;
        quality: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        tmdbId: number;
        id: number;
        year: number;
        inLibrary: boolean;
        status?: string | undefined;
        monitored?: boolean | undefined;
        posterUrl?: string | null | undefined;
        quality?: string | null | undefined;
    }, {
        title: string;
        tmdbId: number;
        id: number;
        year: number;
        inLibrary: boolean;
        status?: string | undefined;
        monitored?: boolean | undefined;
        posterUrl?: string | null | undefined;
        quality?: string | null | undefined;
    }>, "many">>;
    qualityProfileId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    qualityProfile: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: number;
    }, {
        name: string;
        id: number;
    }>>>;
    minimumAvailability: z.ZodOptional<z.ZodString>;
    rootFolderPath: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    addMoviesAutomatically: z.ZodOptional<z.ZodBoolean>;
    searchOnAdd: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
    monitored: boolean;
    movieCount: number;
    moviesInLibrary: number;
    qualityProfileId?: number | null | undefined;
    tmdbId?: number | null | undefined;
    movies?: {
        title: string;
        tmdbId: number;
        id: number;
        year: number;
        inLibrary: boolean;
        status?: string | undefined;
        monitored?: boolean | undefined;
        posterUrl?: string | null | undefined;
        quality?: string | null | undefined;
    }[] | undefined;
    overview?: string | null | undefined;
    posterUrl?: string | null | undefined;
    searchOnAdd?: boolean | undefined;
    rootFolderPath?: string | null | undefined;
    minimumAvailability?: string | undefined;
    tmdbCollectionId?: number | undefined;
    backdropUrl?: string | null | undefined;
    qualityProfile?: {
        name: string;
        id: number;
    } | null | undefined;
    addMoviesAutomatically?: boolean | undefined;
}, {
    name: string;
    id: number;
    monitored: boolean;
    movieCount: number;
    moviesInLibrary: number;
    qualityProfileId?: number | null | undefined;
    tmdbId?: number | null | undefined;
    movies?: {
        title: string;
        tmdbId: number;
        id: number;
        year: number;
        inLibrary: boolean;
        status?: string | undefined;
        monitored?: boolean | undefined;
        posterUrl?: string | null | undefined;
        quality?: string | null | undefined;
    }[] | undefined;
    overview?: string | null | undefined;
    posterUrl?: string | null | undefined;
    searchOnAdd?: boolean | undefined;
    rootFolderPath?: string | null | undefined;
    minimumAvailability?: string | undefined;
    tmdbCollectionId?: number | undefined;
    backdropUrl?: string | null | undefined;
    qualityProfile?: {
        name: string;
        id: number;
    } | null | undefined;
    addMoviesAutomatically?: boolean | undefined;
}>;
declare const createCollectionResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    moviesAdded: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
    moviesAdded: number;
}, {
    name: string;
    id: number;
    moviesAdded: number;
}>;
declare const searchResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    message: z.ZodString;
    searched: z.ZodNumber;
    missing: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    id: number;
    missing: number;
    searched: number;
}, {
    message: string;
    id: number;
    missing: number;
    searched: number;
}>;
declare const syncResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    message: z.ZodString;
    added: z.ZodNumber;
    updated: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    id: number;
    added: number;
    updated: number;
}, {
    message: string;
    id: number;
    added: number;
    updated: number;
}>;
export type MovieCollection = z.infer<typeof collectionSchema>;
export type CollectionMovie = z.infer<typeof collectionMovieSchema>;
export interface CollectionEditForm {
    name: string;
    overview: string;
    monitored: boolean;
    minimumAvailability: string;
    qualityProfileId: number;
    rootFolder: string;
    searchOnAdd: boolean;
}
export interface CreateCollectionInput {
    tmdbCollectionId: number;
    monitored?: boolean;
    qualityProfileId?: number;
    rootFolderPath?: string;
    addMoviesAutomatically?: boolean;
    searchOnAdd?: boolean;
}
export declare function createCollectionApi(client: ApiHttpClient): {
    list(): Promise<MovieCollection[]>;
    getById(id: number): Promise<MovieCollection>;
    create(input: CreateCollectionInput): Promise<z.infer<typeof createCollectionResponseSchema>>;
    update(id: number, input: Partial<CollectionEditForm>): Promise<MovieCollection>;
    delete(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
    search(id: number): Promise<z.infer<typeof searchResponseSchema>>;
    sync(id: number): Promise<z.infer<typeof syncResponseSchema>>;
};
export {};
//# sourceMappingURL=collectionApi.d.ts.map