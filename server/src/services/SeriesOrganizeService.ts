import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';

/**
 * Naming token patterns for series folder, season folder and episode file names
 */
const SERIES_NAMING_TOKENS: Record<string, (info: SeriesInfo) => string> = {
  '{Series Title}': info => info.title,
  '{Series TitleFirstCharacter}': info => info.title.charAt(0).toUpperCase(),
  '{Series CleanTitle}': info => sanitize(info.title),
  '{Series TitleThe}': info => sortTitle(info.title),
  '{Release Year}': info => String(info.year),
  '{Season Number}': info => String(info.seasonNumber),
  '{Season Number:00}': info => String(info.seasonNumber).padStart(2, '0'),
  '{Episode Number}': info => String(info.episodeNumber),
  '{Episode Number:00}': info => String(info.episodeNumber).padStart(2, '0'),
  '{Absolute Episode Number}': info => String(info.absoluteEpisodeNumber ?? 0),
  '{Absolute Episode Number:00}': info => String(info.absoluteEpisodeNumber ?? 0).padStart(2, '0'),
  '{Episode Title}': info => info.episodeTitle ?? '',
  '{Quality Title}': info => info.quality ?? '',
  '{Quality Full}': info => info.qualityFull ?? info.quality ?? '',
  '{MediaInfo Simple}': info => info.mediaInfo ?? '',
  '{Resolution}': info => info.resolution ?? '',
  '{Codec}': info => info.codec ?? '',
  '{AudioCodec}': info => info.audioCodec ?? '',
};

interface SeriesInfo {
  title: string;
  year: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  episodeTitle?: string;
  quality?: string;
  qualityFull?: string;
  mediaInfo?: string;
  resolution?: string;
  codec?: string;
  audioCodec?: string;
}

interface EpisodeRenamePreview {
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeId: number;
  episodeNumber: number;
  episodeTitle?: string;
  currentPath: string;
  newPath: string;
  isNewPath: boolean;
}

interface OrganizeResult {
  renamed: number;
  failed: number;
  errors: Array<{ episodeId: number; error: string }>;
}

/**
 * Service to handle series/episode file organization and renaming.
 */
export class SeriesOrganizeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly settings: SeriesManagementSettings
  ) {}

  /**
   * Preview what rename operations would happen for given series IDs.
   */
  async previewRename(seriesIds: number[]): Promise<EpisodeRenamePreview[]> {
    const previews: EpisodeRenamePreview[] = [];

    for (const seriesId of seriesIds) {
      const series = await (this.prisma as any).series.findUnique({
        where: { id: seriesId },
        include: {
          seasons: {
            include: {
              episodes: {
                include: {
                  fileVariants: true,
                },
              },
            },
          },
        },
      });

      if (!series || !series.path) continue;

      for (const season of series.seasons || []) {
        for (const episode of season.episodes || []) {
          for (const variant of episode.fileVariants || []) {
            const seriesInfo: SeriesInfo = {
              title: series.title,
              year: series.year,
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
              episodeTitle: episode.title ?? undefined,
              quality: variant.quality ?? undefined,
              qualityFull: variant.quality ?? undefined,
              resolution: this.extractResolution(variant.quality) || undefined,
            };

            const newFolderPath = this.generateEpisodeFolderPath(seriesInfo, series.path);
            const extension = path.extname(variant.path);
            const newFilename = this.generateEpisodeFilename(seriesInfo, extension);
            const newPath = path.join(newFolderPath, newFilename);

            previews.push({
              seriesId: series.id,
              seriesTitle: series.title,
              seasonNumber: episode.seasonNumber,
              episodeId: episode.id,
              episodeNumber: episode.episodeNumber,
              episodeTitle: episode.title ?? undefined,
              currentPath: variant.path,
              newPath,
              isNewPath: variant.path !== newPath,
            });
          }
        }
      }
    }

    return previews;
  }

  /**
   * Apply rename operations for given series IDs.
   */
  async applyRename(seriesIds: number[]): Promise<OrganizeResult> {
    const result: OrganizeResult = { renamed: 0, failed: 0, errors: [] };
    const previews = await this.previewRename(seriesIds);

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
        await (this.prisma as any).mediaFileVariant.updateMany({
          where: {
            episodeId: preview.episodeId,
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
          episodeId: preview.episodeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Generate the series folder path using the configured format.
   */
  private generateSeriesFolderPath(series: SeriesInfo, rootPath: string): string {
    const folderName = this.applyNamingFormat(this.settings.seriesFolderFormat, series);
    return path.join(rootPath, folderName);
  }

  /**
   * Generate the season folder path using the configured format.
   */
  private generateSeasonFolderPath(series: SeriesInfo, rootPath: string): string {
    const seriesFolder = this.generateSeriesFolderPath(series, rootPath);
    const seasonFolder = this.applyNamingFormat(this.settings.seasonFolderFormat, series);
    return path.join(seriesFolder, seasonFolder);
  }

  /**
   * Generate the episode file folder path (series/season folders combined).
   */
  private generateEpisodeFolderPath(series: SeriesInfo, rootPath: string): string {
    if (this.settings.seasonFolderFormat) {
      return this.generateSeasonFolderPath(series, rootPath);
    }
    return this.generateSeriesFolderPath(series, rootPath);
  }

  /**
   * Generate the episode filename using the configured format.
   */
  private generateEpisodeFilename(series: SeriesInfo, extension: string): string {
    const filename = this.applyNamingFormat(this.settings.episodeFileFormat, series);
    return `${filename}${extension}`;
  }

  /**
   * Apply naming format string with token replacement.
   */
  private applyNamingFormat(format: string, series: SeriesInfo): string {
    let result = format;

    for (const [token, getter] of Object.entries(SERIES_NAMING_TOKENS)) {
      result = result.replace(new RegExp(escapeRegex(token), 'g'), getter(series));
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
 * Series management settings interface.
 */
export interface SeriesManagementSettings {
  seriesFolderFormat: string;
  seasonFolderFormat: string;
  episodeFileFormat: string;
  renameEpisodes: boolean;
}

/**
 * Default series management settings.
 */
export const DEFAULT_SERIES_MANAGEMENT_SETTINGS: SeriesManagementSettings = {
  seriesFolderFormat: '{Series Title}',
  seasonFolderFormat: 'Season {Season Number:00}',
  episodeFileFormat: '{Series Title} - S{Season Number:00}E{Episode Number:00} - {Episode Title} [{Quality Title}]',
  renameEpisodes: true,
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
 * Convert title to "The"-sorted format (e.g., "The Office" -> "Office, The").
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
