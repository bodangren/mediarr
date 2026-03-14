import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiServer } from '../server/src/api/createApiServer';
import type { FastifyInstance } from 'fastify';

// Mock Prisma with episode/series data
function createMockPrisma(episodes: any[] = [], series: any[] = []) {
  return {
    episode: {
      findMany: vi.fn().mockResolvedValue(episodes),
    },
    series: {
      findMany: vi.fn().mockResolvedValue(series),
    },
  };
}

function createTestApp(mockPrisma: any) {
  return createApiServer({ prisma: mockPrisma } as any, {
    torrentStatsIntervalMs: 60_000,
    activityPollIntervalMs: 60_000,
    healthPollIntervalMs: 60_000,
  });
}

describe('Calendar API', () => {
  let apps: FastifyInstance[] = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.length = 0;
    vi.clearAllMocks();
  });

  describe('GET /api/calendar', () => {
    it('returns 200 with empty array when no episodes exist', async () => {
      const mockPrisma = createMockPrisma();
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?start=2026-02-01&end=2026-02-28',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data).toHaveLength(0);
    });

    it('returns 422 when start parameter is missing', async () => {
      const mockPrisma = createMockPrisma();
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?end=2026-02-28',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(422);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe('VALIDATION_ERROR');
      expect(payload.error.message).toContain('start');
    });

    it('returns 422 when end parameter is missing', async () => {
      const mockPrisma = createMockPrisma();
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?start=2026-02-01',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(422);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe('VALIDATION_ERROR');
      expect(payload.error.message).toContain('end');
    });

    it('returns 422 for invalid date format', async () => {
      const mockPrisma = createMockPrisma();
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?start=invalid&end=2026-02-28',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(422);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe('VALIDATION_ERROR');
      expect(payload.error.message).toContain('format');
    });

    it('returns episodes with correct schema', async () => {
      const mockEpisodes = [
        {
          id: 1,
          seriesId: 100,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Pilot',
          airDateUtc: new Date('2026-02-15T20:00:00Z'),
          monitored: true,
          series: { id: 100, title: 'Test Series' },
          fileVariants: [],
        },
      ];
      const mockPrisma = createMockPrisma(mockEpisodes);
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?start=2026-02-01&end=2026-02-28',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveLength(1);

      const episode = payload.data[0];
      expect(episode).toHaveProperty('id', 1);
      expect(episode).toHaveProperty('seriesId', 100);
      expect(episode).toHaveProperty('title', 'Test Series');
      expect(episode).toHaveProperty('seasonNumber', 1);
      expect(episode).toHaveProperty('episodeNumber', 1);
      expect(episode).toHaveProperty('episodeTitle', 'Pilot');
      expect(episode).toHaveProperty('date', '2026-02-15');
      expect(episode.time).toBeDefined();
      expect(episode).toHaveProperty('status');
      expect(episode).toHaveProperty('hasFile', false);
      expect(episode).toHaveProperty('monitored', true);
    });

    it('filters by seriesId when provided', async () => {
      const mockEpisodes = [
        {
          id: 1,
          seriesId: 100,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Episode 1',
          airDateUtc: new Date('2026-02-15T20:00:00Z'),
          monitored: true,
          series: { id: 100, title: 'Series A' },
          fileVariants: [],
        },
        {
          id: 2,
          seriesId: 200,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Episode 2',
          airDateUtc: new Date('2026-02-16T20:00:00Z'),
          monitored: true,
          series: { id: 200, title: 'Series B' },
          fileVariants: [],
        },
      ];

      const mockPrisma = {
        episode: {
          findMany: vi.fn().mockResolvedValue([mockEpisodes[0]]),
        },
        series: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?start=2026-02-01&end=2026-02-28&seriesId=100',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(mockPrisma.episode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            seriesId: 100,
          }),
        })
      );
    });

    it('filters by status when provided', async () => {
      const mockEpisodes = [
        {
          id: 1,
          seriesId: 100,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Downloaded Episode',
          airDateUtc: new Date('2026-02-10T20:00:00Z'),
          monitored: true,
          series: { id: 100, title: 'Test Series' },
          fileVariants: [{ id: 1 }], // Has file
        },
        {
          id: 2,
          seriesId: 100,
          seasonNumber: 1,
          episodeNumber: 2,
          title: 'Missing Episode',
          airDateUtc: new Date('2026-02-11T20:00:00Z'),
          monitored: true,
          series: { id: 100, title: 'Test Series' },
          fileVariants: [], // No file
        },
      ];

      const mockPrisma = createMockPrisma(mockEpisodes);
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?start=2026-02-01&end=2026-02-28&status=downloaded',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      // Only the downloaded episode should be returned
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0].status).toBe('downloaded');
    });

    it('returns "downloaded" status for episodes with files', async () => {
      const mockEpisodes = [
        {
          id: 1,
          seriesId: 100,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Test Episode',
          airDateUtc: new Date('2026-02-15T20:00:00Z'),
          monitored: true,
          series: { id: 100, title: 'Test Series' },
          fileVariants: [{ id: 1 }],
        },
      ];

      const mockPrisma = createMockPrisma(mockEpisodes);
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?start=2026-02-01&end=2026-02-28',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.data[0].status).toBe('downloaded');
      expect(payload.data[0].hasFile).toBe(true);
    });

    it('returns "unaired" status for future episodes without files', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const mockEpisodes = [
        {
          id: 1,
          seriesId: 100,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Future Episode',
          airDateUtc: futureDate,
          monitored: true,
          series: { id: 100, title: 'Test Series' },
          fileVariants: [],
        },
      ];

      const mockPrisma = createMockPrisma(mockEpisodes);
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const start = new Date();
      const end = new Date();
      end.setFullYear(end.getFullYear() + 2);

      const response = await app.inject({
        method: 'GET',
        url: `/api/calendar?start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`,
      });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.data[0].status).toBe('unaired');
      expect(payload.data[0].hasFile).toBe(false);
    });

    it('orders episodes by airDateUtc ascending', async () => {
      const mockEpisodes = [
        {
          id: 2,
          seriesId: 100,
          seasonNumber: 1,
          episodeNumber: 2,
          title: 'Episode 2',
          airDateUtc: new Date('2026-02-20T20:00:00Z'),
          monitored: true,
          series: { id: 100, title: 'Test Series' },
          fileVariants: [],
        },
        {
          id: 1,
          seriesId: 100,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Episode 1',
          airDateUtc: new Date('2026-02-15T20:00:00Z'),
          monitored: true,
          series: { id: 100, title: 'Test Series' },
          fileVariants: [],
        },
      ];

      const mockPrisma = createMockPrisma(mockEpisodes);
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?start=2026-02-01&end=2026-02-28',
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrisma.episode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            airDateUtc: 'asc',
          },
        })
      );
    });

    it('handles episodes without airDateUtc', async () => {
      const mockEpisodes = [
        {
          id: 1,
          seriesId: 100,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'No Air Date Episode',
          airDateUtc: null,
          monitored: true,
          series: { id: 100, title: 'Test Series' },
          fileVariants: [],
        },
      ];

      const mockPrisma = createMockPrisma(mockEpisodes);
      const app = createTestApp(mockPrisma);
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/calendar?start=2026-02-01&end=2026-02-28',
      });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.data[0].date).toBe('');
      expect(payload.data[0].time).toBe('');
    });

    it('handles seriesId as string or number', async () => {
      const mockPrisma = createMockPrisma([]);
      const app = createTestApp(mockPrisma);
      apps.push(app);

      // Test with string seriesId
      await app.inject({
        method: 'GET',
        url: '/api/calendar?start=2026-02-01&end=2026-02-28&seriesId=100',
      });

      expect(mockPrisma.episode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            seriesId: 100,
          }),
        })
      );
    });
  });
});
