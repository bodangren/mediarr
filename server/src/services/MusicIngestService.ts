import { execFile } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { youtubeAuthArgs } from './YoutubeDownloadService';

/**
 * YouTube → m4a ingest for the Music library (track feature_music_library_20261107, Phase 2).
 *
 * Downloads best audio with maintained tooling (yt-dlp), converts to AAC 256k m4a (decision M3) with
 * ffmpeg, and keeps the thumbnail. Files land in a staging folder; beets tagging and final placement
 * are the next step, so an untaggable item can go to review without touching the library.
 */

const execFileAsync = promisify(execFile);

export interface IngestOptions {
  stagingDir: string;
  ytDlpPath?: string;
  ffmpegPath?: string;
  timeoutMs?: number;
  /**
   * yt-dlp auth args (`--cookies` / `--cookies-from-browser`). Defaults to the environment
   * config shared with the YouTube downloader; overridable for tests.
   */
  authArgs?: string[];
  runYtDlp?: (args: string[]) => Promise<void>;
  runFfmpeg?: (args: string[]) => Promise<void>;
  fsOps?: {
    mkdir(dir: string, options?: { recursive?: boolean }): Promise<unknown>;
    readdir(dir: string): Promise<string[]>;
    unlink(file: string): Promise<void>;
    stat(file: string): Promise<{ size: number }>;
    readFile?(file: string, encoding: 'utf-8'): Promise<string>;
  };
}

export interface IngestHints {
  artist: string | null;
  album: string | null;
  title: string | null;
  year: number | null;
}

export interface IngestResult {
  ok: boolean;
  audioPath?: string;
  thumbnailPath?: string | null;
  sizeBytes?: number;
  hints?: IngestHints | null;
  error?: string;
}

export function ingestBaseName(videoId: string): string {
  return `music-${videoId}`;
}

export class MusicIngestService {
  private readonly options: IngestOptions;
  private readonly runYtDlp: (args: string[]) => Promise<void>;
  private readonly runFfmpeg: (args: string[]) => Promise<void>;
  private readonly io: NonNullable<IngestOptions['fsOps']>;

  constructor(options: IngestOptions) {
    this.options = options;
    this.runYtDlp = options.runYtDlp ?? (async (args) => {
      await execFileAsync(options.ytDlpPath ?? process.env.YT_DLP_PATH ?? 'yt-dlp', args, {
        timeout: options.timeoutMs ?? 600_000,
        maxBuffer: 16 * 1024 * 1024,
      });
    });
    this.runFfmpeg = options.runFfmpeg ?? (async (args) => {
      await execFileAsync(options.ffmpegPath ?? process.env.FFMPEG_PATH ?? 'ffmpeg', args, {
        timeout: options.timeoutMs ?? 600_000,
        maxBuffer: 16 * 1024 * 1024,
      });
    });
    this.io = options.fsOps ?? fsp;
  }

