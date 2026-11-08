import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

/**
 * YouTube download job (track feature_youtube_library_20261107, Phase 2).
 *
 * Downloads PENDING rows with maintained tooling (`yt-dlp`), never scraping: video + info json +
 * thumbnail into the YouTube root, `PENDING -> DOWNLOADING -> AVAILABLE|FAILED`, with the tool's
 * exact error stored on failure. Partial downloads are removed so a failed run cannot leave a
 * truncated file that later looks playable.
 */

const execFileAsync = promisify(execFile);

export interface DownloadableVideo {
  id: number;
  videoId: string;
  title: string;
  channel: string | null;
}

export interface DownloadStore {
  claim(id: number): Promise<void>;
  markAvailable(id: number, result: { path: string; thumbPath: string | null; durationSeconds: number | null; channel?: string | null }): Promise<void>;
  markFailed(id: number, error: string): Promise<void>;
}

export interface DownloadResult {
  attempted: number;
  downloaded: number;
  failed: Array<{ id: number; videoId: string; error: string }>;
}

export interface DownloadOptions {
  root: string;
  ytDlpPath?: string;
  timeoutMs?: number;
  maxHeight?: number;
  run?: (args: string[]) => Promise<void>;
  fsOps?: {
    mkdir(dir: string, options?: { recursive?: boolean }): Promise<unknown>;
    readdir(dir: string): Promise<string[]>;
    unlink(file: string): Promise<void>;
    stat(file: string): Promise<{ size: number }>;
    readFile?(file: string, encoding: 'utf-8'): Promise<string>;
  };
}

/** Filename that is safe on a Linux filesystem and still identifies the video by id. */
export function targetName(video: DownloadableVideo): string {
  const safeTitle = video.title
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return `${safeTitle} [${video.videoId}]`;
}

export class YoutubeDownloadService {
  private readonly options: DownloadOptions;
  private readonly runTool: (args: string[]) => Promise<void>;
  private readonly io: NonNullable<DownloadOptions['fsOps']>;

  constructor(options: DownloadOptions) {
    this.options = options;
    this.runTool = options.run ?? (async (args) => {
      await execFileAsync(options.ytDlpPath ?? process.env.YT_DLP_PATH ?? 'yt-dlp', args, {
        timeout: options.timeoutMs ?? 600_000,
        maxBuffer: 16 * 1024 * 1024,
      });
    });
    this.io = options.fsOps ?? fs;
  }

  async downloadOne(video: DownloadableVideo, store: DownloadStore): Promise<{ ok: boolean; error?: string }> {
    const directory = path.join(this.options.root, (video.channel ?? 'Uncategorized').replace(/[\\/:*?"<>|]/g, ' ').trim());
    const base = path.join(directory, targetName(video));
    await this.io.mkdir(directory, { recursive: true });
    await store.claim(video.id);
    try {
      await this.runTool([
        '--no-playlist',
        '--no-warnings',
        // The TV is a 32-bit Amlogic box: AV1 video and Opus audio in an mp4 are not decodable there
        // ("Could not open codec" at playback, 2026-11-08). Require H.264 + AAC and fall back to
        // best H.264, never to "whatever is best" that the device cannot play.
        '-f', `bv*[height<=${this.options.maxHeight ?? 1080}][vcodec^=avc1]+ba[acodec^=mp4a]`
          + `/b[height<=${this.options.maxHeight ?? 1080}][vcodec^=avc1]`
          + `/b[height<=${this.options.maxHeight ?? 1080}]`,
        '--merge-output-format', 'mp4',
        '--write-info-json',
        '--write-thumbnail',
        '--convert-thumbnails', 'jpg',
        '-o', `${base}.%(ext)s`,
        `https://www.youtube.com/watch?v=${video.videoId}`,
      ]);
    } catch (error) {
      await this.cleanupPartial(directory, video.videoId);
      const message = error instanceof Error ? error.message : String(error);
      await store.markFailed(video.id, message);
      return { ok: false, error: message };
    }

    const files = await this.io.readdir(directory);
    const videoFile = files.find((name) => name.endsWith('.mp4') && name.includes(video.videoId));
    if (!videoFile) {
      const message = 'yt-dlp reported success but no .mp4 was written';
      await this.cleanupPartial(directory, video.videoId);
      await store.markFailed(video.id, message);
      return { ok: false, error: message };
    }
    const thumbFile = files.find((name) => /\.(jpg|jpeg|webp|png)$/i.test(name) && name.includes(video.videoId));
    const fullPath = path.join(directory, videoFile);
    const stats = await this.io.stat(fullPath);
    // Metadata mapping: yt-dlp writes the sidecar info json; its duration is authoritative for the
    // library row (the flat-playlist figure is often missing).
    let durationSeconds: number | null = null;
    let infoChannel: string | null = null;
    const infoFile = files.find((name) => name.endsWith('.info.json') && name.includes(video.videoId));
    if (infoFile && typeof this.io.readFile === 'function') {
      try {
        const info = JSON.parse(await this.io.readFile(path.join(directory, infoFile), 'utf-8')) as {
          duration?: number;
          channel?: string;
          uploader?: string;
        };
        if (typeof info.duration === 'number' && Number.isFinite(info.duration)) {
          durationSeconds = Math.trunc(info.duration);
        }
        infoChannel = info.channel ?? info.uploader ?? null;
      } catch {
        // A corrupt sidecar must not fail the download; the row still gets path and thumbnail.
      }
    }
    await store.markAvailable(video.id, {
      path: fullPath,
      thumbPath: thumbFile ? path.join(directory, thumbFile) : null,
      durationSeconds,
      channel: infoChannel,
    });
    return { ok: stats.size > 0 };
  }

  private async cleanupPartial(directory: string, videoId: string): Promise<void> {
    try {
      const files = await this.io.readdir(directory);
      for (const name of files) {
        if (name.includes(videoId) && (name.endsWith('.part') || name.endsWith('.ytdl') || name.endsWith('.temp'))) {
          await this.io.unlink(path.join(directory, name));
        }
      }
    } catch {
      // Best effort: the row is already marked FAILED and the next run retries.
    }
  }

  async run(limit: number, videos: readonly DownloadableVideo[], store: DownloadStore): Promise<DownloadResult> {
    const batch = videos.slice(0, Math.max(1, limit));
    const result: DownloadResult = { attempted: batch.length, downloaded: 0, failed: [] };
    for (const video of batch) {
      const outcome = await this.downloadOne(video, store);
      if (outcome.ok) result.downloaded += 1;
      else result.failed.push({ id: video.id, videoId: video.videoId, error: outcome.error ?? 'unknown error' });
    }
    return result;
  }
}
