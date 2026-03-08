import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { BackupService } from './BackupService';

let tmpDir: string;
let dbFile: string;
let backupDir: string;
let service: BackupService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-test-'));
  dbFile = path.join(tmpDir, 'test.db');
  backupDir = path.join(tmpDir, 'backups');
  // Create a dummy database file
  await fs.writeFile(dbFile, 'SQLite format 3\0', 'utf-8');
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
    const stat = await fs.stat(entry.filePath);
    expect(stat.isFile()).toBe(true);
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
