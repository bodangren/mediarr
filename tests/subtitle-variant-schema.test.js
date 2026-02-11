import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

describe('Subtitle Variant Schema', () => {
  beforeEach(async () => {
    await prisma.subtitleHistory.deleteMany();
    await prisma.wantedSubtitle.deleteMany();
    await prisma.variantSubtitleTrack.deleteMany();
    await prisma.variantAudioTrack.deleteMany();
    await prisma.mediaFileVariant.deleteMany();
    await prisma.episode.deleteMany();
    await prisma.season.deleteMany();
    await prisma.series.deleteMany();
    await prisma.movie.deleteMany();
    await prisma.media.deleteMany();
    await prisma.qualityProfile.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should enforce unique wanted subtitle key per variant', async () => {
    const profile = await prisma.qualityProfile.create({
      data: { name: `UniqueProfile_${Date.now()}` },
    });
    const movie = await prisma.movie.create({
      data: {
        tmdbId: 999001,
        title: 'Test Movie',
        cleanTitle: 'testmovie',
        sortTitle: 'test movie',
        status: 'released',
        monitored: true,
        qualityProfileId: profile.id,
        year: 2020,
      },
    });

    const variant = await prisma.mediaFileVariant.create({
      data: {
        mediaType: 'MOVIE',
        movieId: movie.id,
        path: '/tmp/test.movie.2020.1080p.mkv',
        fileSize: BigInt(9000000),
      },
    });

    await prisma.wantedSubtitle.create({
      data: {
        variantId: variant.id,
        languageCode: 'en',
        isForced: false,
        isHi: false,
      },
    });

    await expect(
      prisma.wantedSubtitle.create({
        data: {
          variantId: variant.id,
          languageCode: 'en',
          isForced: false,
          isHi: false,
        },
      }),
    ).rejects.toThrow();
  });
});
