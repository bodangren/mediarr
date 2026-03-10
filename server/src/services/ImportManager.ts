import { Parser } from '../utils/Parser';
import { Organizer } from './Organizer';
import { ActivityEventEmitter } from './ActivityEventEmitter';
import type { NotificationDispatchService } from './NotificationDispatchService';
import path from 'node:path';
import fs from 'node:fs/promises';

interface CompletedTorrentPayload {
  infoHash: string;
  name: string;
  path: string;
}

interface MediaRootFolders {
  movieRootFolder: string;
  tvRootFolder: string;
}

interface ImportHooks {
  onMovieImported?: (movieId: number) => Promise<void> | void;
  onEpisodeImported?: (episodeId: number) => Promise<void> | void;
}

/**
 * Service to bridge TorrentManager and Organizer for completed torrent imports.
 * Listens for completed torrents and attempts to import them if they match a known
 * movie or TV series/episode.
 */
export class ImportManager {
  constructor(
    private readonly torrentManager: any,
    private readonly organizer: Organizer,
    private readonly prisma: any,
    private readonly activityEventEmitter?: ActivityEventEmitter,
    private readonly hooks: ImportHooks = {},
    private readonly notificationDispatchService?: NotificationDispatchService,
  ) {
    if (typeof this.torrentManager?.on === 'function') {
      this.torrentManager.on('torrent:completed', (torrent: any) => {
        this.importCompletedTorrent(torrent).catch(() => {
          // Activity error is emitted in importCompletedTorrent.
        });
      });

      this.torrentManager.on('torrent:seeding_complete', (payload: any) => {
        this.activityEventEmitter?.emit({
          eventType: 'SEEDING_COMPLETE',
          sourceModule: 'torrent-manager',
          entityRef: `torrent:${payload.infoHash}`,
          summary: `Seeding limit reached for ${payload.name}`,
          success: true,
          details: {
            reason: payload.reason,
            torrentName: payload.name,
          },
          occurredAt: new Date(),
        }).catch((err) => console.error('Failed to log SEEDING_COMPLETE:', err));
      });
    }
  }

  /**
   * Retries import for a persisted torrent row by infoHash.
   */
  async retryImportByInfoHash(infoHash: string): Promise<void> {
    const torrent = await this.prisma.torrent?.findUnique?.({
      where: { infoHash },
      select: {
        infoHash: true,
        name: true,
        path: true,
      },
    });

    if (!torrent) {
      throw new Error(`Torrent '${infoHash}' not found`);
    }

    const importPath = await this.resolveRetryImportPath(torrent.path, torrent.name);
    await this.importCompletedTorrent({
      infoHash: torrent.infoHash,
      name: torrent.name,
      path: importPath,
    });
  }

  /**
   * Retries import from a failed activity event row.
   */
  async retryImportByActivityEventId(id: number): Promise<void> {
    const event = await this.prisma.activityEvent?.findUnique?.({
      where: { id },
      select: {
        id: true,
        eventType: true,
        entityRef: true,
        details: true,
      },
    });

    if (!event) {
      throw new Error(`Activity event '${id}' not found`);
    }

    if (event.eventType !== 'IMPORT_FAILED') {
      throw new Error(`Activity event '${id}' is not an import failure`);
    }

    const infoHash = this.parseInfoHash(event.entityRef);
    if (infoHash) {
      try {
        await this.retryImportByInfoHash(infoHash);
        return;
      } catch {
        // Fall back to sourcePath when torrent row no longer exists.
      }
    }

    const details = this.readObject(event.details);
    const sourcePath = this.readString(details.sourcePath);
    if (!sourcePath) {
      throw new Error(`Activity event '${id}' has no retryable source path`);
    }

    const torrentName = this.readString(details.torrentName) ?? path.basename(sourcePath);
    await this.importCompletedTorrent({
      infoHash: infoHash ?? `activity:${id}`,
      name: torrentName,
      path: sourcePath,
    });
  }

