import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaService } from '../server/src/services/MediaService';

describe('SeriesService (via MediaService.setMonitored)', () => {
  let service;
  let prisma;

  beforeEach(() => {
    prisma = {
      series: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new MediaService(prisma);
  });

  it('should toggle monitoring for a series', async () => {
    prisma.series.update.mockResolvedValue({ id: 1, monitored: false });

    const result = await service.setMonitored(1, false);
    
    expect(prisma.series.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { monitored: false }
    });
    expect(result.monitored).toBe(false);
  });
});
