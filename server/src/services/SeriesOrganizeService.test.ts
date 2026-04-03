import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeriesOrganizeService, DEFAULT_SERIES_MANAGEMENT_SETTINGS } from './SeriesOrganizeService';
import type { SeriesManagementSettings } from './SeriesOrganizeService';

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    series: {
      findUnique: vi.fn().mockResolvedValue(overrides.series ?? null),
    },
    mediaFileVariant: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function makeSettings(overrides: Partial<SeriesManagementSettings> = {}): SeriesManagementSettings {
  return { ...DEFAULT_SERIES_MANAGEMENT_SETTINGS, ...overrides };
}

function buildSeries(data: Record<string, any> = {}) {
  return {
    id: 1,
    title: 'Test Show',
    year: 2024,
    path: '/media/tv',
    seasons: [],
    ...data,
  };
}

function buildEpisode(overrides: Record<string, any> = {}) {
  return {
    seasonNumber: 1,
    episodeNumber: 1,
    title: 'Pilot',
    fileVariants: [],
    ...overrides,
  };
}

function buildVariant(overrides: Record<string, any> = {}) {
  return {
    path: '/media/tv/Test Show/Season 01/Test Show - S01E01.mkv',
    quality: 'HDTV-720p',
    ...overrides,
  };
}

function seriesWithEpisodes(episodes: any[]) {
  return buildSeries({
    seasons: [{ episodes }],
  });
}

function oneEpisode(episodeOverrides: Record<string, any> = {}, variantOverrides: Record<string, any> = {}) {
  return seriesWithEpisodes([buildEpisode({ ...episodeOverrides, fileVariants: [buildVariant(variantOverrides)] })]);
}

