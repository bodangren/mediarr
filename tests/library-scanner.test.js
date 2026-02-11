import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryScanner } from '../server/src/services/LibraryScanner';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('LibraryScanner', () => {
  let scanner;
  let prisma;

  beforeEach(() => {
    prisma = {
      series: {
        findUnique: vi.fn(),
      },
      episode: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };
    scanner = new LibraryScanner(prisma);
    vi.clearAllMocks();
  });

  it('should scan a series directory and match episodes', async () => {
    const series = {
      id: 1,
      path: '/media/TV/The Boys',
      title: 'The Boys',
    };

    // Mock directory listing
    fs.readdir.mockResolvedValue([
      'Season 01',
      'The.Boys.S01E01.Pilot.mkv',
      'The.Boys.S01E02.mkv',
      'otherfile.txt'
    ]);

    // Mock stat to distinguish files from directories
    fs.stat.mockImplementation(async (path) => {
      if (path.endsWith('Season 01')) {
        return { isDirectory: () => true, isFile: () => false };
      }
      return { isDirectory: () => false, isFile: () => true };
    });

    // Mock recursive readdir for Season 01
    fs.readdir.mockImplementation(async (path) => {
      if (path === '/media/TV/The Boys') {
        return ['Season 01', 'The.Boys.S01E01.Pilot.mkv', 'otherfile.txt'];
      }
      if (path === '/media/TV/The Boys/Season 01') {
        return ['The.Boys.S01E02.mkv'];
      }
      return [];
    });

    // Mock prisma lookups
    prisma.episode.findFirst.mockImplementation(({ where }) => {
      if (where.seasonNumber === 1 && where.episodeNumber === 1) {
        return Promise.resolve({ id: 101, title: 'Pilot' });
      }
      if (where.seasonNumber === 1 && where.episodeNumber === 2) {
        return Promise.resolve({ id: 102, title: 'Cherry' });
      }
      return Promise.resolve(null);
    });

    await scanner.scanSeries(series);

    expect(prisma.episode.update).toHaveBeenCalledTimes(2);
    expect(prisma.episode.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: { path: '/media/TV/The Boys/The.Boys.S01E01.Pilot.mkv' }
    });
    expect(prisma.episode.update).toHaveBeenCalledWith({
      where: { id: 102 },
      data: { path: '/media/TV/The Boys/Season 01/The.Boys.S01E02.mkv' }
    });
  });
});
