import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';

const adapter = new PrismaBetterSQLite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

describe('Movie Models', () => {
  beforeEach(async () => {
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

  it('should persist and retrieve movie-specific release attributes', async () => {
    const qualityProfile = await prisma.qualityProfile.create({
      data: { name: 'HD - 1080p' },
    });

    const media = await prisma.media.create({
      data: {
        mediaType: 'MOVIE',
        tmdbId: 603,
        imdbId: 'tt0133093',
        title: 'The Matrix',
        cleanTitle: 'thematrix',
        sortTitle: 'matrix, the',
        status: 'released',
        year: 1999,
        qualityProfileId: qualityProfile.id,
        minimumAvailability: 'released',
        digitalRelease: new Date('1999-09-21T00:00:00.000Z'),
      },
    });

    const movie = await prisma.movie.create({
      data: {
        mediaId: media.id,
        tmdbId: 603,
        imdbId: 'tt0133093',
        title: 'The Matrix',
        cleanTitle: 'thematrix',
        sortTitle: 'matrix, the',
        status: 'released',
        year: 1999,
        qualityProfileId: qualityProfile.id,
        minimumAvailability: 'released',
        digitalRelease: new Date('1999-09-21T00:00:00.000Z'),
      },
    });

    const loaded = await prisma.movie.findUnique({
      where: { id: movie.id },
      include: { media: true },
    });

    expect(loaded.minimumAvailability).toBe('released');
    expect(loaded.digitalRelease?.toISOString()).toContain('1999-09-21');
    expect(loaded.media?.mediaType).toBe('MOVIE');
  });
});
