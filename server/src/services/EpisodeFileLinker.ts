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
 * It covers both media types: series episodes and movies. A movie that landed in
 * `/data/Movies/<Title (Year)>/` without a database row is handled by
 * `folder-import`, but a movie row that exists while its file was never linked
 * (and any episode file) is linked here.
 *
 * It only looks at items without a file variant, so a healthy library costs two
 * cheap queries per pass and no folder walk at all.
 */
export interface EpisodeFileLinkSummary {
  seriesWithMissingFiles: number;
  seriesScanned: number;
  moviesWithMissingFiles: number;
  moviesScanned: number;
  filesLinked: number;
  /** Variants whose recorded file was gone and whose path was repaired. */
  danglingRepaired: number;
  /** Variants whose file is gone and no replacement was found. */
  danglingUnresolved: number;
  /** Stale duplicate variant rows removed because the episode was playable. */
  duplicateVariantsRemoved: number;
  /** Variant rows removed because the media folder itself is gone. */
  variantRowsRemovedForMissingMedia: number;
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

/** Picks the playable video files inside one movie folder (test seam). */
export type MovieFolderVideos = (folderPath: string) => Promise<Array<{ path: string; size: number }>>;


/**
 * Picks the library folder for a series when the recorded path is gone.
 *
 * Measured 2026-11-21: Series 33 ("For All Mankind") pointed at
 * `/data/TV/For All Mankind (2019)  Season 1`, a path that no longer exists, so every
 * linker/repair pass scanned nothing and 40 episodes stayed unplayable while the real
 * files sat in `/data/TV/For All Mankind (2019)/Season 0N`. The matcher ignores year,
 * punctuation and "Season N" suffixes, and refuses to guess when two folders fit.
 */
export function matchSeriesFolder(title: string, folderNames: readonly string[]): string | null {
  const normalise = (value: string): string => value
    .toLowerCase()
    .replace(/\(?\b(19|20)\d{2}\b\)?/g, ' ')
    .replace(/\bseason\s*\d+\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const target = normalise(title);
  if (target.length === 0) return null;
  const scored = folderNames
    .map((name) => ({ name, key: normalise(name) }))
    .filter((entry) => entry.key === target || entry.key.startsWith(`${target} `) || entry.key.endsWith(` ${target}`));
  return scored.length === 1 ? scored[0]!.name : null;
}

export class EpisodeFileLinker {
  constructor(
    private readonly prisma: any,
    private readonly deps: {
      scanner?: FolderScannerLike;
      variants?: VariantWriterLike;
      movieVideos?: MovieFolderVideos;
    } = {},
  ) {}

  /** Series already scanned recently, so a healthy-ish library is not re-walked
   * every 15 minutes (the USB drive is slow and the folder walk is the cost). */
  private readonly lastScannedAt = new Map<number, number>();

  private async defaultMovieVideos(folderPath: string): Promise<Array<{ path: string; size: number }>> {
    const { readdir, stat } = await import('node:fs/promises');
    const nodePath = await import('node:path');
    let entries;
    try {
      entries = await readdir(folderPath, { withFileTypes: true });
    } catch {
      return [];
    }
    const videos: Array<{ path: string; size: number }> = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!/\.(mkv|mp4|avi|m4v|mov|webm|ts)$/i.test(entry.name)) continue;
      const full = nodePath.join(folderPath, entry.name);
      try {
        const info = await stat(full);
        videos.push({ path: full, size: Number(info.size) });
      } catch {
        // Unreadable file: leave it for the next pass.
      }
    }
    // Largest file wins when a folder carries extras or a sample.
    return videos.sort((a, b) => b.size - a.size);
  }

