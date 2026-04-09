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
  checksum: z.string().optional(),
  assetName: z.string().optional(),
});

// Update history entry schema
const updateHistoryEntrySchema = z.object({
  id: z.number(),
  version: z.string(),
  installedDate: z.string(),
  status: z.enum(['success', 'failed']),
  branch: z.string(),
  message: z.string().optional(),
});

// Check for updates result schema
const checkUpdatesResultSchema = z.object({
  checked: z.boolean(),
  timestamp: z.string(),
  available: z.boolean().optional(),
  checkedAt: z.string().optional(),
  currentVersion: z.string().optional(),
  updateAvailable: z.boolean().optional(),
  isDocker: z.boolean().optional(),
  release: z.object({
    version: z.string(),
    tagName: z.string(),
    changelog: z.string(),
    publishedAt: z.string(),
    downloadUrl: z.string(),
    assetName: z.string(),
    assetContentType: z.string(),
    expectedChecksum: z.string().nullable(),
  }).nullable().optional(),
});

// Download update result schema
const downloadUpdateResultSchema = z.object({
  updateId: z.string(),
  version: z.string(),
  status: z.enum(['queued', 'downloading', 'verifying', 'installing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  bytesDownloaded: z.number().min(0),
  totalBytes: z.number().nullable(),
  message: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  stagedPath: z.string().optional(),
  error: z.string().optional(),
});

// Install update result schema
const installUpdateResultSchema = z.object({
  mode: z.enum(['docker', 'binary']),
  status: z.enum(['restart_required', 'installed']),
  version: z.string(),
  message: z.string(),
  command: z.string().optional(),
});

// Update progress schema
const updateProgressSchema = z.object({
  updateId: z.string(),
  version: z.string(),
  status: z.enum(['queued', 'downloading', 'verifying', 'installing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  bytesDownloaded: z.number().min(0),
  totalBytes: z.number().nullable(),
  message: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  stagedPath: z.string().optional(),
  error: z.string().optional(),
});

export type CurrentVersion = z.infer<typeof currentVersionSchema>;
export type AvailableUpdate = z.infer<typeof availableUpdateSchema>;
export type UpdateHistoryEntry = z.infer<typeof updateHistoryEntrySchema>;
export type CheckUpdatesResult = z.infer<typeof checkUpdatesResultSchema>;
export type DownloadUpdateResult = z.infer<typeof downloadUpdateResultSchema>;
export type InstallUpdateResult = z.infer<typeof installUpdateResultSchema>;
export type UpdateProgress = z.infer<typeof updateProgressSchema>;

export interface UpdateHistoryQuery {
  page?: number;
  pageSize?: number;
}

export function createUpdatesApi(client: ApiHttpClient) {
  return {
    // Get current version information
    getCurrentVersion(): Promise<CurrentVersion> {
      return client.request(
        {
          path: routeMap.updatesCurrent,
        },
        currentVersionSchema,
      );
    },

    // Get available updates
    getAvailableUpdates(): Promise<AvailableUpdate> {
      return client.request(
        {
          path: routeMap.updatesAvailable,
        },
        availableUpdateSchema,
      );
    },

    // Get update history
    getUpdateHistory(
      query: UpdateHistoryQuery = {},
    ): Promise<{ items: UpdateHistoryEntry[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } }> {
      return client.requestPaginated(
        {
          path: routeMap.updatesHistory,
          query,
        },
        updateHistoryEntrySchema,
      );
    },

    // Check for updates
    checkForUpdates(): Promise<CheckUpdatesResult> {
      return client.request(
        {
          path: routeMap.updatesCheck,
        },
        checkUpdatesResultSchema,
      );
    },

    // Download an update
    downloadUpdate(version?: string): Promise<DownloadUpdateResult> {
      return client.request(
        {
          path: routeMap.updatesDownload,
          method: 'POST',
          body: version ? { version } : {},
        },
        downloadUpdateResultSchema,
      );
    },

    // Install an update
    installUpdate(input: string | { version?: string; updateId?: string }): Promise<InstallUpdateResult> {
      const body = typeof input === 'string'
        ? { version: input }
        : {
          version: input.version,
          updateId: input.updateId,
        };

      return client.request(
        {
          path: routeMap.updatesInstall,
          method: 'POST',
          body,
        },
        installUpdateResultSchema,
      );
    },

    // Get update progress
    getUpdateProgress(updateId: string): Promise<UpdateProgress> {
      return client.request(
        {
          path: routeMap.updatesProgress(updateId),
        },
        updateProgressSchema,
      );
    },
  };
}
