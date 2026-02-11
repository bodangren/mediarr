import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportManager } from '../server/src/services/ImportManager';
import { TorrentManager } from '../server/src/services/TorrentManager';
import { Organizer } from '../server/src/services/Organizer';
import { EventEmitter } from 'events';
import fs from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('ImportManager', () => {
  let importManager;
  let torrentManager;
  let organizer;
  let prisma;

  beforeEach(() => {
    torrentManager = new EventEmitter();
    organizer = {
      organizeFile: vi.fn().mockResolvedValue('/media/TV/The Boys/Season 01/The Boys - S01E01 - Pilot.mkv'),
    };
    prisma = {
      series: {
        findFirst: vi.fn(),
      },
      episode: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };
    importManager = new ImportManager(torrentManager, organizer, prisma);
  });

  it('should import a completed TV torrent', async () => {
    const torrentInfo = {
      infoHash: 'abc',
      name: 'The.Boys.S01E01.1080p.WEBRip.x264-GRP',
      path: '/data/downloads/complete/The.Boys.S01E01.1080p.WEBRip.x264-GRP'
    };

    // Mock fs
    fs.stat.mockResolvedValue({ isDirectory: () => false });

    // Mock series lookup
    prisma.series.findFirst.mockResolvedValue({
      id: 1,
      title: 'The Boys',
      path: '/media/TV/The Boys'
    });

    // Mock episode lookup
    prisma.episode.findFirst.mockResolvedValue({
      id: 101,
      seriesId: 1,
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'Pilot'
    });

    // Trigger the event
    await torrentManager.emit('torrent:completed', torrentInfo);

    // Give it a tick to process async
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(prisma.series.findFirst).toHaveBeenCalled();
    expect(organizer.organizeFile).toHaveBeenCalled();
    expect(prisma.episode.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: { path: expect.stringContaining('The Boys - S01E01 - Pilot.mkv') }
    });
  });
});
