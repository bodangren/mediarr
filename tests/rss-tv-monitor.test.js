import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RssMediaMonitor } from '../server/src/services/RssMediaMonitor';
import { EventEmitter } from 'events';

describe('RssMediaMonitor (legacy RssTvMonitor coverage)', () => {
  let monitor;
  let rssSyncService;
  let torrentManager;
  let prisma;

  beforeEach(() => {
    rssSyncService = new EventEmitter();
    torrentManager = {
      addTorrent: vi.fn().mockResolvedValue({ infoHash: 'abc' }),
    };
    prisma = {
      series: {
        findFirst: vi.fn(),
      },
      episode: {
        findMany: vi.fn(),
      },
    };
    monitor = new RssMediaMonitor(rssSyncService, torrentManager, prisma);
  });

  it('should trigger download when a matching monitored missing episode release is found', async () => {
    const release = {
      title: 'The.Boys.S01E01.1080p.WEBRip.x264-GRP',
      magnetUrl: 'magnet:?xt=urn:btih:abc',
      indexerId: 1
    };

    // Mock series lookup
    prisma.series.findFirst.mockResolvedValue({
      id: 1,
      title: 'The Boys',
      monitored: true
    });

    // The monitor resolves the full matching episode set so multi-episode
    // releases and season packs retain every linked episode ID.
    prisma.episode.findMany.mockResolvedValue([{
      id: 101,
      seriesId: 1,
      seasonNumber: 1,
      episodeNumber: 1,
      monitored: true,
      path: null // Missing
    }]);

    // Trigger the event
    await rssSyncService.emit('release:stored', release);

    // Give it a tick
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(prisma.series.findFirst).toHaveBeenCalled();
    expect(torrentManager.addTorrent).toHaveBeenCalledWith({
      magnetUrl: 'magnet:?xt=urn:btih:abc',
      episodeId: 101,
      episodeIds: [101],
    });
  });
});
