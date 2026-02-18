import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';

/**
 * Naming token patterns for movie folder and file names
 */
const NAMING_TOKENS: Record<string, (movie: MovieInfo) => string> = {
  '{Movie Title}': movie => movie.title,
  '{Movie TitleFirstCharacter}': movie => movie.title.charAt(0).toUpperCase(),
  '{Movie CleanTitle}': movie => sanitize(movie.title),
  '{Movie TitleThe}': movie => sortTitle(movie.title),
  '{Release Year}': movie => String(movie.year),
  '{Quality Title}': movie => movie.quality || '',
  '{Quality Full}': movie => movie.qualityFull || movie.quality || '',
  '{MediaInfo Simple}': movie => movie.mediaInfo || '',
  '{MediaInfo Full}': movie => movie.mediaInfoFull || '',
  '{Resolution}': movie => movie.resolution || '',
  '{Codec}': movie => movie.codec || '',
  '{AudioCodec}': movie => movie.audioCodec || '',
  '{AudioChannels}': movie => movie.audioChannels || '',
};

interface MovieInfo {
  title: string;
  year: number;
  quality?: string | undefined;
  qualityFull?: string | undefined;
  mediaInfo?: string | undefined;
  mediaInfoFull?: string | undefined;
  resolution?: string | undefined;
  codec?: string | undefined;
  audioCodec?: string | undefined;
  audioChannels?: string | undefined;
}

interface OrganizePreview {
  movieId: number;
  movieTitle: string;
  currentPath: string;
  newPath: string;
  isNewPath: boolean;
}

interface OrganizeResult {
  renamed: number;
  failed: number;
  errors: Array<{ movieId: number; error: string }>;
}

/**
 * Service to handle movie file organization and renaming.
 */
export class MovieOrganizeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly settings: MediaManagementSettings
  ) {}

  /**
   * Preview what rename operations would happen for given movie IDs.
   */
  async previewRename(movieIds: number[]): Promise<OrganizePreview[]> {
    const previews: OrganizePreview[] = [];

    for (const movieId of movieIds) {
      const movie = await this.prisma.movie.findUnique({
        where: { id: movieId },
        include: {
          fileVariants: true,
        },
      });

      if (!movie || !movie.path) continue;

      for (const variant of movie.fileVariants) {
        const movieInfo: MovieInfo = {
          title: movie.title,
          year: movie.year,
          quality: variant.quality ?? undefined,
          qualityFull: variant.quality ?? undefined,
          resolution: this.extractResolution(variant.quality) || undefined,
        };

        const newFolderPath = this.generateMovieFolderPath(movieInfo, movie.path);
        const extension = path.extname(variant.path);
        const newFilename = this.generateMovieFilename(movieInfo, extension);
        const newPath = path.join(newFolderPath, newFilename);

        previews.push({
          movieId: movie.id,
          movieTitle: movie.title,
          currentPath: variant.path,
          newPath,
          isNewPath: variant.path !== newPath,
        });
      }
    }

    return previews;
  }

  /**
   * Apply rename operations for given movie IDs.
   */
  async applyRename(movieIds: number[]): Promise<OrganizeResult> {
    const result: OrganizeResult = { renamed: 0, failed: 0, errors: [] };
    const previews = await this.previewRename(movieIds);

    // Only process files that actually need renaming
    const toRename = previews.filter(p => p.isNewPath);

    for (const preview of toRename) {
      try {
        // Ensure destination directory exists
        const destDir = path.dirname(preview.newPath);
        await fs.mkdir(destDir, { recursive: true });

        // Rename the file
        await fs.rename(preview.currentPath, preview.newPath);

        // Update database
        await this.prisma.mediaFileVariant.updateMany({
          where: {
            movieId: preview.movieId,
            path: preview.currentPath,
          },
          data: {
            path: preview.newPath,
          },
        });

        result.renamed++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          movieId: preview.movieId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Generate the movie folder path using the configured format.
   */
  private generateMovieFolderPath(movie: MovieInfo, rootPath: string): string {
    const folderName = this.applyNamingFormat(this.settings.movieFolderFormat, movie);
    return path.join(rootPath, folderName);
  }

  /**
   * Generate the movie filename using the configured format.
   */
  private generateMovieFilename(movie: MovieInfo, extension: string): string {
    const filename = this.applyNamingFormat(this.settings.movieFileFormat, movie);
    return `${filename}${extension}`;
  }

  /**
   * Apply naming format string with token replacement.
   */
  private applyNamingFormat(format: string, movie: MovieInfo): string {
    let result = format;

    for (const [token, getter] of Object.entries(NAMING_TOKENS)) {
      result = result.replace(new RegExp(escapeRegex(token), 'g'), getter(movie));
    }

    // Clean up multiple spaces and trim
    result = result.replace(/\s+/g, ' ').trim();

    // Sanitize for filesystem
    return sanitize(result);
  }

  /**
   * Extract resolution from quality string.
   */
  private extractResolution(quality: string | null): string {
    if (!quality) return '';
    const match = quality.match(/(\d{3,4}p)/);
    return match ? match[1] : '';
  }
}

/**
 * Media management settings interface.
 */
export interface MediaManagementSettings {
  movieFolderFormat: string;
  movieFileFormat: string;
  renameMovies: boolean;
}

/**
 * Default media management settings.
 */
export const DEFAULT_MEDIA_MANAGEMENT_SETTINGS: MediaManagementSettings = {
  movieFolderFormat: '{Movie Title} ({Release Year})',
  movieFileFormat: '{Movie Title} ({Release Year}) {Quality Title}',
  renameMovies: true,
};

/**
 * Sanitize a string for use in filenames.
 */
function sanitize(name: string | undefined): string {
  if (!name) return '';
  return name
    .replace(/[\/:*?"<>|]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Convert title to "The"-sorted format (e.g., "The Matrix" -> "Matrix, The").
 */
function sortTitle(title: string): string {
  const prefix = /^(The|A|An)\s+/i;
  const match = title.match(prefix);
  if (match) {
    return title.replace(prefix, '') + ', ' + match[1];
  }
  return title;
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
