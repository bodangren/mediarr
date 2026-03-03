import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const currentVersionSchema: z.ZodObject<{
    version: z.ZodString;
    branch: z.ZodString;
    commit: z.ZodString;
    buildDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    version: string;
    commit: string;
    branch: string;
    buildDate: string;
}, {
    version: string;
    commit: string;
    branch: string;
    buildDate: string;
}>;
declare const availableUpdateSchema: z.ZodObject<{
    available: z.ZodBoolean;
    version: z.ZodOptional<z.ZodString>;
    releaseDate: z.ZodOptional<z.ZodString>;
    changelog: z.ZodOptional<z.ZodString>;
    downloadUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    available: boolean;
    version?: string | undefined;
    downloadUrl?: string | undefined;
    releaseDate?: string | undefined;
    changelog?: string | undefined;
}, {
    available: boolean;
    version?: string | undefined;
    downloadUrl?: string | undefined;
    releaseDate?: string | undefined;
    changelog?: string | undefined;
}>;
declare const updateHistoryEntrySchema: z.ZodObject<{
    id: z.ZodNumber;
    version: z.ZodString;
    installedDate: z.ZodString;
    status: z.ZodEnum<["success", "failed"]>;
    branch: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "success" | "failed";
    id: number;
    version: string;
    branch: string;
    installedDate: string;
}, {
    status: "success" | "failed";
    id: number;
    version: string;
    branch: string;
    installedDate: string;
}>;
declare const checkUpdatesResultSchema: z.ZodObject<{
    checked: z.ZodBoolean;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    checked: boolean;
    timestamp: string;
}, {
    checked: boolean;
    timestamp: string;
}>;
declare const installUpdateResultSchema: z.ZodObject<{
    updateId: z.ZodString;
    version: z.ZodString;
    startedAt: z.ZodString;
    status: z.ZodEnum<["started", "queued"]>;
}, "strip", z.ZodTypeAny, {
    status: "queued" | "started";
    version: string;
    startedAt: string;
    updateId: string;
}, {
    status: "queued" | "started";
    version: string;
    startedAt: string;
    updateId: string;
}>;
declare const updateProgressSchema: z.ZodObject<{
    updateId: z.ZodString;
    version: z.ZodString;
    status: z.ZodEnum<["queued", "downloading", "installing", "completed", "failed"]>;
    progress: z.ZodNumber;
    message: z.ZodString;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    estimatedTimeRemaining: z.ZodOptional<z.ZodNumber>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    progress: number;
    status: "downloading" | "queued" | "completed" | "failed" | "installing";
    message: string;
    version: string;
    startedAt: string;
    updateId: string;
    error?: string | undefined;
    completedAt?: string | undefined;
    estimatedTimeRemaining?: number | undefined;
}, {
    progress: number;
    status: "downloading" | "queued" | "completed" | "failed" | "installing";
    message: string;
    version: string;
    startedAt: string;
    updateId: string;
    error?: string | undefined;
    completedAt?: string | undefined;
    estimatedTimeRemaining?: number | undefined;
}>;
export type CurrentVersion = z.infer<typeof currentVersionSchema>;
export type AvailableUpdate = z.infer<typeof availableUpdateSchema>;
export type UpdateHistoryEntry = z.infer<typeof updateHistoryEntrySchema>;
export type CheckUpdatesResult = z.infer<typeof checkUpdatesResultSchema>;
export type InstallUpdateResult = z.infer<typeof installUpdateResultSchema>;
export type UpdateProgress = z.infer<typeof updateProgressSchema>;
export interface UpdateHistoryQuery {
    page?: number;
    pageSize?: number;
}
export declare function createUpdatesApi(client: ApiHttpClient): {
    getCurrentVersion(): Promise<CurrentVersion>;
    getAvailableUpdates(): Promise<AvailableUpdate>;
    getUpdateHistory(query?: UpdateHistoryQuery): Promise<{
        items: UpdateHistoryEntry[];
        meta: {
            page: number;
            pageSize: number;
            totalCount: number;
            totalPages: number;
        };
    }>;
    checkForUpdates(): Promise<CheckUpdatesResult>;
    installUpdate(version: string): Promise<InstallUpdateResult>;
    getUpdateProgress(updateId: string): Promise<UpdateProgress>;
};
export {};
//# sourceMappingURL=updatesApi.d.ts.map