import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock factories ───────────────────────────────────────────────────
const { mockStatfs, mockAccess, mockExec } = vi.hoisted(() => ({
  mockStatfs: vi.fn(),
  mockAccess: vi.fn(),
  mockExec: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    statfs: mockStatfs,
    access: mockAccess,
    constants: { R_OK: 4 },
  },
  statfs: mockStatfs,
  access: mockAccess,
  constants: { R_OK: 4 },
}));

// Mock child_process.exec so promisify wraps the mock properly
vi.mock('node:child_process', () => ({
  exec: mockExec,
}));

// ── Import after mocks ───────────────────────────────────────────────────────
import { SystemHealthService } from './SystemHealthService';

// ── Mock Prisma helper ───────────────────────────────────────────────────────
function makePrisma(impl?: () => Promise<unknown>) {
  return { $queryRaw: impl ?? vi.fn().mockResolvedValue([{ '1': 1 }]) };
}

describe('SystemHealthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getDiskSpace ────────────────────────────────────────────────────────────
  describe('getDiskSpace', () => {
    it('returns real disk usage when statfs succeeds', async () => {
      mockStatfs.mockResolvedValue({ bsize: 4096, blocks: 1000, bfree: 500, bavail: 400 });

      const svc = new SystemHealthService(makePrisma() as any);
      const result = await svc.getDiskSpace([{ path: '/data', label: 'Data Directory' }]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '/data',
        label: 'Data Directory',
        free: 400 * 4096,
        total: 1000 * 4096,
      });
    });

    it('falls back to zeros when statfs throws ENOENT', async () => {
      mockStatfs.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const svc = new SystemHealthService(makePrisma() as any);
      const result = await svc.getDiskSpace([{ path: '/missing', label: 'Missing' }]);

      expect(result[0]).toEqual({ path: '/missing', label: 'Missing', free: 0, total: 0 });
    });

    it('returns entries for multiple paths independently', async () => {
      mockStatfs
        .mockResolvedValueOnce({ bsize: 512, blocks: 2000, bfree: 1000, bavail: 900 })
        .mockRejectedValueOnce(new Error('EACCES'));

      const svc = new SystemHealthService(makePrisma() as any);
      const result = await svc.getDiskSpace([
        { path: '/data', label: 'Data' },
        { path: '/locked', label: 'Locked' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].total).toBe(2000 * 512);
      expect(result[1].total).toBe(0);
    });
  });

  // ── getProcessInfo ──────────────────────────────────────────────────────────
  describe('getProcessInfo', () => {
    it('returns real process.version and platform', () => {
      const svc = new SystemHealthService(makePrisma() as any);
      const info = svc.getProcessInfo();

      expect(info.version).toBe(process.version);
      expect(info.os).toBe(process.platform);
      expect(info.isLinux).toBe(process.platform === 'linux');
      expect(info.isWindows).toBe(process.platform === 'win32');
    });

    it('uses provided startTime and returns non-negative uptime', () => {
      const fixedStart = new Date(Date.now() - 5000);
      const svc = new SystemHealthService(makePrisma() as any, fixedStart);
      const info = svc.getProcessInfo();

      expect(info.startTime).toBe(fixedStart.toISOString());
      expect(info.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // ── checkDatabase ───────────────────────────────────────────────────────────
  describe('checkDatabase', () => {
    it('returns ok status when all queries succeed', async () => {
      const prisma = {
        $queryRaw: vi.fn()
          .mockResolvedValueOnce([{ '1': 1 }])
          .mockResolvedValueOnce([{ sqlite_version: '3.45.1' }])
          .mockResolvedValueOnce([{ migration_name: '20260101_init' }]),
      };

      const svc = new SystemHealthService(prisma as any);
      const result = await svc.checkDatabase();

      expect(result.status).toBe('ok');
      expect(result.message).toBe('Database is healthy');
      expect(result.version).toBe('3.45.1');
      expect(result.migration).toBe('20260101_init');
    });

    it('returns ok even when migration table query fails', async () => {
      const prisma = {
        $queryRaw: vi.fn()
          .mockResolvedValueOnce([{ '1': 1 }])
          .mockResolvedValueOnce([{ sqlite_version: '3.44.0' }])
          .mockRejectedValueOnce(new Error('no such table: _prisma_migrations')),
      };

      const svc = new SystemHealthService(prisma as any);
      const result = await svc.checkDatabase();

      expect(result.status).toBe('ok');
      expect(result.migration).toBe('unknown');
    });

    it('returns error status when SELECT 1 fails', async () => {
      const prisma = {
        $queryRaw: vi.fn().mockRejectedValue(new Error('SQLITE_CANTOPEN')),
      };

      const svc = new SystemHealthService(prisma as any);
      const result = await svc.checkDatabase();

      expect(result.status).toBe('error');
      expect(result.message).toContain('SQLITE_CANTOPEN');
    });
  });

  // ── checkRootFolders ────────────────────────────────────────────────────────
  describe('checkRootFolders', () => {
    it('returns ok for accessible paths', async () => {
      mockAccess.mockResolvedValue(undefined);

      const svc = new SystemHealthService(makePrisma() as any);
      const results = await svc.checkRootFolders([{ path: '/data/media', label: 'Media Root' }]);

      expect(results[0].status).toBe('ok');
      expect(results[0].message).toContain('accessible');
    });

    it('returns error for inaccessible paths', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error('EACCES'), { code: 'EACCES' }));

      const svc = new SystemHealthService(makePrisma() as any);
      const results = await svc.checkRootFolders([{ path: '/locked', label: 'Locked Folder' }]);

      expect(results[0].status).toBe('error');
      expect(results[0].message).toContain('not accessible');
    });

    it('handles empty paths array', async () => {
      const svc = new SystemHealthService(makePrisma() as any);
      const results = await svc.checkRootFolders([]);
      expect(results).toHaveLength(0);
    });
  });

  // ── detectFFmpeg ────────────────────────────────────────────────────────────
  describe('detectFFmpeg', () => {
    it('returns version and ok status when ffmpeg is found', async () => {
      // Simulate promisify(exec) resolving
      mockExec.mockImplementation(
        (_cmd: string, _opts: unknown, cb: (err: null, res: { stdout: string; stderr: string }) => void) => {
          const callback = typeof _opts === 'function' ? (_opts as typeof cb) : cb;
          callback(null, {
            stdout: 'ffmpeg version 6.1.1 Copyright (C) 2000-2023 the FFmpeg developers\n',
            stderr: '',
          });
        },
      );

      const svc = new SystemHealthService(makePrisma() as any);
      const result = await svc.detectFFmpeg();

      expect(result.status).toBe('ok');
      expect(result.version).toBe('6.1.1');
    });

    it('returns unknown status when ffmpeg is not installed', async () => {
      mockExec.mockImplementation(
        (_cmd: string, _opts: unknown, cb: (err: Error, res?: unknown) => void) => {
          const callback = typeof _opts === 'function' ? (_opts as typeof cb) : cb;
          callback(Object.assign(new Error('command not found: ffmpeg'), { code: 127 }));
        },
      );

      const svc = new SystemHealthService(makePrisma() as any);
      const result = await svc.detectFFmpeg();

      expect(result.status).toBe('unknown');
      expect(result.version).toBeUndefined();
    });

    it('returns ok with undefined version when output does not match pattern', async () => {
      mockExec.mockImplementation(
        (_cmd: string, _opts: unknown, cb: (err: null, res: { stdout: string; stderr: string }) => void) => {
          const callback = typeof _opts === 'function' ? (_opts as typeof cb) : cb;
          callback(null, { stdout: 'some unexpected output', stderr: '' });
        },
      );

      const svc = new SystemHealthService(makePrisma() as any);
      const result = await svc.detectFFmpeg();

      expect(result.status).toBe('ok');
      expect(result.version).toBeUndefined();
    });
  });
});