  private async importCompletedTorrent(torrent: CompletedTorrentPayload): Promise<void> {
    try {
      await this.handleTorrentCompleted(torrent);
    } catch (err) {
      console.error('Failed to import completed torrent:', err);
      await this.activityEventEmitter?.emit({
        eventType: 'IMPORT_FAILED',
        sourceModule: 'import-manager',
        entityRef: `torrent:${torrent.infoHash}`,
        summary: `Import failed for ${torrent.name}`,
        success: false,
        details: {
          sourcePath: torrent.path,
          torrentName: torrent.name,
          reason: err instanceof Error ? err.message : 'unknown error',
        },
        occurredAt: new Date(),
      });
      throw err;
    }
  }

  private async handleTorrentCompleted(torrent: CompletedTorrentPayload): Promise<void> {
    const files = await this.getFiles(torrent.path);

    // Fetch the torrent row once so we can use its linked episode/movie IDs.
    const torrentRow = await this.prisma.torrent?.findUnique?.({
      where: { infoHash: torrent.infoHash },
      select: { episodeId: true, movieId: true },
    });

    for (const filePath of files) {
      const filename = path.basename(filePath);

      // ── Fast path: torrent was grabbed for a known episode ───────────────
      const linkedEpisodeId = torrentRow?.episodeId ?? null;
      if (linkedEpisodeId) {
        const episode = await this.prisma.episode.findUnique({
          where: { id: linkedEpisodeId },
          include: { season: { include: { series: true } } },
        });

        if (episode?.season?.series) {
          const series = episode.season.series;
          const seriesPath = await this.resolveSeriesPath(series);
          if (!seriesPath) {
            await this.activityEventEmitter?.emit({
              eventType: 'IMPORT_FAILED',
              sourceModule: 'import-manager',
              entityRef: `torrent:${torrent.infoHash}`,
              summary: `No TV root folder configured for ${series.title}`,
              success: false,
              details: {
                sourcePath: filePath,
                torrentName: torrent.name,
                reason: 'series.path is null and no TV root folder is configured',
              },
              occurredAt: new Date(),
            });
            continue;
          }

          const newPath = await this.organizer.organizeFile(filePath, { ...series, path: seriesPath }, episode);
          await this.prisma.episode.update({ where: { id: episode.id }, data: { path: newPath } });
          await this.prisma.mediaFileVariant.upsert({
            where: { mediaType_path: { mediaType: 'EPISODE', path: newPath } },
            create: { mediaType: 'EPISODE', episodeId: episode.id, path: newPath, fileSize: BigInt(0) },
            update: { episodeId: episode.id },
          });

          await this.activityEventEmitter?.emit({
            eventType: 'SERIES_IMPORTED',
            sourceModule: 'import-manager',
            entityRef: `torrent:${torrent.infoHash}`,
            summary: `Imported episode ${filename}`,
            success: true,
            details: { sourcePath: filePath, torrentName: torrent.name },
            occurredAt: new Date(),
          });

          void this.notificationDispatchService?.notifyDownload({
            title: `${episode.season?.series?.title ?? series?.title ?? torrent.name} - ${filename}`,
            mediaType: 'episode',
          });

          await this.runImportHook('onEpisodeImported', episode.id);
          continue;
        }
      }

      // ── Fast path: torrent was grabbed for a known movie ─────────────────
      const linkedMovieId = torrentRow?.movieId ?? null;
      if (linkedMovieId) {
        const movie = await this.prisma.movie.findUnique({ where: { id: linkedMovieId } });

        if (movie) {
          const moviePath = await this.resolveMoviePath(movie);
          if (!moviePath) {
            await this.activityEventEmitter?.emit({
              eventType: 'IMPORT_FAILED',
              sourceModule: 'import-manager',
              entityRef: `torrent:${torrent.infoHash}`,
              summary: `No movie root folder configured for ${movie.title}`,
              success: false,
              details: {
                sourcePath: filePath,
                torrentName: torrent.name,
                reason: 'movie.path is null and no movie root folder is configured',
              },
              occurredAt: new Date(),
            });
            continue;
          }

          const newPath = await this.organizer.organizeMovieFile(filePath, { ...movie, path: moviePath });
          await this.prisma.mediaFileVariant.upsert({
            where: { mediaType_path: { mediaType: 'MOVIE', path: newPath } },
            create: { mediaType: 'MOVIE', movieId: movie.id, path: newPath, fileSize: BigInt(0) },
            update: { movieId: movie.id },
          });

          await this.activityEventEmitter?.emit({
            eventType: 'MOVIE_IMPORTED',
            sourceModule: 'import-manager',
            entityRef: `torrent:${torrent.infoHash}`,
            summary: `Imported movie ${filename}`,
            success: true,
            details: { sourcePath: filePath, torrentName: torrent.name },
            occurredAt: new Date(),
          });

          void this.notificationDispatchService?.notifyDownload({
            title: movie.title,
            mediaType: 'movie',
          });

          await this.runImportHook('onMovieImported', movie.id);
          continue;
        }
      }

      const parsed = Parser.parse(filename);

      // ── Try episode import ──────────────────────────────────────────────
      let seriesTitle = parsed?.seriesTitle;

      if (parsed && !seriesTitle) {
        const torrentParsed = Parser.parse(torrent.name);
        if (torrentParsed?.seriesTitle) {
          seriesTitle = torrentParsed.seriesTitle;
        } else {
          let dirTitle = Parser.parseDirectory(torrent.name)?.title || torrent.name;
          
          const seasonMatch = dirTitle.match(/(?:S\d{1,2}|Season\s*\d{1,2})\b/i);
          if (seasonMatch && seasonMatch.index !== undefined && seasonMatch.index > 0) {
             dirTitle = dirTitle.substring(0, seasonMatch.index);
          }
          
          const qualityMatch = dirTitle.search(/\d{3,4}p|BluRay|WEB|HDTV/i);
          if (qualityMatch > 0) {
             dirTitle = dirTitle.substring(0, qualityMatch);
          }
          
          seriesTitle = dirTitle.replace(/[._\- ]+$/, '').replace(/[._]/g, ' ').trim();
        }
      }

      if (parsed && seriesTitle) {
        // Strip a trailing year that release groups embed before the episode marker
        // e.g. "Archer 2009" from "Archer.2009.S09E05..." → "Archer"
        seriesTitle = seriesTitle.replace(/\s+(19|20)\d{2}$/, '').trim() || seriesTitle;
        const cleanSearchTitle = seriesTitle.toLowerCase().replace(/[^\w]/g, '');
        const series = await this.prisma.series.findFirst({
          where: {
            OR: [
              { title: { contains: seriesTitle } },
              { cleanTitle: { contains: cleanSearchTitle } },
            ],
          },
        });

        if (series) {
          const episode = await this.prisma.episode.findFirst({
            where: {
              seriesId: series.id,
              seasonNumber: parsed.seasonNumber,
              episodeNumber: parsed.episodeNumbers[0],
            },
          });

          if (episode) {
            const seriesPath = await this.resolveSeriesPath(series);
            if (!seriesPath) {
              await this.activityEventEmitter?.emit({
                eventType: 'IMPORT_FAILED',
                sourceModule: 'import-manager',
                entityRef: `torrent:${torrent.infoHash}`,
                summary: `No TV root folder configured for ${series.title}`,
                success: false,
                details: {
                  sourcePath: filePath,
                  torrentName: torrent.name,
                  reason: 'series.path is null and no TV root folder is configured',
                },
                occurredAt: new Date(),
              });
              continue;
            }

            const newPath = await this.organizer.organizeFile(
              filePath,
              {
                ...series,
                path: seriesPath,
              },
              episode,
            );
            await this.prisma.episode.update({
              where: { id: episode.id },
              data: { path: newPath },
            });
            await this.prisma.mediaFileVariant.upsert({
              where: { mediaType_path: { mediaType: 'EPISODE', path: newPath } },
              create: { mediaType: 'EPISODE', episodeId: episode.id, path: newPath, fileSize: BigInt(0) },
              update: { episodeId: episode.id },
            });

            await this.activityEventEmitter?.emit({
              eventType: 'SERIES_IMPORTED',
              sourceModule: 'import-manager',
              entityRef: `torrent:${torrent.infoHash}`,
              summary: `Imported episode ${filename}`,
              success: true,
              details: { sourcePath: filePath, torrentName: torrent.name },
              occurredAt: new Date(),
            });

            void this.notificationDispatchService?.notifyDownload({
              title: `${series.title} - ${filename}`,
              mediaType: 'episode',
            });

            await this.runImportHook('onEpisodeImported', episode.id);
            continue;
          }
        }
      }

      // ── Try movie import ────────────────────────────────────────────────
      // When the parser finds no episode pattern, attempt to match as a movie
      // by parsing release-style filenames and matching against movie title/year.
      if (!parsed) {
        const movie = await this.findMovieMatch(filePath);

        if (movie) {
          const moviePath = await this.resolveMoviePath(movie);
          if (!moviePath) {
            await this.activityEventEmitter?.emit({
              eventType: 'IMPORT_FAILED',
              sourceModule: 'import-manager',
              entityRef: `torrent:${torrent.infoHash}`,
              summary: `No movie root folder configured for ${movie.title}`,
              success: false,
              details: {
                sourcePath: filePath,
                torrentName: torrent.name,
                reason: 'movie.path is null and no movie root folder is configured',
              },
              occurredAt: new Date(),
            });
            continue;
          }

          const newPath = await this.organizer.organizeMovieFile(
            filePath,
            {
              ...movie,
              path: moviePath,
            },
          );
          await this.prisma.mediaFileVariant.upsert({
            where: { mediaType_path: { mediaType: 'MOVIE', path: newPath } },
            create: {
              mediaType: 'MOVIE',
              movieId: movie.id,
              path: newPath,
              fileSize: BigInt(0),
            },
            update: { movieId: movie.id },
          });

          await this.activityEventEmitter?.emit({
            eventType: 'MOVIE_IMPORTED',
            sourceModule: 'import-manager',
            entityRef: `torrent:${torrent.infoHash}`,
            summary: `Imported movie ${filename}`,
            success: true,
            details: { sourcePath: filePath, torrentName: torrent.name },
            occurredAt: new Date(),
          });

          void this.notificationDispatchService?.notifyDownload({
            title: movie.title,
            mediaType: 'movie',
          });

          await this.runImportHook('onMovieImported', movie.id);
          continue;
        }
      }

      // ── No match ────────────────────────────────────────────────────────
      await this.activityEventEmitter?.emit({
        eventType: 'IMPORT_FAILED',
        sourceModule: 'import-manager',
        entityRef: `torrent:${torrent.infoHash}`,
        summary: `No match found for ${filename}`,
        success: false,
        details: {
          sourcePath: filePath,
          torrentName: torrent.name,
          reason: 'no match found in library',
        },
        occurredAt: new Date(),
      });
    }
  }

