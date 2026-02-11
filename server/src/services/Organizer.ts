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
   * Organizes a file to the series/season folder using hard link with move fallback.
   * Hard links are preferred to save disk space (source stays for seeding).
   * Falls back to fs.rename if hard linking fails (e.g., cross-device).
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

    try {
      await fs.link(sourcePath, destinationPath);
    } catch {
      console.warn(
        `Hard link failed for "${sourcePath}", falling back to move. ` +
        'Ensure downloads and media are on the same volume for hard link support.'
      );
      await fs.rename(sourcePath, destinationPath);
    }

    return destinationPath;
  }

  buildMovieFolderName(movie: { title: string; year: number }): string {
    const cleanTitle = this.sanitize(movie.title);
    return `${cleanTitle} (${movie.year})`;
  }

  buildMovieFilename(movie: { title: string; year: number }, extension: string): string {
    return `${this.buildMovieFolderName(movie)}${extension}`;
  }

  async organizeMovieFile(
    sourcePath: string,
    movie: { title: string; year: number; path: string }
  ): Promise<string> {
    const extension = path.extname(sourcePath);
    const movieFolderName = this.buildMovieFolderName(movie);
    const movieDir = path.join(movie.path, movieFolderName);
    const filename = this.buildMovieFilename(movie, extension);

    await fs.mkdir(movieDir, { recursive: true });

    const destinationPath = path.join(movieDir, filename);

    try {
      await fs.link(sourcePath, destinationPath);
    } catch {
      console.warn(
        `Hard link failed for "${sourcePath}", falling back to move. ` +
        'Ensure downloads and media are on the same volume for hard link support.'
      );
      await fs.rename(sourcePath, destinationPath);
    }

    return destinationPath;
  }

  async colocateMovieMetadata(
    movie: { title: string; year: number; path: string },
    filename: string,
    contents: string
  ): Promise<string> {
    const movieFolderName = this.buildMovieFolderName(movie);
    const movieDir = path.join(movie.path, movieFolderName);
    await fs.mkdir(movieDir, { recursive: true });

    const destinationPath = path.join(movieDir, filename);
    await fs.writeFile(destinationPath, contents, 'utf8');
    return destinationPath;
  }

  private sanitize(name: string): string {
    // Basic sanitization for filenames
    return name.replace(/[\/:*?"<>|]/g, '').trim();
  }
}
