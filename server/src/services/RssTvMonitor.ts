import { Parser } from '../utils/Parser';

/**
 * Service that monitors new RSS releases and automatically triggers downloads
 * for monitored missing episodes.
 */
export class RssTvMonitor {
  constructor(
    private readonly rssSyncService: any,
    private readonly torrentManager: any,
    private readonly prisma: any
  ) {
    this.rssSyncService.on('release:stored', (release: any) => {
      this.handleNewRelease(release).catch(err => {
        console.error('Failed to process new release in RssTvMonitor:', err);
      });
    });
  }

  private async handleNewRelease(release: { title: string; magnetUrl?: string }): Promise<void> {
    if (!release.magnetUrl) return;

    const parsed = Parser.parse(release.title);
    if (parsed && parsed.seriesTitle) {
      // Find matching series
      const series = await this.prisma.series.findFirst({
        where: {
          OR: [
            { title: { contains: parsed.seriesTitle } },
            { cleanTitle: { contains: parsed.seriesTitle.toLowerCase().replace(/\s/g, '') } }
          ],
          monitored: true
        }
      });

      if (series) {
        // Check if episode is monitored and missing
        const episode = await this.prisma.episode.findFirst({
          where: {
            seriesId: series.id,
            seasonNumber: parsed.seasonNumber,
            episodeNumber: parsed.episodeNumbers[0],
            monitored: true,
            path: null
          }
        });

        if (episode) {
          console.log(`RssTvMonitor: Grabbing ${release.title} for ${series.title}`);
          await this.torrentManager.addTorrent({
            magnetUrl: release.magnetUrl
          });
        }
      }
    }
  }
}
