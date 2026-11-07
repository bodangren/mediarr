import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseClient } from '../db/drizzleClient';

export interface ThumbnailStats {
  generated: number;
  skipped: number;
  failed: number;
}

/**
 * Local episode thumbnails.
 *
 * TVDB episode images need a provider call per episode and are not populated in
 * this library; the video files are already on disk, so a single frame per
 * episode gives the TV UI a real 16:9 still with no external dependency
 * (owner UX review: episode rows were text-only and hard to scan).
 */
export class EpisodeThumbnailService {
  private readonly directory: string;

  constructor(
    private readonly prisma: DatabaseClient,
    options: { directory?: string; ffmpegPath?: string } = {},
  ) {
    this.directory = options.directory
      ?? path.join(process.env.CONFIG_DIR ?? process.cwd(), 'thumbnails');
    this.ffmpegPath = options.ffmpegPath ?? 'ffmpeg';
  }

  private readonly ffmpegPath: string;

  thumbnailPath(episodeId: number): string {
    return path.join(this.directory, `episode-${episodeId}.jpg`);
  }

  async hasThumbnail(episodeId: number): Promise<boolean> {
    try {
      const stats = await fs.stat(this.thumbnailPath(episodeId));
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

  /**
   * Extracts one frame as a 480 px wide JPEG.
   *
   * `-ss` must be a time value — ffmpeg rejects percentages for input seeking
   * ("Invalid duration for option ss: 10%"). 90 s in gives a representative
   * frame for TV episodes; shorter files that yield nothing fall back to 10 s.
   */
  async generate(episodeId: number, videoPath: string): Promise<string> {
    await fs.mkdir(this.directory, { recursive: true });
    const target = this.thumbnailPath(episodeId);
    // Write beside the target: /tmp is a different filesystem from the config
    // volume, and rename() across devices throws EXDEV.
    const temporary = path.join(this.directory, `.episode-${episodeId}-${Date.now()}.tmp.jpg`);

    const extract = (seekSeconds: number) => this.runFfmpeg([
      '-y',
      '-ss', String(seekSeconds),
      '-i', videoPath,
      '-frames:v', '1',
      '-vf', 'scale=480:-2',
      '-q:v', '4',
      // Single-image output: without `-update 1` ffmpeg writes the JPEG but
      // exits non-zero on the image2 pattern warning, which looked like a
      // failure for every episode.
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

  /**
   * Generates thumbnails for episodes that have a file but no cached still.
   * Bounded per run so the nightly job stays short.
   */
  async generateMissing(limit = 40): Promise<ThumbnailStats> {
    const stats: ThumbnailStats = { generated: 0, skipped: 0, failed: 0 };
    const episodes = await (this.prisma as any).episode.findMany({
      where: { path: { not: null } },
      select: { id: true, path: true },
      orderBy: { id: 'asc' },
    }) as Array<{ id: number; path: string | null }>;

    await fs.mkdir(this.directory, { recursive: true });

    for (const episode of episodes) {
      // Bound total attempts: without this, a library where every extraction
      // fails would loop over every episode on every run.
      if (stats.generated + stats.failed >= limit) break;
      if (!episode.path) continue;
      if (await this.hasThumbnail(episode.id)) {
        stats.skipped += 1;
        continue;
      }
      try {
        await this.generate(episode.id, episode.path);
        stats.generated += 1;
      } catch {
        stats.failed += 1;
      }
    }

    return stats;
  }
}
