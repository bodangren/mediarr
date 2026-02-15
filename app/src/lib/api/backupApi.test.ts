import { describe, expect, it, vi } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { createBackupApi } from './backupApi';

describe('BackupApi', () => {
  describe('getBackups', () => {
    it('should fetch all backups', async () => {
      const mockRequest = vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'manual-backup-20260215',
          path: '/backups/manual-backup-20260215.zip',
          size: 10485760,
          created: '2026-02-15T10:00:00.000Z',
          type: 'manual',
        },
        {
          id: 2,
          name: 'scheduled-backup-20260214',
          path: '/backups/scheduled-backup-20260214.zip',
          size: 10484736,
          created: '2026-02-14T02:00:00.000Z',
          type: 'scheduled',
        },
      ]);

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createBackupApi(client);

      const result = await api.getBackups();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/backups',
        },
        expect.any(Object),
      );
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('manual-backup-20260215');
      expect(result[0].type).toBe('manual');
    });
  });

  describe('createBackup', () => {
    it('should create a new manual backup', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        id: 3,
        name: 'manual-backup-20260215-2',
        path: '/backups/manual-backup-20260215-2.zip',
        size: 10486840,
        created: '2026-02-15T11:00:00.000Z',
        type: 'manual',
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createBackupApi(client);

      const result = await api.createBackup();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/backups',
          method: 'POST',
        },
        expect.any(Object),
      );
      expect(result.name).toContain('manual-backup');
      expect(result.type).toBe('manual');
    });
  });

  describe('getBackupSchedule', () => {
    it('should fetch backup schedule', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        enabled: true,
        interval: 'weekly',
        retentionDays: 30,
        nextBackup: '2026-02-22T02:00:00.000Z',
        lastBackup: '2026-02-15T02:00:00.000Z',
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createBackupApi(client);

      const result = await api.getBackupSchedule();

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/backups/schedule',
        },
        expect.any(Object),
      );
      expect(result.enabled).toBe(true);
      expect(result.interval).toBe('weekly');
      expect(result.retentionDays).toBe(30);
    });
  });

  describe('updateBackupSchedule', () => {
    it('should update backup schedule', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        enabled: true,
        interval: 'daily',
        retentionDays: 14,
        nextBackup: '2026-02-16T02:00:00.000Z',
        lastBackup: '2026-02-15T02:00:00.000Z',
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createBackupApi(client);

      const result = await api.updateBackupSchedule({
        enabled: true,
        interval: 'daily',
        retentionDays: 14,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/backups/schedule',
          method: 'PATCH',
          body: {
            enabled: true,
            interval: 'daily',
            retentionDays: 14,
          },
        },
        expect.any(Object),
      );
      expect(result.interval).toBe('daily');
      expect(result.retentionDays).toBe(14);
    });
  });

  describe('restoreBackup', () => {
    it('should restore from a backup', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        id: 1,
        name: 'manual-backup-20260215',
        restoredAt: '2026-02-15T11:30:00.000Z',
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createBackupApi(client);

      const result = await api.restoreBackup(1);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/backups/1/restore',
          method: 'POST',
        },
        expect.any(Object),
      );
      expect(result.name).toBe('manual-backup-20260215');
    });
  });

  describe('downloadBackup', () => {
    it('should get download URL for a backup', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        downloadUrl: '/api/backups/1/download',
        expiresAt: '2026-02-15T12:00:00.000Z',
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createBackupApi(client);

      const result = await api.downloadBackup(1);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/backups/1/download',
          method: 'POST',
        },
        expect.any(Object),
      );
      expect(result.downloadUrl).toBe('/api/backups/1/download');
    });
  });

  describe('deleteBackup', () => {
    it('should delete a backup', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        id: 1,
        deleted: true,
      });

      const client = new ApiHttpClient({});
      client.request = mockRequest;
      const api = createBackupApi(client);

      const result = await api.deleteBackup(1);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          path: '/api/backups/1',
          method: 'DELETE',
        },
        expect.any(Object),
      );
      expect(result.deleted).toBe(true);
    });
  });
});
