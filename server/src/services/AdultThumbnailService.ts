import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Thumbnails for the Adult library (track feature_adult_library_20261107).
 *
 * One frame per video, extracted locally with ffmpeg into `${CONFIG_DIR}/thumbnails/adult-<id>.jpg`.
 * Same contract as the episode stills: 480 px wide JPEG, frame at 90 s falling back to 10 s, temp file
 * written beside the target (a rename from /tmp crosses devices and throws EXDEV), and a hard timeout
 * so one broken file cannot wedge a batch.
 */
export class AdultThumbnailService {
  private readonly directory: string;
  private readonly ffmpegPath: string;

  constructor(options: { directory?: string; ffmpegPath?: string } = {}) {
    this.directory = options.directory
      ?? path.join(process.env.CONFIG_DIR ?? process.cwd(), 'thumbnails');
    this.ffmpegPath = options.ffmpegPath ?? 'ffmpeg';
  }

  thumbnailPath(adultItemId: number): string {
    return path.join(this.directory, `adult-${adultItemId}.jpg`);
  }

  async hasThumbnail(adultItemId: number): Promise<boolean> {
    try {
      const stats = await fs.stat(this.thumbnailPath(adultItemId));
      return stats.size > 0;
    } catch {
      return false;
    }
  }

  private async runFfmpeg(args: string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(this.ffmpegPath, args, { stdio: 'ignore' });
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('ffmpeg thumbnail timed out'));
      }, 30_000);
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });
  }

  async generate(adultItemId: number, videoPath: string): Promise<string> {
    await fs.mkdir(this.directory, { recursive: true });
    const target = this.thumbnailPath(adultItemId);
    const temporary = path.join(this.directory, `.adult-${adultItemId}-${Date.now()}.tmp.jpg`);
    // One thread per ffmpeg: several of these run while the server serves the TV; unbounded ffmpeg
    // threads starved the event loop (16.9 s stall on 2026-11-08, reported by the TV as 'server
    // unreachable').
    const extract = (seekSeconds: number) => this.runFfmpeg([
      '-y',
      '-threads', '1',
      '-filter_threads', '1',
      '-ss', String(seekSeconds),
      '-i', videoPath,
      '-frames:v', '1',
      '-vf', 'scale=480:-2',
      '-q:v', '4',
      '-update', '1',
      temporary,
    ]);

    try {
      await extract(90);
    } catch {
      await extract(10);
    }
    await fs.rename(temporary, target);
    return target;
  }
}

/**
 * Bounded missing-thumbnail pass shared by the API route and the scheduler (tech-debt entry
 * 2026-11-08): covers stills that appeared after the first backfill without ever blocking a list
 * request, and yields between ffmpeg runs so the TV never sees an event-loop stall.
 */
export async function generateMissingAdultThumbnails(options: {
  rows: Array<{ id: number; path: string }>;
  thumbnails: Pick<AdultThumbnailService, 'hasThumbnail' | 'generate'>;
  limit?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<{ generated: number; failures: Array<{ id: number; error: string }>; scanned: number }> {
  const limit = options.limit ?? 8;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let generated = 0;
  const failures: Array<{ id: number; error: string }> = [];
  for (const row of options.rows) {
    if (generated >= limit) break;
    if (await options.thumbnails.hasThumbnail(row.id)) continue;
    try {
      await options.thumbnails.generate(row.id, row.path);
      generated += 1;
      await sleep(200);
    } catch (error) {
      failures.push({ id: row.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { generated, failures, scanned: options.rows.length };
}
