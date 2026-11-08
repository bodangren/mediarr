import fsp from 'node:fs/promises';
import pathPosix from 'node:path/posix';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { planYoutubeRetention, runYoutubeRetention } from './YoutubeRetentionService';

/**
 * Scheduled YouTube automation (track feature_youtube_library_20261107, Phase 3/4).
 *
 * The retention run writes a receipt for every execution - dry runs included - so "did the nightly
 * job fire, and what did it do?" is answerable without reading logs. Receipts are append-only JSONL
 * in the config dir, one line per run.
 */

type Drizzle = any;

export interface RetentionReceipt {
  at: string;
  dryRun: boolean;
  retentionDays: number;
  candidates: number;
  moved: Array<{ id: number; originalPath: string; quarantinePath: string }>;
  failed: Array<{ id: number; path: string; error: string }>;
  skipped: number;
}

export function receiptPath(configDir: string): string {
  return pathPosix.join(configDir, 'youtube-retention-receipts.jsonl');
}

export async function runRetention(
  drizzle: Drizzle,
  options: {
    configDir: string;
    mediaRoot: string;
    quarantineRoot: string;
    retentionDays?: number;
    dryRun?: boolean;
  },
): Promise<RetentionReceipt> {
  const days = options.retentionDays ?? 7;
  const dryRun = options.dryRun !== false;
  const rows = await drizzle
    .select({
      id: schema.youtubeVideos.id,
      path: schema.youtubeVideos.path,
      isWatched: schema.youtubeVideos.isWatched,
      watchedAt: schema.youtubeVideos.watchedAt,
      source: schema.youtubeVideos.source,
    })
    .from(schema.youtubeVideos)
    .where(eq(schema.youtubeVideos.status, 'AVAILABLE'));

  const plan = planYoutubeRetention(rows, {
    mediaRoot: options.mediaRoot,
    quarantineRoot: options.quarantineRoot,
    retentionDays: days,
  });
  const outcome = await runYoutubeRetention(plan, {
    io: {
      mkdir: (dir, mkdirOptions) => fsp.mkdir(dir, mkdirOptions),
      rename: (from, to) => fsp.rename(from, to),
      copyFile: (from, to) => fsp.copyFile(from, to),
      unlink: (file) => fsp.unlink(file),
      stat: async (file) => ({ size: (await fsp.stat(file)).size }),
      appendFile: (file, data) => fsp.appendFile(file, data),
    },
    dryRun,
  });

  if (!dryRun) {
    for (const entry of outcome.moved) {
      await drizzle.update(schema.youtubeVideos).set({
        status: 'QUARANTINED',
        path: entry.quarantinePath,
        error: null,
      }).where(eq(schema.youtubeVideos.id, entry.id));
    }
  }

  const receipt: RetentionReceipt = {
    at: new Date().toISOString(),
    dryRun,
    retentionDays: days,
    candidates: plan.videos.length,
    moved: outcome.moved,
    failed: outcome.failed,
    skipped: plan.plan.skipped.length,
  };
  await fsp.appendFile(receiptPath(options.configDir), `${JSON.stringify(receipt)}\n`);
  return receipt;
}

export async function readRetentionReceipts(configDir: string, limit = 20): Promise<RetentionReceipt[]> {
  try {
    const text = await fsp.readFile(receiptPath(configDir), 'utf-8');
    return text
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .slice(-limit)
      .map((line) => JSON.parse(line) as RetentionReceipt);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
