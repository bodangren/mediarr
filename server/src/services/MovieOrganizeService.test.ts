import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MovieOrganizeService, DEFAULT_MEDIA_MANAGEMENT_SETTINGS } from './MovieOrganizeService';
import type { MediaManagementSettings } from './MovieOrganizeService';

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  rename: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => ({
  default: fsMocks,
}));

import fs from 'node:fs/promises';

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    movie: {
      findUnique: vi.fn().mockResolvedValue(overrides.movie ?? null),
    },
    mediaFileVariant: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function makeSettings(overrides: Partial<MediaManagementSettings> = {}): MediaManagementSettings {
  return { ...DEFAULT_MEDIA_MANAGEMENT_SETTINGS, ...overrides };
}

function buildMovie(data: Record<string, any> = {}) {
  return {
    id: 1,
    title: 'Test Movie',
    year: 2024,
    path: '/media/movies',
    fileVariants: [],
    ...data,
  };
}

function buildVariant(overrides: Record<string, any> = {}) {
  return {
    path: '/media/movies/Test Movie (2024)/Test Movie (2024).mkv',
    quality: 'BluRay-1080p',
    ...overrides,
  };
}

function oneMovie(variantOverrides: Record<string, any> = {}) {
  return buildMovie({ fileVariants: [buildVariant(variantOverrides)] });
}

