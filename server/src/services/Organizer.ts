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
   * Organizes a file to the series/season folder.
   *
   * Default (move: false): hard link preserving source for torrent seeding,
   * with fs.rename fallback on cross-device.
   *
   * move: true: rename (move) first — used when files are already in the media
   * tree so no copy is left behind. Falls back to copy+unlink on cross-device.
   */
  async organizeFile(
    sourcePath: string,
    series: { title: string; path: string },
    episode: { seasonNumber: number; episodeNumber: number; title: string },
    options?: { move?: boolean }
  ): Promise<string> {
    const extension = path.extname(sourcePath);
    const filename = this.buildFilename(series, episode, extension);
    const seasonDir = path.join(
      series.path,
      `Season ${episode.seasonNumber.toString().padStart(2, '0')}`
    );

    await fs.mkdir(seasonDir, { recursive: true });

    const destinationPath = path.join(seasonDir, filename);

    if (path.resolve(sourcePath) === path.resolve(destinationPath)) {
      return destinationPath;
    }

    if (options?.move) {
      await this.moveFile(sourcePath, destinationPath);
    } else {
      try {
        await fs.link(sourcePath, destinationPath);
      } catch {
        console.warn(
          `Hard link failed for "${sourcePath}", falling back to move. ` +
          'Ensure downloads and media are on the same volume for hard link support.'
        );
        await fs.rename(sourcePath, destinationPath);
      }
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
    movie: { title: string; year: number; path: string },
    options?: { move?: boolean }
  ): Promise<string> {
    const extension = path.extname(sourcePath);
    const movieDir = this.resolveMovieDirectory(movie);
    const filename = this.buildMovieFilename(movie, extension);

    await fs.mkdir(movieDir, { recursive: true });

    const destinationPath = path.join(movieDir, filename);

    if (path.resolve(sourcePath) === path.resolve(destinationPath)) {
      return destinationPath;
    }

    if (options?.move) {
      await this.moveFile(sourcePath, destinationPath);
    } else {
      try {
        await fs.link(sourcePath, destinationPath);
      } catch {
        console.warn(
          `Hard link failed for "${sourcePath}", falling back to move. ` +
          'Ensure downloads and media are on the same volume for hard link support.'
        );
        await fs.rename(sourcePath, destinationPath);
      }
    }

    return destinationPath;
  }

  async colocateMovieMetadata(
    movie: { title: string; year: number; path: string },
    filename: string,
    contents: string
  ): Promise<string> {
    const movieDir = this.resolveMovieDirectory(movie);
    await fs.mkdir(movieDir, { recursive: true });

    const destinationPath = path.join(movieDir, filename);
    await fs.writeFile(destinationPath, contents, 'utf8');
    return destinationPath;
  }

  private resolveMovieDirectory(movie: { title: string; year: number; path: string }): string {
    const movieFolderName = this.buildMovieFolderName(movie);
    const basePath = path.normalize(movie.path);
    const leaf = path.basename(basePath);

    // Support both stored forms:
    // 1) root folder path ("/movies") and 2) movie folder path ("/movies/Title (Year)").
    if (leaf.toLowerCase() === movieFolderName.toLowerCase()) {
      return basePath;
    }

    return path.join(basePath, movieFolderName);
  }

  /** Move a file: try fs.rename (atomic, same-fs), fall back to copy+unlink cross-device. */
  private async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await fs.rename(sourcePath, destinationPath);
    } catch (err: any) {
      if (err?.code !== 'EXDEV') throw err;
      // Cross-device: copy then remove source
      await fs.copyFile(sourcePath, destinationPath);
      await fs.unlink(sourcePath);
    }
  }

  private sanitize(name: string): string {
    // Basic sanitization for filenames
    return name.replace(/[\/:*?"<>|]/g, '').trim();
  }
}
