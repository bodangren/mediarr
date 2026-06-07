import fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { sql } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';

const execAsync = promisify(exec);

export type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown';

export interface DiskSpaceEntry {
  path: string;
  label: string;
  free: number;
  total: number;
}

export interface ProcessInfo {
  version: string;
  os: string;
  isLinux: boolean;
  isWindows: boolean;
  isDocker: boolean;
  startTime: string;
  uptime: number;
}

export interface DatabaseCheckResult {
  status: HealthStatus;
  message: string;
  version?: string;
  migration?: string;
  location?: string;
}

export interface PathHealthCheck {
  type: string;
  source: string;
  message: string;
  status: HealthStatus;
  lastChecked: string;
}

export interface FFmpegInfo {
  version: string | undefined;
  status: HealthStatus;
}

/**
 * Provides real, live system health data to replace hardcoded stubs.
 *
 * All methods are safe to call concurrently and swallow non-critical errors,
 * returning a degraded-but-informative result rather than throwing.
 */
export class SystemHealthService {
  private readonly startTime: Date;

  constructor(
    private readonly db: Pick<DatabaseClient, 'db'>,
    startTime?: Date,
  ) {
    this.startTime = startTime ?? new Date();
  }

  /**
   * Returns disk space information for the given paths using `fs.statfs()`.
   * Falls back to zeros for paths that are inaccessible (ENOENT / EACCES).
   */
  async getDiskSpace(paths: Array<{ path: string; label: string }>): Promise<DiskSpaceEntry[]> {
    const results: DiskSpaceEntry[] = [];

    for (const entry of paths) {
      try {
        const stats = await (fs as any).statfs(entry.path) as {
          bsize: number;
          blocks: number;
          bfree: number;
          bavail: number;
        };
        const blockSize = stats.bsize;
        results.push({
          path: entry.path,
          label: entry.label,
          free: stats.bavail * blockSize,
          total: stats.blocks * blockSize,
        });
      } catch {
        results.push({ path: entry.path, label: entry.label, free: 0, total: 0 });
      }
    }

    return results;
  }

  /**
   * Returns real process information: version, platform, uptime.
   */
  getProcessInfo(): ProcessInfo {
    const uptime = Math.floor(process.uptime());
    return {
      version: process.version,
      os: process.platform,
      isLinux: process.platform === 'linux',
      isWindows: process.platform === 'win32',
      isDocker: this.isRunningInDocker(),
      startTime: this.startTime.toISOString(),
      uptime,
    };
  }

  /**
   * Checks that the database is reachable via a lightweight `SELECT 1` query.
   */
  async checkDatabase(): Promise<DatabaseCheckResult> {
    try {
      await this.db.db.all(sql`SELECT 1`);
      const versionRows = await this.db.db.all<{ sqlite_version: string }>(
        sql`SELECT sqlite_version() AS sqlite_version`,
      );
      const sqliteVersion = versionRows?.[0]?.sqlite_version ?? 'unknown';

      let latestMigration = 'unknown';
      try {
        const migrationRows = await this.db.db.all<{ hash: string }>(
          sql`SELECT hash FROM "__drizzle_migrations" ORDER BY "created_at" DESC LIMIT 1`,
        );
        latestMigration = migrationRows?.[0]?.hash ?? 'unknown';
      } catch {
        // __drizzle_migrations table may not exist
      }

      return {
        status: 'ok',
        message: 'Database is healthy',
        version: sqliteVersion,
        migration: latestMigration,
        location: process.env.DATABASE_URL?.replace(/^file:/, '') ?? 'unknown',
      };
    } catch (err) {
      return {
        status: 'error',
        message: `Database check failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Checks that each path exists and is readable.
   */
  async checkRootFolders(
    paths: Array<{ path: string; label: string }>,
  ): Promise<PathHealthCheck[]> {
    const now = new Date().toISOString();
    const results: PathHealthCheck[] = [];

    for (const entry of paths) {
      try {
        await fs.access(entry.path, fs.constants.R_OK);
        results.push({
          type: 'rootFolder',
          source: entry.label,
          message: `${entry.label} is accessible`,
          status: 'ok',
          lastChecked: now,
        });
      } catch {
        results.push({
          type: 'rootFolder',
          source: entry.label,
          message: `${entry.label} is not accessible: ${entry.path}`,
          status: 'error',
          lastChecked: now,
        });
      }
    }

    return results;
  }

  /**
   * Attempts to detect FFmpeg and parse its version string.
   * Returns status 'unknown' if not installed.
   */
  async detectFFmpeg(): Promise<FFmpegInfo> {
    try {
      const { stdout } = await execAsync('ffmpeg -version', { timeout: 5000 });
      const match = stdout.match(/ffmpeg version\s+([^\s]+)/i);
      const version = match?.[1];
      return { version, status: 'ok' };
    } catch {
      return { version: undefined, status: 'unknown' };
    }
  }

  /** Heuristic: check for /.dockerenv presence. */
  private isRunningInDocker(): boolean {
    try {
      require('node:fs').accessSync('/.dockerenv');
      return true;
    } catch {
      return false;
    }
  }
}
