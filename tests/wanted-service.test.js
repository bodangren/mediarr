import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WantedService } from '../server/src/services/WantedService';

describe('WantedService', () => {
  let service;
  let prisma;

  beforeEach(() => {
    prisma = {
      episode: {
        findMany: vi.fn(),
      },
    };
    service = new WantedService(prisma);
  });

  it('should return missing monitored episodes', async () => {
    const mockEpisodes = [
      { id: 101, title: 'Pilot', series: { title: 'The Boys', monitored: true } },
    ];

    prisma.episode.findMany.mockResolvedValue(mockEpisodes);

    const results = await service.getMissingEpisodes();
    
    expect(prisma.episode.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        path: null,
        monitored: true,
        series: { monitored: true }
      }
    }));
    expect(results).toHaveLength(1);
  });
});