  private async getFiles(dir: string): Promise<string[]> {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      return [dir];
    }

    const results: string[] = [];
    const list = await fs.readdir(dir);

    for (const file of list) {
      const filePath = path.join(dir, file);
      const fileStat = await fs.stat(filePath);

      if (fileStat.isDirectory()) {
        const subFiles = await this.getFiles(filePath);
        results.push(...subFiles);
      } else {
        const ext = path.extname(filePath).toLowerCase();
        if (['.mkv', '.mp4', '.avi', '.ts', '.m4v'].includes(ext)) {
          results.push(filePath);
        }
      }
    }

    return results;
  }

  private async runImportHook(
    hookName: keyof ImportHooks,
    mediaId: number,
  ): Promise<void> {
    const hook = this.hooks[hookName];
    if (!hook) {
      return;
    }

    try {
      await hook(mediaId);
    } catch (error) {
      console.warn(`[ImportManager] ${hookName} hook failed for media id ${mediaId}:`, error);
    }
  }

  private async resolveRetryImportPath(basePath: unknown, torrentName: unknown): Promise<string> {
    const rootPath = this.readString(basePath);
    if (!rootPath) {
      throw new Error('Torrent path is missing');
    }

    const name = this.readString(torrentName);
    const candidates = [
      name ? path.join(rootPath, name) : null,
      rootPath,
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
      if (await this.pathExists(candidate)) {
        return candidate;
      }
    }

    throw new Error(`No importable files found at '${rootPath}'`);
  }

  private async resolveSeriesPath(series: any): Promise<string | null> {
    const existing = this.readString(series?.path);
    if (existing) {
      return existing;
    }

    const rootFolders = await this.getMediaRootFolders();
    if (!rootFolders.tvRootFolder) {
      return null;
    }

    const resolved = this.buildMediaFolderPath(rootFolders.tvRootFolder, series.title, series.year);

    await this.prisma.series?.update?.({
      where: { id: series.id },
      data: { path: resolved },
    });

    return resolved;
  }

  private async resolveMoviePath(movie: any): Promise<string | null> {
    const existing = this.readString(movie?.path);
    if (existing) {
      return existing;
    }

    const rootFolders = await this.getMediaRootFolders();
    if (!rootFolders.movieRootFolder) {
      return null;
    }

    const resolved = this.buildMediaFolderPath(rootFolders.movieRootFolder, movie.title, movie.year);

    await this.prisma.movie?.update?.({
      where: { id: movie.id },
      data: { path: resolved },
    });

    return resolved;
  }

  private async getMediaRootFolders(): Promise<MediaRootFolders> {
    const settings = await this.prisma.appSettings?.findUnique?.({
      where: { id: 1 },
      select: { mediaManagement: true },
    });

    const mediaManagement = this.readObject(settings?.mediaManagement);

    return {
      movieRootFolder: this.readString(mediaManagement.movieRootFolder) ?? '',
      tvRootFolder: this.readString(mediaManagement.tvRootFolder) ?? '',
    };
  }

  private buildMediaFolderPath(rootFolder: string, title: unknown, year: unknown): string {
    const cleanRoot = rootFolder.trim();
    const cleanTitle = (this.readString(title) ?? 'Unknown').trim();
    const numericYear = typeof year === 'number' && Number.isFinite(year) ? year : null;
    const folderName = numericYear ? `${cleanTitle} (${numericYear})` : cleanTitle;
    return path.join(cleanRoot, folderName);
  }

  private parseInfoHash(entityRef: unknown): string | null {
    const text = this.readString(entityRef);
    if (!text) {
      return null;
    }
    if (!text.startsWith('torrent:')) {
      return null;
    }
    const infoHash = text.slice('torrent:'.length).trim();
    return infoHash.length > 0 ? infoHash : null;
  }

  private readObject(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async findMovieMatch(filePath: string): Promise<any | null> {
    const parsedMovie = this.parseMovieTitle(path.basename(filePath));
    if (!parsedMovie) {
      return null;
    }

    const cleanTitle = this.normalizeMovieTitle(parsedMovie.title);
    if (!cleanTitle) {
      return null;
    }

    const matchClauses = [
      { title: { contains: parsedMovie.title } },
      { cleanTitle: { contains: cleanTitle } },
    ];

    if (parsedMovie.year) {
      const yearScopedMatch = await this.prisma.movie.findFirst({
        where: {
          year: parsedMovie.year,
          OR: matchClauses,
        },
      });
      if (yearScopedMatch) {
        return yearScopedMatch;
      }
    }

    return this.prisma.movie.findFirst({
      where: {
        OR: matchClauses,
      },
    });
  }

  private parseMovieTitle(filename: string): { title: string; year?: number } | null {
    const basename = path.basename(filename, path.extname(filename));
    const normalized = basename.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return null;
    }

    const yearMatch = normalized.match(/^(.*?)(?:\s+)(19\d{2}|20\d{2})(?:\s|$)/i);
    if (yearMatch) {
      const title = yearMatch[1]?.trim();
      const year = parseInt(yearMatch[2], 10);
      if (title) {
        return {
          title,
          year: Number.isFinite(year) ? year : undefined,
        };
      }
    }

    const qualityMatch = normalized.match(/^(.*?)(?:\s+)(2160p|1080p|720p|480p|bluray|brrip|webrip|web[- ]dl|hdtv|x264|x265|h264|h265)\b/i);
    if (qualityMatch) {
      const title = qualityMatch[1]?.trim();
      if (title) {
        return { title };
      }
    }

    return { title: normalized };
  }

  private normalizeMovieTitle(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
}
