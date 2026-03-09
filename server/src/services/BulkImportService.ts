import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { MetadataProvider } from './MetadataProvider';
import { Organizer } from './Organizer';
import { SubtitleVariantRepository, type UpsertVariantInput } from '../repositories/SubtitleVariantRepository';
import type { ScannedFile } from './ExistingLibraryScanner';
import { sanitizeTitle, toSortTitle } from '../utils/stringUtils';

function isInsideRoot(filePath: string, rootPath: string): boolean {
  const normalizedFile = path.resolve(filePath);
  const normalizedRoot = path.resolve(rootPath);
  return normalizedFile.startsWith(normalizedRoot + path.sep) || normalizedFile === normalizedRoot;
}

export interface ImportMatchItem {
  folderPath: string;
  mediaType: 'movie' | 'series';
  matchId: number;
  files: ScannedFile[];
  renameFiles: boolean;
  rootFolderPath: string;
  qualityProfileId: number;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{ folderPath: string; error: string }>;
}

type MetadataProviderDeps = Pick<MetadataProvider, 'getMediaDetails' | 'getSeriesDetails'>;

export class BulkImportService {
  private readonly organizer: Organizer;
  private readonly variantRepo: SubtitleVariantRepository;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly metadataProvider: MetadataProviderDeps,
  ) {
    this.organizer = new Organizer();
    this.variantRepo = new SubtitleVariantRepository(prisma);
  }

  private static readonly IMPORT_CONCURRENCY = 5;

  private static async withConcurrencyLimit<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<R>,
  ): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let next = 0;

    async function worker(): Promise<void> {
      while (next < items.length) {
        const i = next++;
        try {
          results[i] = { status: 'fulfilled', value: await fn(items[i]!) };
        } catch (reason) {
          results[i] = { status: 'rejected', reason };
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, worker),
    );
    return results;
  }

  async executeImport(items: ImportMatchItem[]): Promise<ImportResult> {
    // Deduplicate by matchId+mediaType: merge files from duplicate folders into one item
    const deduped = new Map<string, ImportMatchItem>();
    for (const item of items) {
      const key = `${item.mediaType}:${item.matchId}`;
      const existing = deduped.get(key);
      if (existing) {
        existing.files = [...existing.files, ...item.files];
      } else {
        deduped.set(key, { ...item, files: [...item.files] });
      }
    }
    const dedupedItems = Array.from(deduped.values());

    const outcomes = await BulkImportService.withConcurrencyLimit(
      dedupedItems,
      BulkImportService.IMPORT_CONCURRENCY,
      (item) => item.mediaType === 'movie' ? this.importMovie(item) : this.importSeries(item),
    );

    const result: ImportResult = { imported: 0, failed: 0, errors: [] };

    for (let i = 0; i < outcomes.length; i++) {
      const outcome = outcomes[i]!;
      if (outcome.status === 'fulfilled') {
        result.imported++;
      } else {
        result.failed++;
        const message = outcome.reason instanceof Error ? outcome.reason.message : 'Unknown error';
        console.error(`[BulkImport] Failed to import "${dedupedItems[i]!.folderPath}": ${message}`);
        result.errors.push({ folderPath: dedupedItems[i]!.folderPath, error: message });
      }
    }

    return result;
  }

  private async importMovie(item: ImportMatchItem): Promise<void> {
    const movieData = await this.metadataProvider.getMediaDetails({
      mediaType: 'MOVIE',
      tmdbId: item.matchId,
    });

    if (!movieData.tmdbId) {
      throw new Error('TMDB ID is required for movie import');
    }

    const cleanTitle = sanitizeTitle(movieData.title);
    const moviePath = item.renameFiles
      ? `${item.rootFolderPath}/${cleanTitle} (${movieData.year})`
      : item.folderPath;

    // Find existing record by tmdbId OR imdbId — the DB may have this movie
    // already (e.g. added via search) stored with a different unique-key pairing.
    const orConditions: object[] = [{ tmdbId: movieData.tmdbId }];
    if (movieData.imdbId) orConditions.push({ imdbId: movieData.imdbId });

    const existing = await (this.prisma as any).movie.findFirst({
      where: { OR: orConditions },
      select: { id: true },
    });

    const movie = existing
      ? await (this.prisma as any).movie.findUnique({ where: { id: existing.id } })
      : await (this.prisma as any).movie.create({
          data: {
            tmdbId: movieData.tmdbId,
            imdbId: movieData.imdbId,
            title: movieData.title,
            cleanTitle,
            sortTitle: toSortTitle(movieData.title),
            status: movieData.status ?? 'released',
            overview: movieData.overview,
            monitored: true,
            qualityProfileId: item.qualityProfileId,
            path: moviePath,
            year: movieData.year ?? 0,
            posterUrl: movieData.images?.[0]?.url,
          },
        });

    for (const file of item.files) {
      let filePath = file.path;

      if (item.renameFiles && !isInsideRoot(file.path, item.rootFolderPath)) {
        filePath = await this.organizer.organizeMovieFile(file.path, {
          title: movie.title,
          year: movie.year,
          path: moviePath,
        }, { move: true });
      }

      await this.variantRepo.upsertVariant(this.buildVariantInput('MOVIE', { movieId: movie.id }, file, filePath));
    }
  }

  private async importSeries(item: ImportMatchItem): Promise<void> {
    const seriesData = await this.metadataProvider.getSeriesDetails(item.matchId);

    const cleanTitle = sanitizeTitle(seriesData.series.title);
    const seriesPath = item.renameFiles
      ? `${item.rootFolderPath}/${cleanTitle}`
      : item.folderPath;

    const seriesOrConditions: object[] = [{ tvdbId: seriesData.series.tvdbId }];
    if (seriesData.series.imdbId) seriesOrConditions.push({ imdbId: seriesData.series.imdbId });

    const existingSeries = await (this.prisma as any).series.findFirst({
      where: { OR: seriesOrConditions },
      select: { id: true },
    });

    const series = existingSeries
      ? await (this.prisma as any).series.findUnique({ where: { id: existingSeries.id } })
      : await (this.prisma as any).series.create({
          data: {
            tvdbId: seriesData.series.tvdbId,
            title: seriesData.series.title,
            cleanTitle,
            sortTitle: toSortTitle(seriesData.series.title),
            status: seriesData.series.status ?? 'continuing',
            overview: seriesData.series.overview,
            monitored: true,
            qualityProfileId: item.qualityProfileId,
            path: seriesPath,
            year: seriesData.series.year ?? 0,
            network: seriesData.series.network,
            posterUrl: seriesData.series.images?.[0]?.url,
          },
        });

    const seasonMap = new Map<number, number>();

    // Pre-index files by "seasonxepisode" for O(1) lookup during episode loop
    const filesByEpisode = new Map<string, ScannedFile>();
    for (const f of item.files) {
      const parsed = f.parsedInfo;
      if (parsed?.seasonNumber !== undefined) {
        for (const epNum of parsed.episodeNumbers ?? []) {
          filesByEpisode.set(`${parsed.seasonNumber}x${epNum}`, f);
        }
      }
    }

    for (const ep of seriesData.episodes) {
      if (!seasonMap.has(ep.seasonNumber)) {
        const season = await (this.prisma as any).season.upsert({
          where: { seriesId_seasonNumber: { seriesId: series.id, seasonNumber: ep.seasonNumber } },
          create: { seriesId: series.id, seasonNumber: ep.seasonNumber, monitored: true },
          update: {},
        });
        seasonMap.set(ep.seasonNumber, season.id);
      }

      const rawAirDate = ep.airDateUtc ?? ep.airDate;
      const episode = await (this.prisma as any).episode.upsert({
        where: { tvdbId: ep.tvdbId ?? ep.id },
        create: {
          seriesId: series.id,
          seasonId: seasonMap.get(ep.seasonNumber),
          tvdbId: ep.tvdbId ?? ep.id,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          title: ep.title ?? `Episode ${ep.episodeNumber}`,
          airDateUtc: rawAirDate ? new Date(rawAirDate) : null,
          overview: ep.overview,
          monitored: true,
        },
        update: {},
      });

      const matchingFile = filesByEpisode.get(`${ep.seasonNumber}x${ep.episodeNumber}`);

      if (matchingFile) {
        let filePath = matchingFile.path;

        if (item.renameFiles && !isInsideRoot(matchingFile.path, item.rootFolderPath)) {
          filePath = await this.organizer.organizeFile(
            matchingFile.path,
            { title: series.title, path: seriesPath },
            {
              seasonNumber: ep.seasonNumber,
              episodeNumber: ep.episodeNumber,
              title: episode.title,
            },
            { move: true },
          );
        }

        // Set episode.path so the UI correctly shows the episode as "on disk"
        await (this.prisma as any).episode.update({
          where: { id: episode.id },
          data: { path: filePath },
        });

        await this.variantRepo.upsertVariant(this.buildVariantInput('EPISODE', { episodeId: episode.id }, matchingFile, filePath));
      }
    }
  }

  private buildVariantInput(
    mediaType: 'MOVIE' | 'EPISODE',
    owner: { movieId?: number; episodeId?: number },
    file: ScannedFile,
    filePath: string,
  ): UpsertVariantInput {
    return {
      mediaType,
      ...owner,
      path: filePath,
      fileSize: BigInt(file.size),
      ...(file.parsedInfo?.quality ? { quality: file.parsedInfo.quality } : {}),
    };
  }

}
