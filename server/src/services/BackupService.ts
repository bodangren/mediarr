import fs from 'node:fs/promises';
import path from 'node:path';

export interface BackupEntry {
  id: string;
  name: string;
  filePath: string;
  size: number;
  createdAt: string;
  type: 'manual' | 'scheduled';
}

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

  /** Create a new backup by copying the database file. */
  async create(type: 'manual' | 'scheduled' = 'manual'): Promise<BackupEntry> {
    await this.ensureDir();

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const prefix = type === 'scheduled' ? 'mediarr_backup' : 'manual_backup';
    const name = `${prefix}_${timestamp}.db`;
    const dest = path.join(this.backupDir, name);

    await fs.copyFile(this.dbPath, dest);

    const stat = await fs.stat(dest);
    return {
      id: name,
      name,
      filePath: dest,
      size: stat.size,
      createdAt: now.toISOString(),
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
      const filePath = path.join(this.backupDir, file);
      try {
        const stat = await fs.stat(filePath);
        entries.push({
          id: file,
          name: file,
          filePath,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
          type: file.startsWith('manual_') ? 'manual' : 'scheduled',
        });
      } catch {
        // Skip files we can't stat
      }
    }

    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return entries;
  }

  /** Delete a backup file by its name (id). */
  async delete(id: string): Promise<void> {
    const filePath = this.getFilePath(id);
    await fs.unlink(filePath);
  }

  /**
   * Resolve the absolute path for a backup file by name.
   * Throws if the name contains path traversal characters.
   */
  getFilePath(name: string): string {
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
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
      if (new Date(entry.createdAt).getTime() < cutoff) {
        try {
          await fs.unlink(entry.filePath);
          deleted++;
        } catch {
          // Best-effort
        }
      }
    }
    return deleted;
  }
}
