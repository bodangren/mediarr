import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inferRootFolderType } from './mediaUtils';

vi.mock('node:fs', () => {
  const mockStatSync = vi.fn();
  return {
    default: { statSync: mockStatSync },
    statSync: mockStatSync,
  };
});

describe('inferRootFolderType', () => {
  it('returns movie for /data/media/movies', () => {
    expect(inferRootFolderType('/data/media/movies')).toBe('movie');
  });

  it('returns movie for /data/media/movies/', () => {
    expect(inferRootFolderType('/data/media/movies/')).toBe('movie');
  });

  it('returns movie for /mnt/media/Movies', () => {
    expect(inferRootFolderType('/mnt/media/Movies')).toBe('movie');
  });

  it('returns movie for /mnt/media/MOVIES', () => {
    expect(inferRootFolderType('/mnt/media/MOVIES')).toBe('movie');
  });

  it('returns series for /data/media/tv', () => {
    expect(inferRootFolderType('/data/media/tv')).toBe('series');
  });

  it('returns series for /data/media/tv/', () => {
    expect(inferRootFolderType('/data/media/tv/')).toBe('series');
  });

  it('returns series for /mnt/TV Shows', () => {
    expect(inferRootFolderType('/mnt/TV Shows')).toBe('series');
  });

  it('returns series for /mnt/television', () => {
    expect(inferRootFolderType('/mnt/television')).toBe('series');
  });

  it('returns series for /mnt/series', () => {
    expect(inferRootFolderType('/mnt/series')).toBe('series');
  });

  it('returns null for /data/media/other', () => {
    expect(inferRootFolderType('/data/media/other')).toBe(null);
  });

  it('returns null for /data/downloads', () => {
    expect(inferRootFolderType('/data/downloads')).toBe(null);
  });

  it('returns null for empty string', () => {
    expect(inferRootFolderType('')).toBe(null);
  });

  it('returns null for root path', () => {
    expect(inferRootFolderType('/')).toBe(null);
  });

  it('prefers /movies over /tv in mixed paths', () => {
    expect(inferRootFolderType('/data/media/movies-tv')).toBe('movie');
  });

  it('returns series for /data/media/shows', () => {
    expect(inferRootFolderType('/data/media/shows')).toBe('series');
  });
});

describe('isSameVolume', () => {
  let mockFs: typeof import('node:fs');

  beforeEach(async () => {
    mockFs = await import('node:fs');
    vi.clearAllMocks();
  });

  it('returns true when both paths on same device', async () => {
    const { isSameVolume } = await import('./mediaUtils');
    (mockFs.statSync as ReturnType<typeof vi.fn>).mockReturnValueOnce({ dev: 2049 } as any);
    (mockFs.statSync as ReturnType<typeof vi.fn>).mockReturnValueOnce({ dev: 2049 } as any);

    const result = await isSameVolume('/downloads/file.mkv', '/media/movies/file.mkv');
    expect(result).toBe(true);
  });

  it('returns false when paths on different devices', async () => {
    const { isSameVolume } = await import('./mediaUtils');
    (mockFs.statSync as ReturnType<typeof vi.fn>).mockReturnValueOnce({ dev: 2049 } as any);
    (mockFs.statSync as ReturnType<typeof vi.fn>).mockReturnValueOnce({ dev: 2050 } as any);

    const result = await isSameVolume('/downloads/file.mkv', '/media/movies/file.mkv');
    expect(result).toBe(false);
  });

  it('handles paths with special characters', async () => {
    const { isSameVolume } = await import('./mediaUtils');
    (mockFs.statSync as ReturnType<typeof vi.fn>).mockReturnValueOnce({ dev: 2049 } as any);
    (mockFs.statSync as ReturnType<typeof vi.fn>).mockReturnValueOnce({ dev: 2049 } as any);

    const result = await isSameVolume('/downloads/[Team] Movie (2024).mkv', '/media/movies/Movie (2024)/Movie (2024).mkv');
    expect(result).toBe(true);
  });

  it('uses the nearest existing destination ancestor when the destination is absent', async () => {
    const { isSameVolume } = await import('./mediaUtils');
    const missing = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    (mockFs.statSync as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ dev: 2049 } as any)
      .mockImplementationOnce(() => { throw missing; })
      .mockImplementationOnce(() => { throw missing; })
      .mockReturnValueOnce({ dev: 2049 } as any);

    const result = await isSameVolume(
      '/downloads/file.mkv',
      '/media/movies/New Movie/New Movie.mkv',
    );

    expect(result).toBe(true);
    expect(mockFs.statSync).toHaveBeenNthCalledWith(2, '/media/movies/New Movie/New Movie.mkv');
    expect(mockFs.statSync).toHaveBeenNthCalledWith(3, '/media/movies/New Movie');
    expect(mockFs.statSync).toHaveBeenNthCalledWith(4, '/media/movies');
  });
});
