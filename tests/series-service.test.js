import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeriesService } from '../server/src/services/SeriesService';

describe('SeriesService', () => {
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
    service = new SeriesService(prisma);
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
