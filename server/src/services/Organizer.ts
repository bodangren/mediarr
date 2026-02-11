import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Service to organize, rename, and move media files to their final destination.
 */
export class Organizer {
  /**
   * Builds a standardized filename for an episode.
   */
  buildFilename(
    series: { title: string },
    episode: { seasonNumber: number; episodeNumber: number; title: string },
    extension: string
  ): string {
    const s = episode.seasonNumber.toString().padStart(2, '0');
    const e = episode.episodeNumber.toString().padStart(2, '0');
    const cleanSeriesTitle = this.sanitize(series.title);
    const cleanEpisodeTitle = this.sanitize(episode.title);

    return `${cleanSeriesTitle} - S${s}E${e} - ${cleanEpisodeTitle}${extension}`;
  }

  /**
   * Moves and renames a file to the series/season folder.
   */
  async organizeFile(
    sourcePath: string,
    series: { title: string; path: string },
    episode: { seasonNumber: number; episodeNumber: number; title: string }
  ): Promise<string> {
    const extension = path.extname(sourcePath);
    const filename = this.buildFilename(series, episode, extension);
    const seasonDir = path.join(
      series.path,
      `Season ${episode.seasonNumber.toString().padStart(2, '0')}`
    );

    await fs.mkdir(seasonDir, { recursive: true });

    const destinationPath = path.join(seasonDir, filename);
    await fs.rename(sourcePath, destinationPath);

    return destinationPath;
  }

  private sanitize(name: string): string {
    // Basic sanitization for filenames
    return name.replace(/[\/:*?"<>|]/g, '').trim();
  }
}
