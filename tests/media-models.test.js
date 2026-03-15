import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient, MediaType } from '@prisma/client';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';

const adapter = new PrismaBetterSQLite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

describe('Media Models', () => {
  beforeEach(async () => {
    await prisma.episode.deleteMany();
    await prisma.season.deleteMany();
    await prisma.series.deleteMany();
    await prisma.movie.deleteMany();
    if (prisma.media) {
      await prisma.media.deleteMany();
    }
    await prisma.qualityProfile.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should expose Media model and MediaType enum', () => {
    expect(prisma.media).toBeDefined();
    expect(MediaType).toBeDefined();
    expect(MediaType.TV).toBe('TV');
    expect(MediaType.MOVIE).toBe('MOVIE');
  });

  it('should create and query shared Media records', async () => {
    const profile = await prisma.qualityProfile.create({
      data: { name: 'Any' },
    });

    const media = await prisma.media.create({
      data: {
        mediaType: 'TV',
        title: 'The Boys',
        cleanTitle: 'theboys',
        sortTitle: 'the boys',
        status: 'continuing',
        year: 2019,
        tmdbId: 76479,
        qualityProfileId: profile.id,
      },
    });

    const found = await prisma.media.findUnique({
      where: { id: media.id },
      include: { qualityProfile: true },
    });

    expect(found.title).toBe('The Boys');
    expect(found.mediaType).toBe('TV');
    expect(found.qualityProfile.name).toBe('Any');
  });
});