  async ingest(videoId: string): Promise<IngestResult> {
    const base = ingestBaseName(videoId);
    const workDir = this.options.stagingDir;
    await this.io.mkdir(workDir, { recursive: true });
    const sourcePattern = path.join(workDir, `${base}.%(ext)s`);
    const audioPath = path.join(workDir, `${base}.m4a`);
    const thumbPath = path.join(workDir, `${base}.jpg`);

    try {
      await this.runYtDlp([
        // YouTube bot-checks this IP ("Sign in to confirm you're not a bot"); the owner's Chrome
        // session is passed through exactly as the video downloader does. This was the missing
        // piece in the last live music run.
        ...(this.options.authArgs ?? youtubeAuthArgs()),
        '--no-playlist', '--no-warnings',
        '-f', 'bestaudio/best',
        '--write-thumbnail', '--convert-thumbnails', 'jpg',
        // The info sidecar carries artist/track metadata that beets needs when no fingerprint
        // tool is installed (yt-dlp already fetched it; asking again would be a second request).
        '--write-info-json',
        '-o', sourcePattern,
        `https://www.youtube.com/watch?v=${videoId}`,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.cleanup(workDir, base);
      return { ok: false, error: message };
    }

    const files = await this.io.readdir(workDir);
    // Never treat sidecars as audio: with --write-info-json the first matching file would otherwise
    // be ...info.json (found live: ffmpeg was asked to convert the JSON sidecar).
    const source = files.find((name) =>
      name.startsWith(`${base}.`)
      && !/\.(json|jpe?g|webp|png|part|ytdl|temp)$/i.test(name));
    if (source === undefined) {
      await this.cleanup(workDir, base);
      return { ok: false, error: 'yt-dlp reported success but wrote no audio file' };
    }

    try {
      await this.runFfmpeg([
        '-y', '-i', path.join(workDir, source),
        '-vn', '-c:a', 'aac', '-b:a', '256k',
        '-movflags', '+faststart',
        audioPath,
      ]);
      if (path.join(workDir, source) !== audioPath) {
        await this.io.unlink(path.join(workDir, source)).catch(() => undefined);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.cleanup(workDir, base);
      return { ok: false, error: `ffmpeg convert failed: ${message}` };
    }

    const hints = await this.readHints(workDir, base);
    if (hints !== null) {
      await this.writeTags(audioPath, hints);
    }

    const stats = await this.io.stat(audioPath);
    return {
      ok: stats.size > 0,
      audioPath,
      thumbnailPath: files.includes(`${base}.jpg`) ? thumbPath : null,
      sizeBytes: stats.size,
      hints,
      ...(stats.size > 0 ? {} : { error: 'converted file is empty' }),
    };
  }

  /** Reads the yt-dlp sidecar into the fields MusicBrainz lookups need. */
  private async readHints(workDir: string, base: string): Promise<IngestHints | null> {
    if (typeof this.io.readFile !== 'function') return null;
    try {
      const payload = JSON.parse(await this.io.readFile(path.join(workDir, `${base}.info.json`), 'utf-8')) as Record<string, unknown>;
      const text = (value: unknown): string | null => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null);
      const yearValue = payload['release_year'] ?? payload['upload_date'];
      const year = typeof yearValue === 'number'
        ? yearValue
        : (typeof yearValue === 'string' && /^\d{4}/.test(yearValue) ? Number.parseInt(yearValue.slice(0, 4), 10) : null);
      const hints: IngestHints = {
        artist: text(payload['artist']) ?? text(payload['creator']) ?? text(payload['uploader']),
        album: text(payload['album']),
        title: text(payload['track']) ?? text(payload['title']),
        year: year !== null && Number.isFinite(year) ? year : null,
      };
      return hints.artist === null && hints.title === null ? null : hints;
    } catch {
      return null;
    }
  }

  /** Writes hints into the file so beets can search MusicBrainz without an audio fingerprint. */
  private async writeTags(file: string, hints: IngestHints): Promise<void> {
    const args = ['-y', '-i', file, '-c', 'copy'];
    if (hints.artist !== null) args.push('-metadata', `artist=${hints.artist}`);
    if (hints.album !== null) args.push('-metadata', `album=${hints.album}`);
    if (hints.title !== null) args.push('-metadata', `title=${hints.title}`);
    if (hints.year !== null) args.push('-metadata', `date=${hints.year}`);
    const tagged = `${file}.tagged.m4a`;
    args.push(tagged);
    try {
      await this.runFfmpeg(args);
      await this.io.unlink(file).catch(() => undefined);
      // fs.rename is not in the injected surface; write via fs directly.
      const fsp = await import('node:fs/promises');
      await fsp.rename(tagged, file);
    } catch {
      // Metadata is an optimisation: tagging will fall back to the review folder, never a crash.
    }
  }

  private async cleanup(workDir: string, base: string): Promise<void> {
    try {
      for (const name of await this.io.readdir(workDir)) {
        if (name.startsWith(`${base}.`) || name.startsWith(`${base}-`)) {
          await this.io.unlink(path.join(workDir, name));
        }
      }
    } catch {
      // Best effort: the caller receives the tool error and can retry.
    }
  }
}