describe('MovieOrganizeService', () => {
  describe('naming tokens — full data', () => {
    it('replaces all tokens with correct values', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ quality: 'BluRay-1080p Remux', path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const previews = await svc.previewRename([1]);

      expect(previews).toHaveLength(1);
      const p = previews[0];
      expect(p.newPath).toContain('Test Movie');
      expect(p.newPath).toContain('2024');
      expect(p.newPath).toMatch(/\.mkv$/);
    });

    it('includes resolution extracted from quality string', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ quality: 'HDTV-720p', path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} ({Release Year}) [{Resolution}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[720p]');
    });

    it('uses audio channels token from variant audio tracks', async () => {
      const prisma = makePrisma({
        movie: buildMovie({
          fileVariants: [buildVariant({
            path: '/old/movie.mkv',
            audioTracks: [{ channels: '5.1' }],
          })],
        }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} [{AudioChannels}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[5.1]');
    });

    it('handles missing audio tracks gracefully', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} [{AudioChannels}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[]');
    });

    it('handles null channels value gracefully', async () => {
      const prisma = makePrisma({
        movie: buildMovie({
          fileVariants: [buildVariant({
            path: '/old/movie.mkv',
            audioTracks: [{ channels: null }],
          })],
        }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} [{AudioChannels}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[]');
    });
  });

  describe('naming tokens — missing optional fields', () => {
    it('handles missing quality gracefully', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ quality: null, path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} [{Quality Title}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews).toHaveLength(1);
      expect(previews[0].newPath).not.toContain('undefined');
    });

    it('handles missing qualityFull gracefully', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ quality: null, path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} [{Quality Full}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).not.toContain('undefined');
    });

    it('handles missing mediaInfo gracefully', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} [{MediaInfo Simple}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).not.toContain('undefined');
    });
  });

  describe('sortTitle — The/A/An prefix handling', () => {
    it('sorts "The" prefix titles', async () => {
      const prisma = makePrisma({
        movie: buildMovie({
          title: 'The Matrix',
          fileVariants: [buildVariant({ path: '/old/path.mkv' })],
        }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFolderFormat: '{Movie TitleThe}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('Matrix, The');
    });

    it('sorts "A" prefix titles', async () => {
      const prisma = makePrisma({
        movie: buildMovie({
          title: 'A Quiet Place',
          fileVariants: [buildVariant({ path: '/old/path.mkv' })],
        }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFolderFormat: '{Movie TitleThe}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('Quiet Place, A');
    });

    it('leaves non-prefix titles unchanged', async () => {
      const prisma = makePrisma({
        movie: buildMovie({
          title: 'Inception',
          fileVariants: [buildVariant({ path: '/old/path.mkv' })],
        }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFolderFormat: '{Movie TitleThe}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('Inception');
    });
  });

  describe('sanitize — special character handling', () => {
    it.each([
      ['Movie: Subtitle', 'Movie Subtitle'],
      ['Movie/Subtitle', 'MovieSubtitle'],
      ['Movie*Subtitle', 'MovieSubtitle'],
      ['Movie?Subtitle', 'MovieSubtitle'],
      ['Movie"Subtitle', 'MovieSubtitle'],
      ['Movie<Subtitle>', 'MovieSubtitle'],
      ['Movie|Subtitle', 'MovieSubtitle'],
    ])('sanitizes %s to %s', async (input, expected) => {
      const prisma = makePrisma({
        movie: buildMovie({
          title: input,
          fileVariants: [buildVariant({ path: '/old/path.mkv' })],
        }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFolderFormat: '{Movie Title}',
        movieFileFormat: '{Movie Title} ({Release Year})',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain(expected);
    });
  });

  describe('extractResolution', () => {
    it('extracts 1080p from quality string', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ quality: 'HDTV-1080p', path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} [{Resolution}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[1080p]');
    });

    it('returns empty for quality without resolution', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ quality: 'DVDRip', path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} [{Resolution}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[]');
    });

    it('handles null quality without error', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ quality: null, path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, makeSettings({
        movieFileFormat: '{Movie Title} [{Resolution}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews).toHaveLength(1);
      expect(previews[0].newPath).toContain('[]');
    });
  });

  describe('default naming settings', () => {
    it('produces expected default path structure', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ quality: 'BluRay-1080p', path: '/old/movie.mkv' }),
      });

      const svc = new MovieOrganizeService(prisma as any, DEFAULT_MEDIA_MANAGEMENT_SETTINGS);
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toMatch(
        /\/Test Movie \(2024\)\/Test Movie \(2024\) BluRay-1080p\.mkv$/
      );
    });
  });

  describe('previewRename — corner cases', () => {
    it('returns empty array for empty movieIds', async () => {
      const prisma = makePrisma();
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const previews = await svc.previewRename([]);
      expect(previews).toEqual([]);
    });

    it('skips movie with no path', async () => {
      const prisma = makePrisma({
        movie: buildMovie({ path: null, fileVariants: [buildVariant()] }),
      });
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const previews = await svc.previewRename([1]);
      expect(previews).toEqual([]);
    });

    it('skips movie with no fileVariants', async () => {
      const prisma = makePrisma({
        movie: buildMovie({ fileVariants: [] }),
      });
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const previews = await svc.previewRename([1]);
      expect(previews).toEqual([]);
    });

    it('isNewPath is false when path already matches', async () => {
      const currentPath = '/media/movies/Test Movie (2024)/Test Movie (2024) BluRay-1080p.mkv';
      const prisma = makePrisma({
        movie: oneMovie({ quality: 'BluRay-1080p', path: currentPath }),
      });
      const svc = new MovieOrganizeService(prisma as any, DEFAULT_MEDIA_MANAGEMENT_SETTINGS);
      const previews = await svc.previewRename([1]);

      expect(previews).toHaveLength(1);
      expect(previews[0].isNewPath).toBe(false);
    });

    it('isNewPath is true when path differs', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ path: '/completely/different/path.mkv' }),
      });
      const svc = new MovieOrganizeService(prisma as any, DEFAULT_MEDIA_MANAGEMENT_SETTINGS);
      const previews = await svc.previewRename([1]);

      expect(previews).toHaveLength(1);
      expect(previews[0].isNewPath).toBe(true);
    });

    it('skips movie not found (null from prisma)', async () => {
      const prisma = makePrisma({ movie: null });
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const previews = await svc.previewRename([999]);
      expect(previews).toEqual([]);
    });
  });

  describe('applyRename — success path', () => {
    beforeEach(() => {
      fsMocks.mkdir.mockResolvedValue(undefined);
      fsMocks.rename.mockResolvedValue(undefined);
    });
    afterEach(() => {
      fsMocks.mkdir.mockClear();
      fsMocks.rename.mockClear();
    });

    it('renames file and updates DB when path differs', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ path: '/old/movie.mkv' }),
      });
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.renamed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
      expect(fsMocks.mkdir).toHaveBeenCalled();
      expect(fsMocks.rename).toHaveBeenCalledWith('/old/movie.mkv', expect.any(String));
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenCalledWith({
        where: { movieId: 1, path: '/old/movie.mkv' },
        data: { path: expect.any(String) },
      });
    });

    it('skips files that already have correct path', async () => {
      const currentPath = '/media/movies/Test Movie (2024)/Test Movie (2024) BluRay-1080p.mkv';
      const prisma = makePrisma({
        movie: oneMovie({ quality: 'BluRay-1080p', path: currentPath }),
      });
      const svc = new MovieOrganizeService(prisma as any, DEFAULT_MEDIA_MANAGEMENT_SETTINGS);
      const result = await svc.applyRename([1]);

      expect(result.renamed).toBe(0);
      expect(fsMocks.rename).not.toHaveBeenCalled();
    });
  });

  describe('applyRename — transaction safety (DB before fs)', () => {
    beforeEach(() => {
      fsMocks.mkdir.mockResolvedValue(undefined);
      fsMocks.rename.mockResolvedValue(undefined);
    });
    afterEach(() => {
      fsMocks.mkdir.mockClear();
      fsMocks.rename.mockClear();
    });

    it('does NOT call fs.rename when DB update fails', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ path: '/old/movie.mkv' }),
      });
      prisma.mediaFileVariant.updateMany.mockRejectedValue(new Error('DB connection lost'));
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.failed).toBe(1);
      expect(fsMocks.rename).not.toHaveBeenCalled();
    });

    it('rolls back DB path when fs.rename fails after DB update succeeds', async () => {
      const oldPath = '/old/movie.mkv';
      const prisma = makePrisma({
        movie: oneMovie({ path: oldPath }),
      });
      fsMocks.rename.mockRejectedValue(new Error('EACCES: permission denied'));
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.failed).toBe(1);
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenCalledTimes(2);
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenNthCalledWith(1, {
        where: { movieId: 1, path: oldPath },
        data: { path: expect.any(String) },
      });
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenNthCalledWith(2, {
        where: { movieId: 1, path: expect.any(String) },
        data: { path: oldPath },
      });
    });

    it('succeeds with correct order: DB update then fs.rename', async () => {
      const oldPath = '/old/movie.mkv';
      const prisma = makePrisma({
        movie: oneMovie({ path: oldPath }),
      });
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.renamed).toBe(1);
      expect(result.failed).toBe(0);
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenCalledBefore(fsMocks.rename as any);
    });
  });

  describe('applyRename — transaction safety (DB before fs)', () => {
    beforeEach(() => {
      fsMocks.mkdir.mockResolvedValue(undefined);
      fsMocks.rename.mockResolvedValue(undefined);
    });
    afterEach(() => {
      fsMocks.mkdir.mockClear();
      fsMocks.rename.mockClear();
    });

    it('does NOT call fs.rename when DB update fails', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ path: '/old/movie.mkv' }),
      });
      prisma.mediaFileVariant.updateMany.mockRejectedValue(new Error('DB connection lost'));
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.failed).toBe(1);
      expect(fsMocks.rename).not.toHaveBeenCalled();
    });

    it('rolls back DB path when fs.rename fails after DB update succeeds', async () => {
      const oldPath = '/old/movie.mkv';
      const prisma = makePrisma({
        movie: oneMovie({ path: oldPath }),
      });
      fsMocks.rename.mockRejectedValue(new Error('EACCES: permission denied'));
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.failed).toBe(1);
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenCalledTimes(2);
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenNthCalledWith(1, {
        where: { movieId: 1, path: oldPath },
        data: { path: expect.any(String) },
      });
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenNthCalledWith(2, {
        where: { movieId: 1, path: expect.any(String) },
        data: { path: oldPath },
      });
    });

    it('succeeds with correct order: DB update then fs.rename', async () => {
      const oldPath = '/old/movie.mkv';
      const prisma = makePrisma({
        movie: oneMovie({ path: oldPath }),
      });
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.renamed).toBe(1);
      expect(result.failed).toBe(0);
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenCalledBefore(fsMocks.rename as any);
    });
  });

  describe('applyRename — error paths', () => {
    beforeEach(() => {
      fsMocks.mkdir.mockResolvedValue(undefined);
      fsMocks.rename.mockResolvedValue(undefined);
    });
    afterEach(() => {
      fsMocks.mkdir.mockClear();
      fsMocks.rename.mockClear();
    });

    it('records error when fs.rename fails', async () => {
      fsMocks.rename.mockRejectedValue(new Error('EACCES: permission denied'));
      const prisma = makePrisma({
        movie: oneMovie({ path: '/old/movie.mkv' }),
      });
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.renamed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('permission denied');
      expect(prisma.mediaFileVariant.updateMany).toHaveBeenCalledTimes(2);
    });

    it('records error when DB update fails before rename (no partial state)', async () => {
      const prisma = makePrisma({
        movie: oneMovie({ path: '/old/movie.mkv' }),
      });
      prisma.mediaFileVariant.updateMany.mockRejectedValue(new Error('DB connection lost'));
      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('DB connection lost');
      expect(fsMocks.rename).not.toHaveBeenCalled();
    });

    it('handles mixed success and failure across multiple variants', async () => {
      const prisma = makePrisma({
        movie: buildMovie({
          fileVariants: [
            buildVariant({ id: 10, path: '/old/v1.mkv' }),
            buildVariant({ id: 20, path: '/old/v2.mkv' }),
          ],
        }),
      });
      fsMocks.rename
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('ENOENT'));

      const svc = new MovieOrganizeService(prisma as any, makeSettings());
      const result = await svc.applyRename([1]);

      expect(result.renamed).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