describe('SeriesOrganizeService', () => {
  describe('naming tokens — full data', () => {
    it('replaces all tokens with correct values', async () => {
      const prisma = makePrisma({
        series: oneEpisode(
          { seasonNumber: 2, episodeNumber: 5, title: 'The Red Door', absoluteEpisodeNumber: 25 },
          { quality: 'BluRay-1080p Remux', path: '/old/path.mkv' }
        ),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings());
      const previews = await svc.previewRename([1]);

      expect(previews).toHaveLength(1);
      const p = previews[0];
      expect(p.newPath).toContain('Test Show');
      expect(p.newPath).toContain('S02');
      expect(p.newPath).toContain('E05');
      expect(p.newPath).toContain('The Red Door');
      expect(p.newPath).toContain('Season 02');
      expect(p.newPath).toMatch(/\.mkv$/);
    });

    it('includes resolution extracted from quality string', async () => {
      const prisma = makePrisma({
        series: oneEpisode({}, { quality: 'HDTV-720p', path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        episodeFileFormat: '{Series Title} S{Season Number:00}E{Episode Number:00} [{Resolution}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[720p]');
    });

    it('uses absolute episode number token', async () => {
      const prisma = makePrisma({
        series: oneEpisode({ absoluteEpisodeNumber: 100 }, { path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        episodeFileFormat: '{Series Title} - {Absolute Episode Number:00}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('100');
    });
  });

  describe('naming tokens — missing optional fields', () => {
    it('handles missing episodeTitle gracefully', async () => {
      const prisma = makePrisma({
        series: oneEpisode({ title: null }, { path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        episodeFileFormat: '{Series Title} - S{Season Number:00}E{Episode Number:00} - {Episode Title}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews).toHaveLength(1);
      expect(previews[0].newPath).not.toContain('undefined');
      expect(previews[0].newPath).not.toContain('null');
    });

    it('handles missing quality gracefully', async () => {
      const prisma = makePrisma({
        series: oneEpisode({}, { quality: null, path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        episodeFileFormat: '{Series Title} [{Quality Title}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).not.toContain('undefined');
    });

    it('handles missing absoluteEpisodeNumber (defaults to 0)', async () => {
      const prisma = makePrisma({
        series: oneEpisode({}, { path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        episodeFileFormat: '{Series Title} - {Absolute Episode Number}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('0');
    });
  });

  describe('sortTitle — The/A/An prefix handling', () => {
    it('sorts "The" prefix titles', async () => {
      const prisma = makePrisma({
        series: buildSeries({
          title: 'The Office',
          seasons: [{ episodes: [buildEpisode({ fileVariants: [buildVariant({ path: '/old/path.mkv' })] })] }],
        }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        seriesFolderFormat: '{Series TitleThe}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('Office, The');
    });

    it('sorts "A" prefix titles', async () => {
      const prisma = makePrisma({
        series: buildSeries({
          title: 'A Beautiful Mind',
          seasons: [{ episodes: [buildEpisode({ fileVariants: [buildVariant({ path: '/old/path.mkv' })] })] }],
        }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        seriesFolderFormat: '{Series TitleThe}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('Beautiful Mind, A');
    });

    it('sorts "An" prefix titles', async () => {
      const prisma = makePrisma({
        series: buildSeries({
          title: 'An American Tale',
          seasons: [{ episodes: [buildEpisode({ fileVariants: [buildVariant({ path: '/old/path.mkv' })] })] }],
        }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        seriesFolderFormat: '{Series TitleThe}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('American Tale, An');
    });

    it('leaves non-prefix titles unchanged', async () => {
      const prisma = makePrisma({
        series: buildSeries({
          title: 'Breaking Bad',
          seasons: [{ episodes: [buildEpisode({ fileVariants: [buildVariant({ path: '/old/path.mkv' })] })] }],
        }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        seriesFolderFormat: '{Series TitleThe}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('Breaking Bad');
    });
  });

  describe('sanitize — special character handling', () => {
    it.each([
      ['Show: Subtitle', 'Show Subtitle'],
      ['Show/Subtitle', 'ShowSubtitle'],
      ['Show*Subtitle', 'ShowSubtitle'],
      ['Show?Subtitle', 'ShowSubtitle'],
      ['Show"Subtitle', 'ShowSubtitle'],
      ['Show<Subtitle>', 'ShowSubtitle'],
      ['Show|Subtitle', 'ShowSubtitle'],
      ['Show   Subtitle', 'Show Subtitle'],
    ])('sanitizes %s to %s', async (input, expected) => {
      const prisma = makePrisma({
        series: buildSeries({
          title: input,
          seasons: [{ episodes: [buildEpisode({ fileVariants: [buildVariant({ path: '/old/path.mkv' })] })] }],
        }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        seriesFolderFormat: '{Series Title}',
        episodeFileFormat: '{Series Title} S{Season Number:00}E{Episode Number:00}',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain(expected);
    });
  });

  describe('extractResolution', () => {
    it('extracts 1080p from quality string', async () => {
      const prisma = makePrisma({
        series: oneEpisode({}, { quality: 'HDTV-1080p', path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        episodeFileFormat: '{Series Title} [{Resolution}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[1080p]');
    });

    it('extracts 2160p from quality string', async () => {
      const prisma = makePrisma({
        series: oneEpisode({}, { quality: 'UHD-2160p', path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        episodeFileFormat: '{Series Title} [{Resolution}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[2160p]');
    });

    it('returns empty string for quality without resolution pattern', async () => {
      const prisma = makePrisma({
        series: oneEpisode({}, { quality: 'DVDRip', path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        episodeFileFormat: '{Series Title} [{Resolution}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toContain('[]');
    });

    it('handles null quality without error', async () => {
      const prisma = makePrisma({
        series: oneEpisode({}, { quality: null, path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        episodeFileFormat: '{Series Title} [{Resolution}]',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews).toHaveLength(1);
      expect(previews[0].newPath).toContain('[]');
    });
  });

  describe('empty/undefined season folder format', () => {
    it('skips season folder layer when seasonFolderFormat is empty', async () => {
      const prisma = makePrisma({
        series: oneEpisode({}, { path: '/old/path.mkv' }),
      });

      const svc = new SeriesOrganizeService(prisma as any, makeSettings({
        seasonFolderFormat: '',
      }));
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).not.toContain('Season');
      expect(previews[0].newPath).toMatch(/\/Test Show\/[^/]+\.mkv$/);
    });
  });

  describe('default naming settings', () => {
    it('produces expected default path structure', async () => {
      const prisma = makePrisma({
        series: oneEpisode(
          { seasonNumber: 1, episodeNumber: 3, title: 'Episode Three' },
          { quality: 'HDTV-720p', path: '/old/path.mkv' }
        ),
      });

      const svc = new SeriesOrganizeService(prisma as any, DEFAULT_SERIES_MANAGEMENT_SETTINGS);
      const previews = await svc.previewRename([1]);

      expect(previews[0].newPath).toMatch(
        /\/Test Show\/Season 01\/Test Show - S01E03 - Episode Three \[HDTV-720p\]\.mkv$/
      );
    });
  });
});
