import { ExistingLibraryScanner } from './ExistingLibraryScanner';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';

/**
 * Links files that are already on disk to their episode rows.
 *
 * The import path (download → move into `/data`) and the registration path
 * (episode row ↔ MediaFileVariant) were only joined by the *manual* per-series
 * rescan route. After an unattended import the files were in the library but the
 * engine did not know about them, so the client reported "Missing" for content
 * that was sitting on disk (measured 2026-11-17: American Dad! S22 0/13,
 * Lioness S03 0/8, OITNB S05 0/13 while all the files were present).
 *
 * This service is the missing half of the scheduled scan: it only looks at
 * series that have at least one episode without a file variant, so a healthy
 * library costs one cheap query per pass and no folder walk at all.
 */
export interface EpisodeFileLinkSummary {
  seriesWithMissingFiles: number;
  seriesScanned: number;
  filesLinked: number;
  failures: number;
  durationMs: number;
}

interface EpisodeRow {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
}

/** Minimal shape of the folder scan this service needs (test seam). */
export interface FolderScannerLike {
  scan(rootPath: string): Promise<{
    folders: Array<{
      files: Array<{
        path: string;
        size: number;
        parsedInfo?: {
          seasonNumber?: number | null;
          episodeNumbers?: number[] | null;
        } | null;
      }>;
    }>;
  }>;
}

/** Minimal shape of the variant writer this service needs (test seam). */
export interface VariantWriterLike {
  upsertVariant(input: {
    mediaType: 'EPISODE';
    episodeId: number;
    path: string;
    fileSize: number;
  }): Promise<unknown>;
}

export class EpisodeFileLinker {
  constructor(
    private readonly prisma: any,
    private readonly deps: {
      scanner?: FolderScannerLike;
      variants?: VariantWriterLike;
    } = {},
  ) {}

  /** Series already scanned recently, so a healthy-ish library is not re-walked
   * every 15 minutes (the USB drive is slow and the folder walk is the cost). */
  private readonly lastScannedAt = new Map<number, number>();

  private get scanner(): FolderScannerLike {
    return this.deps.scanner ?? (new ExistingLibraryScanner() as unknown as FolderScannerLike);
  }

  private get variants(): VariantWriterLike {
    return this.deps.variants ?? (new SubtitleVariantRepository(this.prisma) as unknown as VariantWriterLike);
  }

  /**
   * Series that have episodes but at least one of them has no file variant.
   *
   * Two flat queries and an in-memory join: the library has a few thousand
   * episodes and a few thousand variants, so this is cheaper and far more
   * portable than a raw SQL join (and it works against the test doubles).
   */
  async seriesWithMissingFiles(limit = 25): Promise<number[]> {
    const episodes: Array<{ id: number; seriesId: number; seasonNumber: number }> =
      await this.prisma.episode.findMany({
        select: { id: true, seriesId: true, seasonNumber: true },
      });
    const variants: Array<{ episodeId: number | null }> = await this.prisma.mediaFileVariant.findMany({
      where: { mediaType: 'EPISODE' },
      select: { episodeId: true },
    });

    const linked = new Set<number>();
    for (const variant of variants) {
      if (variant.episodeId != null) linked.add(Number(variant.episodeId));
    }

    const cooldownMs = 6 * 60 * 60 * 1000;
    const now = Date.now();
    const missingBySeries = new Map<number, number>();
    for (const episode of episodes) {
      // Season 0 holds specials, which legitimately have no episode file; they
      // would otherwise make every series look permanently incomplete.
      if (Number(episode.seasonNumber) === 0) continue;
      if (!linked.has(Number(episode.id))) {
        const seriesId = Number(episode.seriesId);
        missingBySeries.set(seriesId, (missingBySeries.get(seriesId) ?? 0) + 1);
      }
    }
    return [...missingBySeries.keys()]
      .filter(seriesId => {
        const scannedAt = this.lastScannedAt.get(seriesId) ?? 0;
        return now - scannedAt > cooldownMs;
      })
      .slice(0, limit);
  }

  /**
   * Link every episode of one series whose file is findable in its folder.
   *
   * Returns the number of files linked. A missing/unreadable folder is not an
   * error: the series may legitimately live on a drive that is not mounted.
   */
  async linkSeries(seriesId: number): Promise<number> {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      select: { id: true, path: true },
    });
    const seriesPath: string | null = series?.path ?? null;
    if (!seriesPath) return 0;

    const episodes: EpisodeRow[] = await this.prisma.episode.findMany({
      where: { seriesId },
      select: { id: true, seasonNumber: true, episodeNumber: true },
    });
    if (episodes.length === 0) return 0;

    const episodeIndex = new Map<string, number>();
    for (const episode of episodes) {
      episodeIndex.set(`${episode.seasonNumber}x${episode.episodeNumber}`, episode.id);
    }

    let scanResult;
    try {
      scanResult = await this.scanner.scan(seriesPath);
    } catch {
      return 0;
    }

    const variants = this.variants;
    const linked = new Set<number>();
    for (const folder of scanResult.folders) {
      for (const file of folder.files) {
        const parsed = file.parsedInfo;
        if (!parsed?.seasonNumber || !parsed.episodeNumbers?.length) continue;
        for (const episodeNumber of parsed.episodeNumbers) {
          const episodeId = episodeIndex.get(`${parsed.seasonNumber}x${episodeNumber}`);
          if (!episodeId || linked.has(episodeId)) continue;
          await this.prisma.episode.update({
            where: { id: episodeId },
            data: { path: file.path },
          });
          await variants.upsertVariant({
            mediaType: 'EPISODE',
            episodeId,
            path: file.path,
            fileSize: Number(file.size),
          });
          linked.add(episodeId);
        }
      }
    }
    return linked.size;
  }

  /** Scheduled entry point: heal the next batch of series with unlinked files. */
  async run(limit = 25): Promise<EpisodeFileLinkSummary> {
    const startedAt = Date.now();
    const seriesIds = await this.seriesWithMissingFiles(limit);
    const summary: EpisodeFileLinkSummary = {
      seriesWithMissingFiles: seriesIds.length,
      seriesScanned: 0,
      filesLinked: 0,
      failures: 0,
      durationMs: 0,
    };
    for (const seriesId of seriesIds) {
      try {
        const linked = await this.linkSeries(seriesId);
        this.lastScannedAt.set(seriesId, Date.now());
        summary.seriesScanned += 1;
        summary.filesLinked += linked;
      } catch (error) {
        summary.failures += 1;
        console.warn(`[EpisodeFileLinker] series ${seriesId} failed:`, error);
      }
    }
    summary.durationMs = Date.now() - startedAt;
    return summary;
  }
}
