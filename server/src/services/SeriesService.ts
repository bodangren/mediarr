/**
 * Service for managing series metadata and settings.
 */
export class SeriesService {
  constructor(private readonly prisma: any) {}

  async getAllSeries(): Promise<any[]> {
    return this.prisma.series.findMany({
      include: {
        qualityProfile: true,
        _count: {
          select: { episodes: true }
        }
      }
    });
  }

  async getSeriesById(id: number): Promise<any> {
    return this.prisma.series.findUnique({
      where: { id },
      include: {
        seasons: {
          include: { episodes: true }
        },
        qualityProfile: true
      }
    });
  }

  async setMonitored(id: number, monitored: boolean): Promise<any> {
    return this.prisma.series.update({
      where: { id },
      data: { monitored }
    });
  }

  async deleteSeries(id: number, deleteFiles = false): Promise<void> {
    // Files deletion logic would go here if deleteFiles is true
    await this.prisma.series.delete({
      where: { id }
    });
  }
}
