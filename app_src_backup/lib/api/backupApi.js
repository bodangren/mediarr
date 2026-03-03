import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
// Backup type enum
const backupTypeSchema = z.enum(['manual', 'scheduled']);
// Backup schema
const backupSchema = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    size: z.number(),
    created: z.string(),
    type: backupTypeSchema,
});
// Backup schedule schema
const backupScheduleSchema = z.object({
    enabled: z.boolean(),
    interval: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
    retentionDays: z.number(),
    nextBackup: z.string(),
    lastBackup: z.string().nullable(),
});
// Create backup response schema
const createBackupResultSchema = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    size: z.number(),
    created: z.string(),
    type: backupTypeSchema,
});
// Restore backup result schema
const restoreBackupResultSchema = z.object({
    id: z.number(),
    name: z.string(),
    restoredAt: z.string(),
});
// Download backup result schema
const downloadBackupResultSchema = z.object({
    downloadUrl: z.string(),
    expiresAt: z.string(),
});
// Delete backup result schema
const deleteBackupResultSchema = z.object({
    id: z.number(),
    deleted: z.boolean(),
});
// Update backup schedule input schema
const updateBackupScheduleInputSchema = z.object({
    enabled: z.boolean(),
    interval: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
    retentionDays: z.number(),
});
export function createBackupApi(client) {
    return {
        // Get all backups
        getBackups() {
            return client.request({
                path: '/api/backups',
            }, z.array(backupSchema));
        },
        // Create a new manual backup
        createBackup() {
            return client.request({
                path: '/api/backups',
                method: 'POST',
            }, createBackupResultSchema);
        },
        // Get backup schedule settings
        getBackupSchedule() {
            return client.request({
                path: '/api/backups/schedule',
            }, backupScheduleSchema);
        },
        // Update backup schedule settings
        updateBackupSchedule(input) {
            return client.request({
                path: '/api/backups/schedule',
                method: 'PATCH',
                body: input,
            }, backupScheduleSchema);
        },
        // Restore from a backup
        restoreBackup(id) {
            return client.request({
                path: `/api/backups/${id}/restore`,
                method: 'POST',
            }, restoreBackupResultSchema);
        },
        // Get download URL for a backup
        downloadBackup(id) {
            return client.request({
                path: `/api/backups/${id}/download`,
                method: 'POST',
            }, downloadBackupResultSchema);
        },
        // Delete a backup
        deleteBackup(id) {
            return client.request({
                path: `/api/backups/${id}`,
                method: 'DELETE',
            }, deleteBackupResultSchema);
        },
    };
}
//# sourceMappingURL=backupApi.js.map