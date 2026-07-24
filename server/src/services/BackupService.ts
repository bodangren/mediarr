import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import {
  type Backup,
  type BackupSchedule,
  type BackupType,
  type RestoreBackupResult,
  type UpdateBackupScheduleInput,
} from '../contracts/backup';
import { NotFoundError, ValidationError } from '../errors/domainErrors';

export type BackupEntry = Backup;

/**
 * Manages real SQLite database backups on disk.
 */
export class BackupService {
  constructor(
    /** Absolute path to the SQLite database file (without `file:` prefix). */
    private readonly dbPath: string,
    /** Directory where backup files are stored. */
    private readonly backupDir: string,
  ) {}

  /** Ensure the backup directory exists. */
  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  /** Create a transactionally consistent backup with SQLite's online backup API. */
  async create(type: BackupType = 'manual'): Promise<BackupEntry> {
    await this.ensureDir();

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 23);
    const prefix = type === 'scheduled' ? 'mediarr_backup' : 'manual_backup';
    const name = `${prefix}_${timestamp}_${randomUUID().slice(0, 8)}.db`;
    const dest = path.join(this.backupDir, name);

    const database = new BetterSqlite3(this.dbPath, { fileMustExist: true });
    try {
      await database.backup(dest);
    } finally {
      database.close();
    }

    await this.assertIntegrity(dest);

    const stat = await fs.stat(dest);
    return {
      id: name,
      name,
      path: dest,
      size: stat.size,
      created: now.toISOString(),
      type,
    };
  }

  /** List all backup files in the backup directory, newest first. */
  async list(): Promise<BackupEntry[]> {
    await this.ensureDir();

    let files: string[];
    try {
      files = await fs.readdir(this.backupDir);
    } catch {
      return [];
    }

    const entries: BackupEntry[] = [];
    for (const file of files) {
      if (!file.endsWith('.db') && !file.endsWith('.zip')) continue;
      try {
        entries.push(await this.get(file));
      } catch {
        // Skip files we can't stat
      }
    }

    entries.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    return entries;
  }

  /** Return metadata for one existing backup. */
  async get(id: string): Promise<BackupEntry> {
    const backupPath = this.getFilePath(id);
    let stat;
    try {
      stat = await fs.stat(backupPath);
    } catch {
      throw new NotFoundError(`Backup '${id}' not found`);
    }

    if (!stat.isFile()) {
      throw new NotFoundError(`Backup '${id}' not found`);
    }

    return {
      id,
      name: id,
      path: backupPath,
      size: stat.size,
      created: stat.birthtime.toISOString(),
      type: id.startsWith('manual_') ? 'manual' : 'scheduled',
    };
  }

  /** Delete a backup file by its name (id). */
  async delete(id: string): Promise<void> {
    const filePath = this.getFilePath(id);
    await fs.unlink(filePath);
  }

  /** Restore a validated backup with SQLite's online backup API. */
  async restore(id: string): Promise<RestoreBackupResult> {
    const selected = await this.get(id);
    await this.assertIntegrity(selected.path);
    const safetyBackup = await this.create('manual');

    const currentDatabase = new BetterSqlite3(this.dbPath, { fileMustExist: true });
    try {
      currentDatabase.pragma('wal_checkpoint(TRUNCATE)');
    } finally {
      currentDatabase.close();
    }

    const backupDatabase = new BetterSqlite3(selected.path, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      await backupDatabase.backup(this.dbPath);
    } finally {
      backupDatabase.close();
    }

    await this.assertIntegrity(this.dbPath);
    return {
      id: selected.id,
      name: selected.name,
      restoredAt: new Date().toISOString(),
      restartRequired: true,
      safetyBackupId: safetyBackup.id,
    };
  }

  /** Report the honest schedule capability until a scheduler is composed. */
  async getSchedule(): Promise<BackupSchedule> {
    const latestScheduled = (await this.list()).find(entry => entry.type === 'scheduled');
    return {
      supported: false,
      enabled: false,
      interval: 'daily',
      retentionDays: 30,
      nextBackup: null,
      lastBackup: latestScheduled?.created ?? null,
    };
  }

  /** Reject fabricated scheduling; disabling remains an idempotent truthful operation. */
  async updateSchedule(input: UpdateBackupScheduleInput): Promise<BackupSchedule> {
    if (input.enabled) {
      throw new ValidationError(
        'Automatic backup scheduling is not configured in this deployment',
      );
    }

    return this.getSchedule();
  }

  /**
   * Resolve the absolute path for a backup file by name.
   * Throws if the name contains path traversal characters.
   */
  getFilePath(name: string): string {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:db|zip)$/.test(name) || name.includes('..')) {
      throw new Error(`Invalid backup name: ${name}`);
    }
    return path.join(this.backupDir, name);
  }

  /** Apply retention policy: delete files older than retentionDays. */
  async applyRetention(retentionDays: number): Promise<number> {
    const entries = await this.list();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let deleted = 0;
    for (const entry of entries) {
      if (retentionDays === 0 || new Date(entry.created).getTime() < cutoff) {
        try {
          await fs.unlink(entry.path);
          deleted++;
        } catch {
          // Best-effort
        }
      }
    }
    return deleted;
  }

  private async assertIntegrity(databasePath: string): Promise<void> {
    const database = new BetterSqlite3(databasePath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      const result = database.pragma('integrity_check', { simple: true });
      if (result !== 'ok') {
        throw new ValidationError(`SQLite integrity check failed for '${path.basename(databasePath)}'`);
      }
    } finally {
      database.close();
    }
  }
}
