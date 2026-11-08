import { execFile } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

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
  runYtDlp?: (args: string[]) => Promise<void>;
  runFfmpeg?: (args: string[]) => Promise<void>;
  fsOps?: {
    mkdir(dir: string, options?: { recursive?: boolean }): Promise<unknown>;
    readdir(dir: string): Promise<string[]>;
    unlink(file: string): Promise<void>;
    stat(file: string): Promise<{ size: number }>;
  };
}

export interface IngestResult {
  ok: boolean;
  audioPath?: string;
  thumbnailPath?: string | null;
  sizeBytes?: number;
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
        '--no-playlist', '--no-warnings',
        '-f', 'bestaudio/best',
        '--write-thumbnail', '--convert-thumbnails', 'jpg',
        '-o', sourcePattern,
        `https://www.youtube.com/watch?v=${videoId}`,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.cleanup(workDir, base);
      return { ok: false, error: message };
    }

    const files = await this.io.readdir(workDir);
    const source = files.find((name) => name.startsWith(`${base}.`) && !name.endsWith('.jpg') && !name.endsWith('.part'));
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

    const stats = await this.io.stat(audioPath);
    return {
      ok: stats.size > 0,
      audioPath,
      thumbnailPath: files.includes(`${base}.jpg`) ? thumbPath : null,
      sizeBytes: stats.size,
      ...(stats.size > 0 ? {} : { error: 'converted file is empty' }),
    };
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
