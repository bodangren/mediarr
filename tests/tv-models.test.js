import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

describe('TV Models', () => {
  beforeEach(async () => {
    // Clean up
    await prisma.episode.deleteMany();
    await prisma.season.deleteMany();
    await prisma.series.deleteMany();
    await prisma.qualityProfile.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a series with quality profile, seasons and episodes', async () => {
    const qp = await prisma.qualityProfile.create({
      data: { name: 'HD - 1080p' }
    });

    const series = await prisma.series.create({
      data: {
        tvdbId: 12345,
        title: 'Test Show',
        cleanTitle: 'testshow',
        sortTitle: 'test show',
        status: 'continuing',
        year: 2024,
        qualityProfileId: qp.id,
      }
    });

    const season = await prisma.season.create({
      data: {
        seriesId: series.id,
        seasonNumber: 1
      }
    });

    const episode = await prisma.episode.create({
      data: {
        seriesId: series.id,
        seasonId: season.id,
        tvdbId: 98765,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot'
      }
    });

    expect(series.title).toBe('Test Show');
    expect(episode.title).toBe('Pilot');
    
    const fetchedSeries = await prisma.series.findUnique({
      where: { id: series.id },
      include: {
        seasons: { include: { episodes: true } },
        qualityProfile: true
      }
    });

    expect(fetchedSeries.qualityProfile.name).toBe('HD - 1080p');
    expect(fetchedSeries.seasons).toHaveLength(1);
    expect(fetchedSeries.seasons[0].episodes).toHaveLength(1);
  });

  it('should support seasons and episodes with relations', async () => {
    const qp = await prisma.qualityProfile.create({
      data: { name: 'Any' }
    });

    const series = await prisma.series.create({
      data: {
        tvdbId: 67890,
        title: 'Season Show',
        cleanTitle: 'seasonshow',
        sortTitle: 'season show',
        status: 'ended',
        year: 2023,
        qualityProfileId: qp.id,
      }
    });

    const season = await prisma.season.create({
      data: {
        seriesId: series.id,
        seasonNumber: 1,
        monitored: true
      }
    });

    const episode = await prisma.episode.create({
      data: {
        seriesId: series.id,
        seasonId: season.id,
        tvdbId: 11111,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Episode 1'
      }
    });

    expect(season.seriesId).toBe(series.id);
    expect(episode.seasonId).toBe(season.id);
    
    const fetchedSeason = await prisma.season.findUnique({
      where: { id: season.id },
      include: { episodes: true }
    });
    expect(fetchedSeason.episodes).toHaveLength(1);
  });
});
