import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createTestPrismaClient } from './helpers/test-prisma-client';
import 'dotenv/config';
import { SubtitleVariantRepository } from '../server/src/repositories/SubtitleVariantRepository';
import { VariantBackfillService } from '../server/src/services/VariantBackfillService';
import { cleanupVariantBackfillFixtures } from './helpers/prisma-cleanup';

const prisma = createTestPrismaClient();
const repository = new SubtitleVariantRepository(prisma);
const service = new VariantBackfillService(prisma, repository);

describe('VariantBackfillService', () => {
  beforeEach(async () => {
    await cleanupVariantBackfillFixtures(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should backfill movie and episode variants from legacy path fields', async () => {
    const profile = await prisma.qualityProfile.create({
      data: { name: `BackfillProfile_${Date.now()}` },
    });
    await prisma.movie.create({
      data: {
        tmdbId: 777001,
        title: 'Backfill Movie',
        cleanTitle: 'backfillmovie',
        sortTitle: 'backfill movie',
        status: 'released',
        monitored: true,
        qualityProfileId: profile.id,
        path: '/data/media/movies/Backfill Movie (2025)/backfill.movie.2025.mkv',
        year: 2025,
      },
    });
    const series = await prisma.series.create({
      data: {
        tvdbId: 778001,
        title: 'Backfill Show',
        cleanTitle: 'backfillshow',
        sortTitle: 'backfill show',
        status: 'continuing',
        monitored: true,
        qualityProfileId: profile.id,
        year: 2025,
      },
    });
    await prisma.episode.create({
      data: {
        seriesId: series.id,
        tvdbId: 779001,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
        monitored: true,
        path: '/data/media/tv/Backfill Show/S01E01.mkv',
      },
    });

    const firstRun = await service.run();
    expect(firstRun).toEqual({
      movieVariantsCreated: 1,
      episodeVariantsCreated: 1,
    });

    const secondRun = await service.run();
    expect(secondRun).toEqual({
      movieVariantsCreated: 0,
      episodeVariantsCreated: 0,
    });
  });

  it('should avoid FK cleanup violations by deleting dependents before quality profiles', async () => {
    const profile = await prisma.qualityProfile.create({
      data: { name: `CleanupOrder_${Date.now()}` },
    });

    await prisma.movie.create({
      data: {
        tmdbId: 777777,
        title: 'Cleanup Order Movie',
        cleanTitle: 'cleanupordermovie',
        sortTitle: 'cleanup order movie',
        status: 'released',
        monitored: true,
        qualityProfileId: profile.id,
        year: 2026,
      },
    });

    await expect(prisma.qualityProfile.deleteMany()).rejects.toBeDefined();

    await cleanupVariantBackfillFixtures(prisma);

    expect(await prisma.movie.count()).toBe(0);
    expect(await prisma.qualityProfile.count()).toBe(0);
  });
});
