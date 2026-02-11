import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { MediaRepository } from '../server/src/repositories/MediaRepository';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new MediaRepository(prisma);

describe('MediaRepository', () => {
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

  it('should upsert a movie and keep media record in sync', async () => {
    const profile = await prisma.qualityProfile.create({
      data: { name: 'Any' },
    });

    const movie = await repository.upsertMovie({
      tmdbId: 13,
      title: 'Forrest Gump',
      cleanTitle: 'forrestgump',
      sortTitle: 'forrest gump',
      status: 'released',
      monitored: true,
      year: 1994,
      qualityProfileId: profile.id,
      minimumAvailability: 'released',
      digitalRelease: new Date('1994-11-03T00:00:00.000Z'),
    });

    expect(movie.tmdbId).toBe(13);

    const loaded = await repository.findMovieByTmdbId(13);
    expect(loaded).not.toBeNull();
    expect(loaded.media?.mediaType).toBe('MOVIE');
    expect(loaded.media?.title).toBe('Forrest Gump');
  });
});
