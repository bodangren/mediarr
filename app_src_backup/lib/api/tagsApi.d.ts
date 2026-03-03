import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const tagSchema: z.ZodObject<{
    id: z.ZodNumber;
    label: z.ZodString;
    color: z.ZodString;
    indexerIds: z.ZodArray<z.ZodNumber, "many">;
    applicationIds: z.ZodArray<z.ZodNumber, "many">;
    downloadClientIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    label: string;
    id: number;
    color: string;
    indexerIds: number[];
    applicationIds: number[];
    downloadClientIds: number[];
}, {
    label: string;
    id: number;
    color: string;
    indexerIds: number[];
    applicationIds: number[];
    downloadClientIds: number[];
}>;
declare const tagDetailsSchema: z.ZodObject<{
    tag: z.ZodObject<{
        id: z.ZodNumber;
        label: z.ZodString;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: number;
        color: string;
    }, {
        label: string;
        id: number;
        color: string;
    }>;
    indexers: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: number;
    }, {
        name: string;
        id: number;
    }>, "many">;
    applications: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: number;
    }, {
        name: string;
        id: number;
    }>, "many">;
    downloadClients: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: number;
    }, {
        name: string;
        id: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    indexers: {
        name: string;
        id: number;
    }[];
    tag: {
        label: string;
        id: number;
        color: string;
    };
    applications: {
        name: string;
        id: number;
    }[];
    downloadClients: {
        name: string;
        id: number;
    }[];
}, {
    indexers: {
        name: string;
        id: number;
    }[];
    tag: {
        label: string;
        id: number;
        color: string;
    };
    applications: {
        name: string;
        id: number;
    }[];
    downloadClients: {
        name: string;
        id: number;
    }[];
}>;
export type TagItem = z.infer<typeof tagSchema>;
export type TagDetails = z.infer<typeof tagDetailsSchema>;
export interface CreateTagInput {
    label: string;
    color: string;
}
export interface UpdateTagInput {
    label?: string;
    color?: string;
}
export interface UpdateTagAssignmentsInput {
    indexerIds?: number[];
    applicationIds?: number[];
    downloadClientIds?: number[];
}
export declare function createTagsApi(client: ApiHttpClient): {
    list(): Promise<TagItem[]>;
    create(input: CreateTagInput): Promise<TagItem>;
    update(id: number, input: UpdateTagInput): Promise<TagItem>;
    remove(id: number): Promise<{
        id: number;
    }>;
    getDetails(id: number): Promise<TagDetails>;
    updateAssignments(id: number, input: UpdateTagAssignmentsInput): Promise<TagItem>;
};
export {};
//# sourceMappingURL=tagsApi.d.ts.map