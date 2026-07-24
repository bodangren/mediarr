import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../../services/BackupService';
import type { ApiDependencies } from '../types';
import { registerBackupRoutes } from './backupRoutes';

describe('backup routes with the production BackupService', () => {
  let app: FastifyInstance;
  let tempDirectory: string;
  let databasePath: string;

  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-routes-'));
    databasePath = path.join(tempDirectory, 'mediarr.db');
    const database = new BetterSqlite3(databasePath);
    database.exec('CREATE TABLE settings (value TEXT NOT NULL); INSERT INTO settings VALUES (\'original\');');
    database.close();

    const backupService = new BackupService(
      databasePath,
      path.join(tempDirectory, 'backups'),
    );
    app = Fastify();
    registerBackupRoutes(app, { backupService } as unknown as ApiDependencies);
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  it('creates and lists the shared backup contract', async () => {
    const createdResponse = await app.inject({ method: 'POST', url: '/api/backups' });
    const created = createdResponse.json().data;

    expect(createdResponse.statusCode).toBe(201);
    expect(created).toEqual(expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
      path: expect.any(String),
      size: expect.any(Number),
      created: expect.any(String),
      type: 'manual',
    }));
    expect(created).not.toHaveProperty('filePath');
    expect(created).not.toHaveProperty('createdAt');

    const listedResponse = await app.inject({ method: 'GET', url: '/api/backups' });
    expect(listedResponse.json().data[0].id).toBe(created.id);
  });

  it('serves the selected backup file from the returned download URL', async () => {
    const created = (await app.inject({ method: 'POST', url: '/api/backups' })).json().data;
    const downloadResponse = await app.inject({
      method: 'POST',
      url: `/api/backups/${encodeURIComponent(created.id)}/download`,
    });
    const download = downloadResponse.json().data;

    expect(downloadResponse.statusCode).toBe(200);
    expect(download.downloadUrl).toBe(`/api/backups/${encodeURIComponent(created.id)}/file`);

    const fileResponse = await app.inject({ method: 'GET', url: download.downloadUrl });
    expect(fileResponse.statusCode).toBe(200);
    expect(fileResponse.headers['content-type']).toContain('application/vnd.sqlite3');
    expect(fileResponse.headers['content-disposition']).toContain(created.name);
    expect(fileResponse.rawPayload.subarray(0, 15).toString()).toBe('SQLite format 3');
  });

  it('performs a real restore and returns the restart requirement', async () => {
    const created = (await app.inject({ method: 'POST', url: '/api/backups' })).json().data;
    const changed = new BetterSqlite3(databasePath);
    changed.prepare('UPDATE settings SET value = ?').run('changed');
    changed.close();

    const response = await app.inject({
      method: 'POST',
      url: `/api/backups/${encodeURIComponent(created.id)}/restore`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(expect.objectContaining({
      id: created.id,
      restartRequired: true,
      safetyBackupId: expect.any(String),
    }));
    const restored = new BetterSqlite3(databasePath, { readonly: true });
    expect(restored.prepare('SELECT value FROM settings').pluck().get()).toBe('original');
    restored.close();
  });

  it('reports automatic scheduling as unsupported instead of fabricating dates', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/backups/schedule' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      supported: false,
      enabled: false,
      interval: 'daily',
      retentionDays: 30,
      nextBackup: null,
      lastBackup: null,
    });
  });

  it('accepts an idempotent disabled schedule and rejects enabling unsupported automation', async () => {
    const disabled = await app.inject({
      method: 'PATCH',
      url: '/api/backups/schedule',
      payload: { enabled: false, interval: 'weekly', retentionDays: 14 },
    });
    expect(disabled.statusCode).toBe(200);
    expect(disabled.json().data).toMatchObject({ supported: false, enabled: false });

    const enabled = await app.inject({
      method: 'PATCH',
      url: '/api/backups/schedule',
      payload: { enabled: true, interval: 'weekly', retentionDays: 14 },
    });
    expect(enabled.statusCode).toBe(500);
    expect(enabled.json().message).toContain('Automatic backup scheduling is not configured');
  });

  it('deletes an existing backup through the production service', async () => {
    const created = (await app.inject({ method: 'POST', url: '/api/backups' })).json().data;
    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/backups/${encodeURIComponent(created.id)}`,
    });

    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().data).toEqual({ id: created.id, deleted: true });
    expect((await app.inject({ method: 'GET', url: '/api/backups' })).json().data).toEqual([]);
  });

  it('fails explicitly when the production backup dependency is absent', async () => {
    const unconfiguredApp = Fastify();
    registerBackupRoutes(unconfiguredApp, { prisma: {} } as ApiDependencies);
    try {
      const response = await unconfiguredApp.inject({ method: 'GET', url: '/api/backups' });
      expect(response.statusCode).toBe(500);
      expect(response.json().message).toContain('Backup service is not configured');
    } finally {
      await unconfiguredApp.close();
    }
  });
});