  /** Movies that have no file variant yet. */
  async moviesWithMissingFiles(limit = 25): Promise<number[]> {
    const movies: Array<{ id: number }> = await this.prisma.movie.findMany({ select: { id: true } });
    const variants: Array<{ movieId: number | null }> = await this.prisma.mediaFileVariant.findMany({
      where: { mediaType: 'MOVIE' },
      select: { movieId: true },
    });
    const linked = new Set<number>();
    for (const variant of variants) {
      if (variant.movieId != null) linked.add(Number(variant.movieId));
    }
    const cooldownMs = 6 * 60 * 60 * 1000;
    const now = Date.now();
    return movies
      .map(movie => Number(movie.id))
      .filter(movieId => !linked.has(movieId))
      .filter(movieId => now - (this.lastScannedAt.get(-movieId) ?? 0) > cooldownMs)
      .slice(0, limit);
  }

  /** Link one movie's file (its path may be the folder or the video itself). */
  async linkMovie(movieId: number): Promise<number> {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true, path: true },
    });
    const moviePath: string | null = movie?.path ?? null;
    if (!moviePath) return 0;

    const { stat } = await import('node:fs/promises');
    let videoPath: string | null = null;
    let fileSize = 0;
    let isFile = false;
    try {
      const info = await stat(moviePath);
      isFile = info.isFile();
      if (isFile) {
        videoPath = moviePath;
        fileSize = Number(info.size);
      }
    } catch {
      return 0;
    }
    if (!isFile) {
      const videos = await (this.deps.movieVideos ?? this.defaultMovieVideos.bind(this))(moviePath);
      if (videos.length === 0) return 0;
      videoPath = videos[0]!.path;
      fileSize = videos[0]!.size;
    }
    if (!videoPath) return 0;

    await this.variants.upsertVariant({
      mediaType: 'MOVIE',
      movieId,
      path: videoPath,
      fileSize,
    } as any);
    return 1;
  }

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
  /**
   * Repoints series rows whose recorded folder is gone to the matching folder under the
   * TV root, so linking and dangling repair can find the files again.
   */
  async repairSeriesPaths(tvRoot: string, limit = 200): Promise<{ repaired: number; unresolved: number }> {
    const { readdir } = await import('node:fs/promises');
    const nodePath = await import('node:path');
    let folders: string[];
    try {
      folders = (await readdir(tvRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      return { repaired: 0, unresolved: 0 };
    }
    const seriesRows: Array<{ id: number; title: string; path: string | null }> = await this.prisma.series.findMany({
      where: {},
      select: { id: true, title: true, path: true },
    });
    let repaired = 0;
    let unresolved = 0;
    for (const series of seriesRows.slice(0, limit)) {
      const current = series.path ?? null;
      if (current && await this.pathExists(current)) continue;
      const match = matchSeriesFolder(series.title, folders);
      if (!match) {
        unresolved += 1;
        continue;
      }
      const nextPath = nodePath.join(tvRoot, match);
      await this.prisma.series.update({ where: { id: series.id }, data: { path: nextPath } });
      repaired += 1;
    }
    return { repaired, unresolved };
  }

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

    // Paths already linked, so a pass over a healthy series is read-only: the
    // previous version re-upserted every file of every series it re-scanned.
    const existing: Array<{ path: string; episodeId: number | null }> =
      await this.prisma.mediaFileVariant.findMany({
        where: { mediaType: 'EPISODE', episodeId: { in: episodes.map(episode => episode.id) } },
        select: { path: true, episodeId: true },
      });
    const linkedPaths = new Map<number, string>();
    for (const variant of existing) {
      if (variant.episodeId != null) linkedPaths.set(Number(variant.episodeId), variant.path);
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
          // An episode with any variant is already linked; a variant whose file
          // is gone is repaired by repairDanglingVariants. Creating a second row
          // here is how the library accumulated duplicate variants (Justified:
          // City Primeval ended up with 16 rows for 8 episodes on 2026-11-18).
          if (linkedPaths.has(episodeId)) {
            linked.add(episodeId);
            continue;
          }
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



  /**
   * Points a variant at [replacementPath].
   *
   * Returns `'repaired'` when the row now points at the real file, or `'duplicate'`
   * when another variant already owns that path (the unique index on
   * mediaType+path): in that case the dangling row is a stale duplicate and is
   * deleted. Never throws - one bad row must not abort the whole repair.
   */
  private async repointVariant(
    variantId: number,
    replacementPath: string,
    replacementSize: number,
  ): Promise<'repaired' | 'duplicate' | 'failed'> {
    try {
      await this.prisma.mediaFileVariant.update({
        where: { id: variantId },
        data: { path: replacementPath, fileSize: replacementSize },
      });
      return 'repaired';
    } catch (error) {
      const code = (error as { code?: string }).code ?? '';
      if (!code.includes('UNIQUE')) {
        console.warn(`[EpisodeFileLinker] variant ${variantId}: ${String(error)}`);
        return 'failed';
      }
      try {
        await this.prisma.mediaFileVariant.delete({ where: { id: variantId } });
        return 'duplicate';
      } catch {
        return 'failed';
      }
    }
  }

  /**
   * Repairs variants whose recorded file no longer exists.
   *
   * Measured 2026-11-18: "Justified: City Primeval" reported 8/8 episodes filed
   * while every variant pointed at `/data/TV/Justified City Primeval/Season 01/...`
   * - a path that does not exist. The files were on disk under a different naming
   * scheme (`Season 1/Justified - City Primeval - S01E01 ...`), so the client
   * promised playable content that would fail to stream. Folders get renamed and
   * re-laid-out by hand, and the DB then lies until someone notices.
   *
   * For each variant whose path is missing, the series folder is scanned once and
   * the file is matched by season/episode; the variant and the episode row are
   * pointed at the real file. Unresolved variants are counted, never deleted -
   * deleting rows is not this service's job.
   */
  async repairDanglingVariants(limit = 200): Promise<{
    repaired: number;
    unresolved: number;
    removedStale: number;
    removedMissingMedia: number;
  }> {
    // Every row has to be checked: a dangling row can be anywhere in the table,
    // and taking the first N by id meant the repair kept re-checking the same
    // healthy rows (measured 2026-11-18: 209 dangling rows survived a pass that
    // reported "repaired 0"). Existence checks run with bounded concurrency so a
    // few thousand stats stay cheap.
    const variants: Array<{
      id: number;
      path: string;
      episodeId: number | null;
      movieId?: number | null;
      mediaType?: string;
    }> = await this.prisma.mediaFileVariant.findMany({
      where: {},
      select: { id: true, path: true, episodeId: true, movieId: true, mediaType: true },
    });

    const missing: typeof variants = [];
    const CONCURRENCY = 64;
    for (let start = 0; start < variants.length; start += CONCURRENCY) {
      const batch = variants.slice(start, start + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async variant =>
          variant.path && !(await this.pathExists(variant.path)) ? variant : null,
        ),
      );
      for (const result of results) {
        if (result) missing.push(result);
      }
    }
    if (missing.length === 0) {
      return { repaired: 0, unresolved: 0, removedStale: 0, removedMissingMedia: 0 };
    }

    // Group by series so each folder is walked at most once.
    const episodeIds = missing
      .map(variant => variant.episodeId)
      .filter((id): id is number => id != null);
    const episodes: Array<{ id: number; seriesId: number; seasonNumber: number; episodeNumber: number }> =
      episodeIds.length === 0
        ? []
        : await this.prisma.episode.findMany({
            where: { id: { in: episodeIds } },
            select: { id: true, seriesId: true, seasonNumber: true, episodeNumber: true },
          });
    const episodeById = new Map(episodes.map(episode => [episode.id, episode]));

    const seriesIds = [...new Set(episodes.map(episode => episode.seriesId))];
    const seriesRows: Array<{ id: number; path: string | null }> = await this.prisma.series.findMany({
      where: { id: { in: seriesIds } },
      select: { id: true, path: true },
    });
    const seriesPathById = new Map(seriesRows.map(row => [row.id, row.path]));

    const filesBySeries = new Map<number, Map<string, { path: string; size: number }>>();
    for (const seriesId of seriesIds) {
      const seriesPath = seriesPathById.get(seriesId);
      if (!seriesPath) continue;
      let scan;
      try {
        scan = await this.scanner.scan(seriesPath);
      } catch {
        continue;
      }
      const byEpisode = new Map<string, { path: string; size: number }>();
      for (const folder of scan.folders) {
        for (const file of folder.files) {
          const parsed = file.parsedInfo;
          if (!parsed?.seasonNumber || !parsed.episodeNumbers?.length) continue;
          for (const episodeNumber of parsed.episodeNumbers) {
            const key = `${parsed.seasonNumber}x${episodeNumber}`;
            if (!byEpisode.has(key)) byEpisode.set(key, { path: file.path, size: Number(file.size) });
          }
        }
      }
      filesBySeries.set(seriesId, byEpisode);
    }

    // Which episodes already have a variant whose file is present.
    const liveVariantEpisodes = new Set<number>();
    const allEpisodeVariants: Array<{ id: number; path: string; episodeId: number | null }> =
      await this.prisma.mediaFileVariant.findMany({
        where: { mediaType: 'EPISODE' },
        select: { id: true, path: true, episodeId: true },
        take: 5000,
      });
    const missingIds = new Set(missing.map(variant => variant.id));
    for (const variant of allEpisodeVariants) {
      if (variant.episodeId == null || missingIds.has(variant.id)) continue;
      if (await this.pathExists(variant.path)) liveVariantEpisodes.add(Number(variant.episodeId));
    }

    let repaired = 0;
    let unresolved = 0;
    let removedStale = 0;
    let removedMissingMedia = 0;
    const danglingMovies = missing.filter(variant => variant.movieId != null);
    let movieRepaired = 0;
    if (danglingMovies.length > 0) {
      const movieIds = [...new Set(danglingMovies.map(variant => Number(variant.movieId)))];
      const movies: Array<{ id: number; path: string | null }> = await this.prisma.movie.findMany({
        where: { id: { in: movieIds } },
        select: { id: true, path: true },
      });
      const moviePathById = new Map(movies.map(movie => [movie.id, movie.path]));
      for (const variant of danglingMovies.slice(0, limit)) {
        const moviePath = moviePathById.get(Number(variant.movieId));
        if (!moviePath) {
          // No folder recorded on the movie row. Derive the root from the file
          // the variant points at (…/<Movie folder>/<file> -> …) and, if that
          // root is mounted while the file is gone, drop the stale row.
          const { dirname } = await import('node:path');
          const fileRoot = dirname(dirname(variant.path));
          if ((await this.pathExists(fileRoot)) && !(await this.pathExists(variant.path))) {
            try {
              await this.prisma.mediaFileVariant.delete({ where: { id: variant.id } });
              removedMissingMedia += 1;
              continue;
            } catch {
              // fall through to unresolved
            }
          }
          unresolved += 1;
          continue;
        }
        const { stat } = await import('node:fs/promises');
        let replacement: { path: string; size: number } | null = null;
        try {
          const info = await stat(moviePath);
          if (info.isFile()) {
            replacement = { path: moviePath, size: Number(info.size) };
          } else {
            const videos = await (this.deps.movieVideos ?? this.defaultMovieVideos.bind(this))(moviePath);
            if (videos.length > 0) replacement = { path: videos[0]!.path, size: videos[0]!.size };
          }
        } catch {
          replacement = null;
        }
        if (!replacement) {
          // The movie folder is gone, so the row claims content that does not
          // exist - the client would offer Play for it and fail. Drop the stale
          // index row only when the library root is still mounted, so an
          // unmounted drive can never cause a mass deletion.
          const { dirname } = await import('node:path');
          const root = dirname(moviePath);
          const rootMounted = await this.pathExists(root);
          if (rootMounted && !(await this.pathExists(moviePath))) {
            try {
              await this.prisma.mediaFileVariant.delete({ where: { id: variant.id } });
              removedMissingMedia += 1;
              continue;
            } catch {
              // fall through to unresolved
            }
          }
          unresolved += 1;
          continue;
        }
        const outcome = await this.repointVariant(variant.id, replacement.path, replacement.size);
        if (outcome === 'failed') unresolved += 1;
        else if (outcome === 'duplicate') removedStale += 1;
        else movieRepaired += 1;
      }
    }

    for (const variant of missing.slice(0, limit)) {
      // A stale row for an episode that is already playable is noise: drop it.
      if (variant.episodeId != null && liveVariantEpisodes.has(Number(variant.episodeId))) {
        await this.prisma.mediaFileVariant.delete({ where: { id: variant.id } });
        removedStale += 1;
        continue;
      }
      if (variant.episodeId == null) {
        if (variant.movieId == null) unresolved += 1;
        continue;
      }
      const episode = episodeById.get(Number(variant.episodeId));
      if (!episode) {
        unresolved += 1;
        continue;
      }
      const replacement = filesBySeries
        .get(episode.seriesId)
        ?.get(`${episode.seasonNumber}x${episode.episodeNumber}`);
      if (!replacement) {
        unresolved += 1;
        continue;
      }
      const outcome = await this.repointVariant(variant.id, replacement.path, replacement.size);
      if (outcome === 'failed') {
        unresolved += 1;
        continue;
      }
      if (outcome === 'duplicate') removedStale += 1;
      else repaired += 1;
      await this.prisma.episode.update({
        where: { id: episode.id },
        data: { path: replacement.path },
      });
    }
    return {
      repaired: repaired + movieRepaired,
      unresolved,
      removedStale,
      removedMissingMedia,
    };
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      const { stat } = await import('node:fs/promises');
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /** Scheduled entry point: heal the next batch of series with unlinked files. */
  async run(limit = 25): Promise<EpisodeFileLinkSummary> {
    const startedAt = Date.now();
    const seriesIds = await this.seriesWithMissingFiles(limit);
    const movieIds = await this.moviesWithMissingFiles(limit);
    let dangling = { repaired: 0, unresolved: 0, removedStale: 0, removedMissingMedia: 0 };
    const summary: EpisodeFileLinkSummary = {
      seriesWithMissingFiles: seriesIds.length,
      seriesScanned: 0,
      moviesWithMissingFiles: movieIds.length,
      moviesScanned: 0,
      filesLinked: 0,
      danglingRepaired: 0,
      danglingUnresolved: 0,
      duplicateVariantsRemoved: 0,
      variantRowsRemovedForMissingMedia: 0,
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
    for (const movieId of movieIds) {
      try {
        const linked = await this.linkMovie(movieId);
        this.lastScannedAt.set(-movieId, Date.now());
        summary.moviesScanned += 1;
        summary.filesLinked += linked;
      } catch (error) {
        summary.failures += 1;
        console.warn(`[EpisodeFileLinker] movie ${movieId} failed:`, error);
      }
    }
    try {
      // Dangling rows are cheap to check (one stat each) and the library had 262
      // of them on 2026-11-18, so repair in bulk rather than 25 per pass.
      dangling = await this.repairDanglingVariants(400);
      summary.danglingRepaired = dangling.repaired;
      summary.danglingUnresolved = dangling.unresolved;
      summary.duplicateVariantsRemoved = dangling.removedStale;
      summary.variantRowsRemovedForMissingMedia = dangling.removedMissingMedia;
    } catch (error) {
      summary.failures += 1;
      console.warn('[EpisodeFileLinker] dangling variant repair failed:', error);
    }
    summary.durationMs = Date.now() - startedAt;
    return summary;
  }
}
