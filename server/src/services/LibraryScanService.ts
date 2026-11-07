import fs from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseClient } from '../db/drizzleClient';
export interface ScanSummary {
  moviesAdded: number;
  moviesMissing: number;
  /**
   * Episode files on disk that no database row points at. The scanner cannot
   * create them (it has no metadata provider), so this is a *discovery* count —
   * `tv-folder-import` imports them. It used to be named `tvEpisodesAdded`,
   * which claimed work the scan never did.
   */
  tvEpisodesAdded: number;
  /** Episode files on disk not registered to any episode row. */
  tvEpisodesUnregistered?: number;
  tvEpisodesMissing: number;
  subtitleFilesDetected: number;
  durationMs: number;
}

const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.ts', '.m4v']);
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.ass', '.sub', '.vtt']);
const SIDECAR_SUBTITLE_EXTENSIONS = new Set(['.srt', '.ass', '.vtt']);

/**
 * Sidecar filename token → ISO 639-2 language code. The Flutter client picks
 * Chinese Simplified subtitles by matching `zho`, `chi`, or `zh-Hans`
 * prefixes, and English audio by `eng`, so scan-created track rows must use
 * these codes (not the 2-letter codes the manual subtitle UI stores).
 */
const SIDECAR_LANGUAGE_TOKEN_MAP = new Map<string, string>([
  ['en', 'eng'],
  ['eng', 'eng'],
  ['english', 'eng'],
  ['zh', 'zho'],
  ['zho', 'zho'],
  ['chs', 'zho'],
  ['sc', 'zho'],
  ['cn', 'zho'],
  ['chi', 'chi'],
  ['cht', 'chi'],
  ['tc', 'chi'],
  ['ja', 'jpn'],
  ['jpn', 'jpn'],
  ['japanese', 'jpn'],
  ['th', 'tha'],
  ['tha', 'tha'],
  ['thai', 'tha'],
]);

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries: { name: string }[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if ((entry as any).isDirectory()) {
      results.push(...await walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

/**
 * Fraction of known paths that may disappear before the scan refuses to mark
 * anything missing.
 *
 * The media lives on a USB drive that spins down, and `pathExists` failing for
 * a sleeping or unmounted mount would otherwise null out every row in the
 * library — a silent, catastrophic "hands-off" failure. Above this ratio the
 * scan assumes the mount is at fault, changes nothing, and reports it.
 */
const MAX_MISSING_RATIO = 0.5;
const MIN_ROWS_FOR_RATIO_GUARD = 10;

/**
 * Concurrency for filesystem existence probes.
 *
 * The probes run against a USB drive; serially they dominated the scan (883 s
 * for ~3,000 paths on 2026-11-08). A small pool keeps the drive busy without
 * queueing hundreds of outstanding ioctls.
 */
const PROBE_CONCURRENCY = 16;

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

export class LibraryScanService {
  constructor(private readonly prisma: DatabaseClient) {}

  /**
   * A root that yields no files at all is not scanned.
   *
   * An unreadable root (unmounted USB drive, permission error) and a genuinely
   * empty root look identical to `walkDir`, and nulling thousands of rows
   * because the drive spun down is a far worse failure than skipping one scan.
   */
  private static rootHasNoFiles(allFiles: string[]): boolean {
    return allFiles.length === 0;
  }

  async scanAll(settings: { movieRootFolder: string; tvRootFolder: string }): Promise<ScanSummary> {
    const start = Date.now();
    this.directoryCache = new Map();
    let moviesAdded = 0;
    let moviesMissing = 0;
    let tvEpisodesAdded = 0;
    let tvEpisodesMissing = 0;
    let subtitleFilesDetected = 0;

    if (settings.movieRootFolder) {
      const r = await this.scanMovies(settings.movieRootFolder);
      moviesAdded += r.added;
      moviesMissing += r.missing;
      subtitleFilesDetected += r.subtitles;
    }

    let tvEpisodesUnregistered = 0;
    if (settings.tvRootFolder) {
      const r = await this.scanEpisodes(settings.tvRootFolder);
      tvEpisodesAdded += r.added;
      tvEpisodesMissing += r.missing;
      subtitleFilesDetected += r.subtitles;
      tvEpisodesUnregistered = r.unregistered;
    }

    console.log(
      `Library scan finished in ${Date.now() - start} ms: movies +${moviesAdded} -${moviesMissing}, `
      + `episodes +${tvEpisodesAdded} -${tvEpisodesMissing}, unregistered files ${tvEpisodesUnregistered}, `
      + `subtitles seen ${subtitleFilesDetected}.`,
    );

    return {
      moviesAdded,
      moviesMissing,
      tvEpisodesAdded,
      tvEpisodesMissing,
      subtitleFilesDetected,
      durationMs: Date.now() - start,
      tvEpisodesUnregistered,
    };
  }

  /**
   * Directory listing cache for one scan pass.
   *
   * `ensureSidecarSubtitleTracks` needs the directory of every episode, and a
   * season folder holds ~24 episodes — without this cache the scan read the same
   * directory ~24 times (thousands of readdirs on a USB drive, the bulk of the
   * 883 s runtime measured on 2026-11-08).
   */
  private directoryCache = new Map<string, Promise<string[]>>();

  private async readDirectoryCached(directory: string): Promise<string[]> {
    const cached = this.directoryCache.get(directory);
    if (cached) return cached;
    const pending = (async () => {
      try {
        const rawEntries = await fs.readdir(directory);
        return (rawEntries as Array<string | { name: string }>).map(entry =>
          typeof entry === 'string' ? entry : entry.name);
      } catch {
        return [];
      }
    })();
    this.directoryCache.set(directory, pending);
    return pending;
  }

  private async scanMovies(rootPath: string): Promise<{ added: number; missing: number; subtitles: number }> {
    let added = 0;
    let missing = 0;
    let subtitles = 0;

    // Find all movies in DB
    const movies: Array<{ id: number; path: string | null; title: string; year: number }> =
      await (this.prisma as any).movie.findMany({ select: { id: true, path: true, title: true, year: true } });

    // Build a set of paths on disk
    const allFiles = await walkDir(rootPath);
    if (LibraryScanService.rootHasNoFiles(allFiles)) {
      console.warn(
        `Library scan skipped the movie root '${rootPath}': no files were readable `
        + '(drive asleep or unmounted?). Nothing was marked missing.',
      );
      return { added, missing, subtitles };
    }
    const videoFilesOnDisk = new Set(allFiles.filter(f => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase())));
    subtitles += allFiles.filter(f => SUBTITLE_EXTENSIONS.has(path.extname(f).toLowerCase())).length;

    // Check DB records against disk, but never unlink a whole library because
    // the mount went away.
    const linkedMovies = movies.filter(movie => movie.path);
    const movieExists = await this.probePaths(linkedMovies.map(movie => movie.path!));
    const missingProbe = movieExists.filter(exists => !exists).length;
    const guardTripped = linkedMovies.length >= MIN_ROWS_FOR_RATIO_GUARD
      && missingProbe / linkedMovies.length > MAX_MISSING_RATIO;
    if (guardTripped) {
      console.warn(
        `Library scan refused to mark ${missingProbe}/${linkedMovies.length} movies missing `
        + `(over ${Math.round(MAX_MISSING_RATIO * 100)}%): the movie root looks unmounted.`,
      );
    }

    const movieExistsByPath = new Map<string, boolean>();
    linkedMovies.forEach((movie, index) => { movieExistsByPath.set(movie.path!, movieExists[index]!); });

    for (const movie of movies) {
      if (!movie.path) continue;
      const exists = movieExistsByPath.get(movie.path) ?? await this.pathExists(movie.path);
      if (!exists) {
        if (guardTripped) continue;
        // Mark movie path as null (missing) only if it was previously set
        await (this.prisma as any).movie.update({ where: { id: movie.id }, data: { path: null } });
        missing++;
      } else {
        // The file is linked but may lack a MediaFileVariant row (scan or
        // manual import linked the path without one); playback resolves
        // through variants, so heal the row here.
        await this.ensureVariant('MOVIE', movie.id, movie.path);
      }
    }

    // Check disk files without DB records - find any video file that matches a movie by title+year
    const dbPaths = new Set(movies.filter(m => m.path).map(m => m.path!));
    for (const videoFile of videoFilesOnDisk) {
      if (dbPaths.has(videoFile)) continue;
      // Try to match by filename
      const filename = path.basename(videoFile).toLowerCase();
      for (const movie of movies) {
        if (movie.path) continue; // already has a path
        const cleanTitle = movie.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanFilename = filename.replace(/[^a-z0-9]/g, '');
        if (cleanFilename.includes(cleanTitle) && cleanFilename.includes(String(movie.year))) {
          await (this.prisma as any).movie.update({ where: { id: movie.id }, data: { path: videoFile } });
          await this.ensureVariant('MOVIE', movie.id, videoFile);
          added++;
          break;
        }
      }
    }

    return { added, missing, subtitles };
  }

  private async scanEpisodes(rootPath: string): Promise<{ added: number; missing: number; subtitles: number; unregistered: number }> {
    let added = 0;
    let missing = 0;
    let subtitles = 0;

    const allFiles = await walkDir(rootPath);
    if (LibraryScanService.rootHasNoFiles(allFiles)) {
      console.warn(
        `Library scan skipped the TV root '${rootPath}': no files were readable `
        + '(drive asleep or unmounted?). Nothing was marked missing.',
      );
      return { added, missing, subtitles, unregistered: 0 };
    }
    const videoFilesOnDisk = new Set(allFiles.filter(f => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase())));
    subtitles += allFiles.filter(f => SUBTITLE_EXTENSIONS.has(path.extname(f).toLowerCase())).length;

    // Check DB episodes against disk
    const episodes: Array<{ id: number; path: string | null }> =
      await (this.prisma as any).episode.findMany({ select: { id: true, path: true } });

    const linkedEpisodes = episodes.filter(ep => ep.path);
    const episodeExists = await this.probePaths(linkedEpisodes.map(ep => ep.path!));
    const missingEpisodeProbe = episodeExists.filter(exists => !exists).length;
    const episodeGuardTripped = linkedEpisodes.length >= MIN_ROWS_FOR_RATIO_GUARD
      && missingEpisodeProbe / linkedEpisodes.length > MAX_MISSING_RATIO;
    if (episodeGuardTripped) {
      console.warn(
        `Library scan refused to mark ${missingEpisodeProbe}/${linkedEpisodes.length} episodes missing `
        + `(over ${Math.round(MAX_MISSING_RATIO * 100)}%): the TV root looks unmounted.`,
      );
    }

    const episodeExistsByPath = new Map<string, boolean>();
    linkedEpisodes.forEach((ep, index) => { episodeExistsByPath.set(ep.path!, episodeExists[index]!); });

    for (const ep of episodes) {
      if (!ep.path) continue;
      const exists = episodeExistsByPath.get(ep.path) ?? await this.pathExists(ep.path);
      if (!exists) {
        if (episodeGuardTripped) continue;
        await (this.prisma as any).episode.update({ where: { id: ep.id }, data: { path: null } });
        missing++;
      } else {
        await this.ensureVariant('EPISODE', ep.id, ep.path);
      }
    }

    // Find videos on disk with no matching DB path.
    //
    // This only *counts* them: matching a file to a series/season/episode needs
    // metadata (TVDB ids), which this service does not have. The `tv-folder-import`
    // task imports these folders through the metadata-backed import pipeline.
    const dbEpPaths = new Set(episodes.filter(e => e.path).map(e => e.path!));
    let unregistered = 0;
    for (const videoFile of videoFilesOnDisk) {
      if (!dbEpPaths.has(videoFile)) {
        unregistered++;
      }
    }
    added += unregistered;

    return { added, missing, subtitles, unregistered };
  }

  /**
   * Resolves a path that may be a directory into a video file inside it.
   *
   * Movie rows store the movie folder, not the file. Returning the actual
   * video keeps the variant inventory playable. Returns null when nothing
   * playable is found.
   */
  private async resolveVideoFileIn(candidate: string): Promise<string | null> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(candidate, { withFileTypes: true });
    } catch {
      return null;
    }
    const videos = entries
      .filter(entry => entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map(entry => path.join(candidate, entry.name))
      .sort();
    if (videos.length === 0) return null;
    return videos[0]!;
  }

  /**
   * Creates or repoints the MediaFileVariant row for a linked file. Playback
   * resolves stream sources through variant rows, not the Movie/Episode.path
   * column, so every scan link must have one. Keyed on (mediaType, path) like
   * ImportManager's import-time upsert; re-running against a healthy library
   * is a no-op.
   */
  private async ensureVariant(mediaType: 'MOVIE' | 'EPISODE', ownerId: number, filePath: string): Promise<void> {
    // Only a real video file may become a playable variant. `Movie.path` is
    // the movie FOLDER, and writing it here made every movie stream a
    // directory (HTTP 500) on 2026-11-07.
    if (!VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
      const resolved = await this.resolveVideoFileIn(filePath);
      if (!resolved) return;
      filePath = resolved;
    }
    const ownerField = mediaType === 'MOVIE' ? 'movieId' : 'episodeId';
    const variant = await (this.prisma as any).mediaFileVariant.upsert({
      where: { mediaType_path: { mediaType, path: filePath } },
      create: { mediaType, [ownerField]: ownerId, path: filePath, fileSize: BigInt(0) },
      update: { [ownerField]: ownerId },
    });
    await this.ensureSidecarSubtitleTracks(Number(variant.id), filePath);
  }

  /**
   * Registers EXTERNAL subtitle track rows for sidecar files next to the
   * linked video (`<base>.srt`, `<base>.zho.srt`, `<base>.eng.forced.srt`,
   * `<base>.chs.ass`, ...). The playback manifest reads these rows, so a
   * scanned library exposes its sidecars without any import. Existing rows
   * are kept: re-running a scan against a healthy library is a no-op.
   */
  private async ensureSidecarSubtitleTracks(variantId: number, videoPath: string): Promise<void> {
    const directory = path.dirname(videoPath);
    const videoBaseName = path.basename(videoPath, path.extname(videoPath));

    // Tolerate Dirent-shaped entries (test mocks) as well as plain names.
    const entries = await this.readDirectoryCached(directory);
    if (entries.length === 0) return;

    const escapedBase = videoBaseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sidecarNamePattern = new RegExp(`^${escapedBase}(?:[._\\- ].+)?$`, 'i');
    const sidecars = entries.filter((entry) => {
      const extension = path.extname(entry).toLowerCase();
      if (!SIDECAR_SUBTITLE_EXTENSIONS.has(extension)) {
        return false;
      }
      return sidecarNamePattern.test(path.basename(entry, extension));
    });
    if (sidecars.length === 0) {
      return;
    }

    const fullPaths = sidecars.map(entry => path.join(directory, entry));
    const existing = await (this.prisma as any).variantSubtitleTrack.findMany({
      where: { variantId, filePath: { in: fullPaths } },
      select: { filePath: true },
    });
    const existingPaths = new Set(((existing ?? []) as Array<{ filePath: string }>).map(track => track.filePath));

    for (const entry of sidecars) {
      const fullPath = path.join(directory, entry);
      if (existingPaths.has(fullPath)) {
        continue;
      }
      const stats = await fs.stat(fullPath);
      const { languageCode, isForced, isHi } = this.parseSidecarSubtitleName(videoBaseName, entry);
      await (this.prisma as any).variantSubtitleTrack.create({
        data: {
          variantId,
          source: 'EXTERNAL',
          streamIndex: null,
          languageCode,
          isForced,
          isHi,
          codec: path.extname(entry).slice(1).toLowerCase(),
          filePath: fullPath,
          fileSize: Number(stats.size),
        },
      });
    }
  }

  private parseSidecarSubtitleName(
    videoBaseName: string,
    entryName: string,
  ): { languageCode: string | null; isForced: boolean; isHi: boolean } {
    const extension = path.extname(entryName);
    const subtitleBaseName = path.basename(entryName, extension);
    const suffix = subtitleBaseName.slice(videoBaseName.length).replace(/^[._\-\s]+/, '');
    const tokens = suffix
      .split(/[._\-\s]+/)
      .map(token => token.trim().toLowerCase())
      .filter(Boolean);

    let languageCode: string | null = null;
    let isForced = false;
    let isHi = false;

    for (const token of tokens) {
      if (token === 'forced' || token === 'forc') {
        isForced = true;
        continue;
      }
      if (token === 'hi' || token === 'sdh' || token === 'cc') {
        isHi = true;
        continue;
      }
      if (!languageCode) {
        const mapped = SIDECAR_LANGUAGE_TOKEN_MAP.get(token);
        if (mapped) {
          languageCode = mapped;
        }
      }
    }

    return { languageCode, isForced, isHi };
  }

  /** Probes many paths with bounded concurrency. */
  private async probePaths(paths: readonly string[]): Promise<boolean[]> {
    return mapWithConcurrency(paths, PROBE_CONCURRENCY, candidate => this.pathExists(candidate));
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
