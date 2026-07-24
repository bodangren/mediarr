import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import {
  backupSchema,
  backupScheduleSchema,
  deleteBackupResultSchema,
  downloadBackupResultSchema,
  restoreBackupResultSchema,
  type Backup,
  type BackupSchedule,
  type DeleteBackupResult,
  type DownloadBackupResult,
  type RestoreBackupResult,
  type UpdateBackupScheduleInput,
} from '@server/contracts/backup';

export type {
  Backup,
  BackupSchedule,
  BackupType,
  DeleteBackupResult,
  DownloadBackupResult,
  RestoreBackupResult,
  UpdateBackupScheduleInput,
} from '@server/contracts/backup';

export function createBackupApi(client: ApiHttpClient) {
  return {
    // Get all backups
    getBackups(): Promise<Backup[]> {
      return client.request(
        {
          path: '/api/backups',
        },
        z.array(backupSchema),
      );
    },

    // Create a new manual backup
    createBackup(): Promise<Backup> {
      return client.request(
        {
          path: '/api/backups',
          method: 'POST',
        },
        backupSchema,
      );
    },

    // Get backup schedule settings
    getBackupSchedule(): Promise<BackupSchedule> {
      return client.request(
        {
          path: '/api/backups/schedule',
        },
        backupScheduleSchema,
      );
    },

    // Update backup schedule settings
    updateBackupSchedule(input: UpdateBackupScheduleInput): Promise<BackupSchedule> {
      return client.request(
        {
          path: '/api/backups/schedule',
          method: 'PATCH',
          body: input,
        },
        backupScheduleSchema,
      );
    },

    // Restore from a backup
    restoreBackup(id: string): Promise<RestoreBackupResult> {
      return client.request(
        {
          path: `/api/backups/${id}/restore`,
          method: 'POST',
        },
        restoreBackupResultSchema,
      );
    },

    // Get download URL for a backup
    downloadBackup(id: string): Promise<DownloadBackupResult> {
      return client.request(
        {
          path: `/api/backups/${id}/download`,
          method: 'POST',
        },
        downloadBackupResultSchema,
      );
    },

    // Delete a backup
    deleteBackup(id: string): Promise<DeleteBackupResult> {
      return client.request(
        {
          path: `/api/backups/${id}`,
          method: 'DELETE',
        },
        deleteBackupResultSchema,
      );
    },
  };
}
