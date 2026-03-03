import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const backupTypeSchema: z.ZodEnum<["manual", "scheduled"]>;
declare const backupSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    path: z.ZodString;
    size: z.ZodNumber;
    created: z.ZodString;
    type: z.ZodEnum<["manual", "scheduled"]>;
}, "strip", z.ZodTypeAny, {
    type: "manual" | "scheduled";
    path: string;
    name: string;
    id: number;
    size: number;
    created: string;
}, {
    type: "manual" | "scheduled";
    path: string;
    name: string;
    id: number;
    size: number;
    created: string;
}>;
declare const backupScheduleSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    interval: z.ZodEnum<["hourly", "daily", "weekly", "monthly"]>;
    retentionDays: z.ZodNumber;
    nextBackup: z.ZodString;
    lastBackup: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    interval: "daily" | "weekly" | "hourly" | "monthly";
    retentionDays: number;
    nextBackup: string;
    lastBackup: string | null;
}, {
    enabled: boolean;
    interval: "daily" | "weekly" | "hourly" | "monthly";
    retentionDays: number;
    nextBackup: string;
    lastBackup: string | null;
}>;
declare const createBackupResultSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    path: z.ZodString;
    size: z.ZodNumber;
    created: z.ZodString;
    type: z.ZodEnum<["manual", "scheduled"]>;
}, "strip", z.ZodTypeAny, {
    type: "manual" | "scheduled";
    path: string;
    name: string;
    id: number;
    size: number;
    created: string;
}, {
    type: "manual" | "scheduled";
    path: string;
    name: string;
    id: number;
    size: number;
    created: string;
}>;
declare const restoreBackupResultSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    restoredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
    restoredAt: string;
}, {
    name: string;
    id: number;
    restoredAt: string;
}>;
declare const downloadBackupResultSchema: z.ZodObject<{
    downloadUrl: z.ZodString;
    expiresAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    downloadUrl: string;
    expiresAt: string;
}, {
    downloadUrl: string;
    expiresAt: string;
}>;
declare const deleteBackupResultSchema: z.ZodObject<{
    id: z.ZodNumber;
    deleted: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: number;
    deleted: boolean;
}, {
    id: number;
    deleted: boolean;
}>;
declare const updateBackupScheduleInputSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    interval: z.ZodEnum<["hourly", "daily", "weekly", "monthly"]>;
    retentionDays: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    interval: "daily" | "weekly" | "hourly" | "monthly";
    retentionDays: number;
}, {
    enabled: boolean;
    interval: "daily" | "weekly" | "hourly" | "monthly";
    retentionDays: number;
}>;
export type Backup = z.infer<typeof backupSchema>;
export type BackupType = z.infer<typeof backupTypeSchema>;
export type BackupSchedule = z.infer<typeof backupScheduleSchema>;
export type UpdateBackupScheduleInput = z.infer<typeof updateBackupScheduleInputSchema>;
export type RestoreBackupResult = z.infer<typeof restoreBackupResultSchema>;
export type DownloadBackupResult = z.infer<typeof downloadBackupResultSchema>;
export type DeleteBackupResult = z.infer<typeof deleteBackupResultSchema>;
export declare function createBackupApi(client: ApiHttpClient): {
    getBackups(): Promise<Backup[]>;
    createBackup(): Promise<z.infer<typeof createBackupResultSchema>>;
    getBackupSchedule(): Promise<BackupSchedule>;
    updateBackupSchedule(input: UpdateBackupScheduleInput): Promise<BackupSchedule>;
    restoreBackup(id: number): Promise<RestoreBackupResult>;
    downloadBackup(id: number): Promise<DownloadBackupResult>;
    deleteBackup(id: number): Promise<DeleteBackupResult>;
};
export {};
//# sourceMappingURL=backupApi.d.ts.map