/**
 * Service for managing episode status and information.
 */
export class EpisodeService {
  constructor(private readonly prisma: any) {}

  async getEpisodesBySeries(seriesId: number): Promise<any[]> {
    return this.prisma.episode.findMany({
      where: { seriesId },
      orderBy: [
        { seasonNumber: 'asc' },
        { episodeNumber: 'asc' }
      ]
    });
  }

  async setMonitored(id: number, monitored: boolean): Promise<any> {
    return this.prisma.episode.update({
      where: { id },
      data: { monitored }
    });
  }

  async setSeasonMonitored(seriesId: number, seasonNumber: number, monitored: boolean): Promise<void> {
    await this.prisma.episode.updateMany({
      where: {
        seriesId,
        seasonNumber
      },
      data: { monitored }
    });
  }
}
