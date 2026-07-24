import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import BetterSqlite3 from 'better-sqlite3';
import { BackupService } from './BackupService';

let tmpDir: string;
let dbFile: string;
let backupDir: string;
let service: BackupService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-test-'));
  dbFile = path.join(tmpDir, 'test.db');
  backupDir = path.join(tmpDir, 'backups');
  const database = new BetterSqlite3(dbFile);
  database.exec('CREATE TABLE settings (value TEXT NOT NULL); INSERT INTO settings VALUES (\'original\');');
  database.close();
  service = new BackupService(dbFile, backupDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('BackupService', () => {
  it('creates a backup file on disk', async () => {
    const entry = await service.create('manual');
    expect(entry.type).toBe('manual');
    expect(entry.name).toMatch(/manual_backup_/);
    expect(entry.id).toBe(entry.name);
    expect(entry).toHaveProperty('path');
    expect(entry).toHaveProperty('created');
    expect(entry).not.toHaveProperty('filePath');
    expect(entry).not.toHaveProperty('createdAt');
    const stat = await fs.stat(entry.path);
    expect(stat.isFile()).toBe(true);
  });

  it('includes committed WAL pages in the SQLite backup', async () => {
    const database = new BetterSqlite3(dbFile);
    database.pragma('journal_mode = WAL');
    database.pragma('wal_autocheckpoint = 0');
    database.prepare('INSERT INTO settings (value) VALUES (?)').run('wal-only');

    const entry = await service.create('manual');
    database.close();

    const backup = new BetterSqlite3(entry.path, { readonly: true });
    const rows = backup.prepare('SELECT value FROM settings ORDER BY rowid').all() as Array<{ value: string }>;
    backup.close();
    expect(rows.map(row => row.value)).toEqual(['original', 'wal-only']);
  });

  it('lists created backup files', async () => {
    await service.create('manual');
    await service.create('scheduled');
    const entries = await service.list();
    expect(entries).toHaveLength(2);
  });

  it('returns entries newest-first', async () => {
    const a = await service.create('manual');
    // Slight delay so timestamps differ
    await new Promise(r => setTimeout(r, 10));
    const b = await service.create('scheduled');
    const list = await service.list();
    expect(list[0]?.name).toBe(b.name);
    expect(list[1]?.name).toBe(a.name);
  });

  it('deletes a backup file', async () => {
    const entry = await service.create('manual');
    await service.delete(entry.id);
    const list = await service.list();
    expect(list).toHaveLength(0);
  });

  it('restores the selected SQLite backup into the live database file', async () => {
    const entry = await service.create('manual');
    const changed = new BetterSqlite3(dbFile);
    changed.prepare('UPDATE settings SET value = ?').run('changed');
    changed.close();

    const result = await service.restore(entry.id);

    const restored = new BetterSqlite3(dbFile, { readonly: true });
    const row = restored.prepare('SELECT value FROM settings').get() as { value: string };
    restored.close();
    expect(row.value).toBe('original');
    expect(result).toMatchObject({
      id: entry.id,
      name: entry.name,
      restartRequired: true,
    });
  });

  it('restores safely while the production-style WAL connection remains open', async () => {
    const entry = await service.create('manual');
    const liveDatabase = new BetterSqlite3(dbFile);
    liveDatabase.pragma('journal_mode = WAL');
    liveDatabase.prepare('UPDATE settings SET value = ?').run('live-change');

    try {
      await service.restore(entry.id);
      expect(liveDatabase.prepare('SELECT value FROM settings').pluck().get()).toBe('original');
      expect(liveDatabase.pragma('integrity_check', { simple: true })).toBe('ok');
    } finally {
      liveDatabase.close();
    }
  });

  it('reports scheduling as unsupported and rejects attempts to enable it', async () => {
    await expect(service.getSchedule()).resolves.toEqual({
      supported: false,
      enabled: false,
      interval: 'daily',
      retentionDays: 30,
      nextBackup: null,
      lastBackup: null,
    });

    await expect(service.updateSchedule({
      enabled: true,
      interval: 'daily',
      retentionDays: 30,
    })).rejects.toThrow('Automatic backup scheduling is not configured');
  });

  it('throws on path traversal in getFilePath', () => {
    expect(() => service.getFilePath('../etc/passwd')).toThrow();
    expect(() => service.getFilePath('../../secret')).toThrow();
  });

  it('getFilePath returns path within backup dir', () => {
    const p = service.getFilePath('my-backup.db');
    expect(p).toBe(path.join(backupDir, 'my-backup.db'));
  });

  it('applies retention policy and removes old files', async () => {
    await service.create('manual');
    // Apply 0-day retention to delete everything
    const deleted = await service.applyRetention(0);
    expect(deleted).toBeGreaterThanOrEqual(1);
    const list = await service.list();
    expect(list).toHaveLength(0);
  });
});
