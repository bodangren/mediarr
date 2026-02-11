/**
 * Service to manage the "Wanted" list of missing monitored episodes.
 */
export class WantedService {
  constructor(private readonly prisma: any) {}

  /**
   * Gets a list of monitored episodes that do not have a file path.
   */
  async getMissingEpisodes(): Promise<any[]> {
    return this.prisma.episode.findMany({
      where: {
        path: null,
        monitored: true,
        series: { monitored: true }
      },
      include: {
        series: true
      },
      orderBy: {
        airDateUtc: 'desc'
      }
    });
  }

  /**
   * Gets a list of monitored episodes that are considered "cutoff unmet" 
   * (existing file quality is lower than the target in quality profile).
   * For now, we'll keep it simple and just return missing episodes.
   */
  async getCutoffUnmetEpisodes(): Promise<any[]> {
    // Basic implementation: same as missing for now
    return this.getMissingEpisodes();
  }
}
