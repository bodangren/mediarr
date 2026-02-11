import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EpisodeService } from '../server/src/services/EpisodeService';

describe('EpisodeService', () => {
  let service;
  let prisma;

  beforeEach(() => {
    prisma = {
      episode: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new EpisodeService(prisma);
  });

  it('should toggle monitoring for an episode', async () => {
    prisma.episode.update.mockResolvedValue({ id: 101, monitored: true });

    const result = await service.setMonitored(101, true);
    
    expect(prisma.episode.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: { monitored: true }
    });
    expect(result.monitored).toBe(true);
  });
});
