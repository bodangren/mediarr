import { z } from 'zod';

export const backupTypeSchema = z.enum(['manual', 'scheduled']);

export const backupSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  size: z.number().nonnegative(),
  created: z.string(),
  type: backupTypeSchema,
});

export const backupScheduleSchema = z.object({
  supported: z.boolean(),
  enabled: z.boolean(),
  interval: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  retentionDays: z.number().int().positive(),
  nextBackup: z.string().nullable(),
  lastBackup: z.string().nullable(),
});

export const updateBackupScheduleInputSchema = z.object({
  enabled: z.boolean(),
  interval: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  retentionDays: z.number().int().positive(),
});

export const restoreBackupResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  restoredAt: z.string(),
  restartRequired: z.literal(true),
  safetyBackupId: z.string(),
});

export const downloadBackupResultSchema = z.object({
  downloadUrl: z.string(),
});

export const deleteBackupResultSchema = z.object({
  id: z.string(),
  deleted: z.boolean(),
});

export type Backup = z.infer<typeof backupSchema>;
export type BackupType = z.infer<typeof backupTypeSchema>;
export type BackupSchedule = z.infer<typeof backupScheduleSchema>;
export type UpdateBackupScheduleInput = z.infer<typeof updateBackupScheduleInputSchema>;
export type RestoreBackupResult = z.infer<typeof restoreBackupResultSchema>;
export type DownloadBackupResult = z.infer<typeof downloadBackupResultSchema>;
export type DeleteBackupResult = z.infer<typeof deleteBackupResultSchema>;
