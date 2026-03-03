import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
// Current version schema
const currentVersionSchema = z.object({
    version: z.string(),
    branch: z.string(),
    commit: z.string(),
    buildDate: z.string(),
});
// Available update schema
const availableUpdateSchema = z.object({
    available: z.boolean(),
    version: z.string().optional(),
    releaseDate: z.string().optional(),
    changelog: z.string().optional(),
    downloadUrl: z.string().optional(),
});
// Update history entry schema
const updateHistoryEntrySchema = z.object({
    id: z.number(),
    version: z.string(),
    installedDate: z.string(),
    status: z.enum(['success', 'failed']),
    branch: z.string(),
});
// Check for updates result schema
const checkUpdatesResultSchema = z.object({
    checked: z.boolean(),
    timestamp: z.string(),
});
// Install update result schema
const installUpdateResultSchema = z.object({
    updateId: z.string(),
    version: z.string(),
    startedAt: z.string(),
    status: z.enum(['started', 'queued']),
});
// Update progress schema
const updateProgressSchema = z.object({
    updateId: z.string(),
    version: z.string(),
    status: z.enum(['queued', 'downloading', 'installing', 'completed', 'failed']),
    progress: z.number().min(0).max(100),
    message: z.string(),
    startedAt: z.string(),
    completedAt: z.string().optional(),
    estimatedTimeRemaining: z.number().optional(),
    error: z.string().optional(),
});
export function createUpdatesApi(client) {
    return {
        // Get current version information
        getCurrentVersion() {
            return client.request({
                path: routeMap.updatesCurrent,
            }, currentVersionSchema);
        },
        // Get available updates
        getAvailableUpdates() {
            return client.request({
                path: routeMap.updatesAvailable,
            }, availableUpdateSchema);
        },
        // Get update history
        getUpdateHistory(query = {}) {
            return client.requestPaginated({
                path: routeMap.updatesHistory,
                query,
            }, updateHistoryEntrySchema);
        },
        // Check for updates
        checkForUpdates() {
            return client.request({
                path: routeMap.updatesCheck,
                method: 'POST',
            }, checkUpdatesResultSchema);
        },
        // Install an update
        installUpdate(version) {
            return client.request({
                path: routeMap.updatesInstall,
                method: 'POST',
                body: { version },
            }, installUpdateResultSchema);
        },
        // Get update progress
        getUpdateProgress(updateId) {
            return client.request({
                path: routeMap.updatesProgress(updateId),
            }, updateProgressSchema);
        },
    };
}
//# sourceMappingURL=updatesApi.js.map