import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { TestResult } from './shared-schemas';
declare const applicationSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    type: z.ZodEnum<["Sonarr", "Radarr", "Lidarr", "Readarr"]>;
    baseUrl: z.ZodString;
    apiKey: z.ZodString;
    syncCategories: z.ZodArray<z.ZodNumber, "many">;
    tags: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "Radarr" | "Sonarr" | "Lidarr" | "Readarr";
    name: string;
    apiKey: string;
    id: number;
    tags: string[];
    baseUrl: string;
    syncCategories: number[];
}, {
    type: "Radarr" | "Sonarr" | "Lidarr" | "Readarr";
    name: string;
    apiKey: string;
    id: number;
    tags: string[];
    baseUrl: string;
    syncCategories: number[];
}>;
declare const syncResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    syncedCount: z.ZodNumber;
    applicationId: z.ZodOptional<z.ZodNumber>;
    failedApplications: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        message: string;
        id: number;
    }, {
        name: string;
        message: string;
        id: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
    syncedCount: number;
    applicationId?: number | undefined;
    failedApplications?: {
        name: string;
        message: string;
        id: number;
    }[] | undefined;
}, {
    message: string;
    success: boolean;
    syncedCount: number;
    applicationId?: number | undefined;
    failedApplications?: {
        name: string;
        message: string;
        id: number;
    }[] | undefined;
}>;
export type ApplicationItem = z.infer<typeof applicationSchema>;
export type ApplicationTestResult = TestResult;
export type ApplicationSyncResult = z.infer<typeof syncResultSchema>;
export interface CreateApplicationInput {
    name: string;
    type: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr';
    baseUrl: string;
    apiKey: string;
    syncCategories?: number[];
    tags?: string[];
}
export interface UpdateApplicationInput {
    name?: string;
    type?: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr';
    baseUrl?: string;
    apiKey?: string;
    syncCategories?: number[];
    tags?: string[];
}
export declare function createApplicationsApi(client: ApiHttpClient): {
    list(): Promise<ApplicationItem[]>;
    create(input: CreateApplicationInput): Promise<ApplicationItem>;
    update(id: number, input: UpdateApplicationInput): Promise<ApplicationItem>;
    remove(id: number): Promise<{
        id: number;
    }>;
    test(id: number): Promise<ApplicationTestResult>;
    sync(id: number): Promise<ApplicationSyncResult>;
    syncAll(): Promise<ApplicationSyncResult>;
};
export {};
//# sourceMappingURL=applicationsApi.d.ts.map