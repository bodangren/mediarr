import fsp from 'node:fs/promises';
import pathPosix from 'node:path/posix';
import { and, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { planYoutubeRetention, runYoutubeRetention } from './YoutubeRetentionService';
import { YoutubeFeedPoller, type PollResult } from './YoutubeFeedPoller';
import { YoutubeDownloadService, type DownloadResult } from './YoutubeDownloadService';

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

export interface PollAllReceipt {
  at: string;
  subscriptions: number;
  results: PollResult[];
  queued: number;
  failures: number;
}

/** Poll every enabled subscription; one receipt line per run with per-subscription results. */
export async function pollAllSubscriptions(
  drizzle: Drizzle,
  options: { configDir: string; poller?: YoutubeFeedPoller },
): Promise<PollAllReceipt> {
  const poller = options.poller ?? new YoutubeFeedPoller();
  const subscriptions = await drizzle
    .select({ id: schema.youtubeSubscriptions.id, url: schema.youtubeSubscriptions.url, title: schema.youtubeSubscriptions.title })
    .from(schema.youtubeSubscriptions)
    .where(eq(schema.youtubeSubscriptions.enabled, true));

  const results: PollResult[] = [];
  for (const subscription of subscriptions) {
    results.push(await poller.poll(subscription, {
      videos: {
        existingVideoIds: async () => new Set(
          (await drizzle.select({ videoId: schema.youtubeVideos.videoId }).from(schema.youtubeVideos))
            .map((video: { videoId: string }) => video.videoId),
        ),
        findByVideoId: async (videoId: string) => (await drizzle
          .select({ id: schema.youtubeVideos.id })
          .from(schema.youtubeVideos)
          .where(eq(schema.youtubeVideos.videoId, videoId))
          .limit(1))[0] ?? null,
        insert: async (entry) => (await drizzle
          .insert(schema.youtubeVideos)
          .values({
            subscriptionId: entry.subscriptionId,
            videoId: entry.videoId,
            source: 'SUBSCRIPTION',
            title: entry.title,
            channel: entry.channel ?? null,
            durationSeconds: entry.durationSeconds ?? null,
            publishedAt: entry.publishedAt ?? null,
            status: 'PENDING',
          })
          .returning({ id: schema.youtubeVideos.id }))[0],
      },
      recordPoll: async (subscriptionId, outcome) => {
        await drizzle.update(schema.youtubeSubscriptions)
          .set({ lastPolledAt: outcome.at, lastError: outcome.error ?? null })
          .where(eq(schema.youtubeSubscriptions.id, subscriptionId));
      },
    }));
  }

  const receipt: PollAllReceipt = {
    at: new Date().toISOString(),
    subscriptions: subscriptions.length,
    results,
    queued: results.reduce((sum, result) => sum + result.queued, 0),
    failures: results.reduce((sum, result) => sum + result.failures.length + (result.error ? 1 : 0), 0),
  };
  await fsp.appendFile(pathPosix.join(options.configDir, 'youtube-poll-receipts.jsonl'), `${JSON.stringify(receipt)}\n`);
  return receipt;
}

export interface DownloadReceipt {
  at: string;
  attempted: number;
  downloaded: number;
  failed: Array<{ id: number; videoId: string; error: string }>;
}

/** Download a bounded batch of PENDING videos; receipt line per run. */
/**
 * A FAILED row from before the unit was given `--cookies-from-browser` can be retried once the
 * cookie fix lands. Rows that already failed *with* the cookie flag are left FAILED so a bot-check
 * does not retry forever.
 */
export function shouldRequeueLegacyBotFailure(error: string | null): boolean {
  if (!error) return false;
  if (!error.includes('Sign in to confirm')) return false;
  return !error.includes('--cookies-from-browser');
}

/**
 * Backoff for a retried download: a bot-check or network failure is usually transient (the same
 * video often succeeds later), so retry after 30 min, then 6 h, then 24 h; from the fourth attempt it
 * drops to a weekly retry instead of giving up. YouTube bot-checks clear when the owner's browser
 * cookies refresh, so abandoning a video forever would be wrong.
 */
export function retryDelayMs(attempts: number): number {
  if (attempts > 3) return 7 * 24 * 60 * 60 * 1000;
  const steps = [30 * 60 * 1000, 6 * 60 * 60 * 1000, 24 * 60 * 60 * 1000];
  const index = Math.max(0, Math.min(steps.length - 1, attempts - 1));
  return steps[index]!;
}

export async function downloadPending(
  drizzle: Drizzle,
  options: {
    configDir: string;
    mediaRoot: string;
    limit: number;
    service?: YoutubeDownloadService;
    /** Alert hook so a failed download is never silent (scheduled job supplies the dispatcher). */
    onFailure?: (failure: { title: string; error: string }) => void;
  },
): Promise<DownloadReceipt> {
  const service = options.service ?? new YoutubeDownloadService({ root: options.mediaRoot });
  // Crash recovery: a download claimed by a process that died leaves the row DOWNLOADING forever,
  // and nothing retries it. Anything claimed longer than 30 minutes ago goes back to PENDING; the
  // scheduler runs every 20 minutes so a live job never loses its own claim.
  await drizzle.update(schema.youtubeVideos)
    .set({ status: 'PENDING' })
    .where(and(
      eq(schema.youtubeVideos.status, 'DOWNLOADING'),
      sql`${schema.youtubeVideos.lastSeenAt} < strftime('%s','now','-30 minutes')`,
    ));

  // One-time recovery of bot-check failures recorded before the cookie fix: their command line has
  // no --cookies-from-browser, so retrying them is the only way to know whether the fix works.
  const legacyFailures = await drizzle
    .select({ id: schema.youtubeVideos.id, error: schema.youtubeVideos.error })
    .from(schema.youtubeVideos)
    .where(eq(schema.youtubeVideos.status, 'FAILED'));
  let requeued = 0;
  for (const row of legacyFailures as Array<{ id: number; error: string | null }>) {
    if (!shouldRequeueLegacyBotFailure(row.error)) continue;
    await drizzle
      .update(schema.youtubeVideos)
      .set({ status: 'PENDING' })
      .where(eq(schema.youtubeVideos.id, row.id));
    requeued += 1;
  }
  if (requeued > 0) console.log(`YouTube download: requeued ${requeued} legacy bot-check failure(s)`);

  const pending = await drizzle
    .select({
      id: schema.youtubeVideos.id,
      videoId: schema.youtubeVideos.videoId,
      title: schema.youtubeVideos.title,
      channel: schema.youtubeVideos.channel,
    })
    .from(schema.youtubeVideos)
    .where(or(
      eq(schema.youtubeVideos.status, 'PENDING'),
      and(
        eq(schema.youtubeVideos.status, 'FAILED'),
        // No attempt cap: after three failures the row sits on a weekly retry (see retryDelayMs), so a
        // bot-check that clears when cookies refresh is retried instead of abandoned forever.
        or(isNull(schema.youtubeVideos.retryAt), lte(schema.youtubeVideos.retryAt, new Date())),
      ),
    ))
    .orderBy(schema.youtubeVideos.added)
    .limit(Math.max(1, options.limit));

  let outcome: DownloadResult = { attempted: 0, downloaded: 0, failed: [] };
  if (pending.length > 0) {
    outcome = await service.run(options.limit, pending, {
      claim: async (id) => {
        await drizzle.update(schema.youtubeVideos)
          .set({ status: 'DOWNLOADING', lastSeenAt: new Date() })
          .where(eq(schema.youtubeVideos.id, id));
      },
      markAvailable: async (id, result) => {
        await drizzle.update(schema.youtubeVideos).set({
          status: 'AVAILABLE',
          path: result.path,
          thumbPath: result.thumbPath,
          durationSeconds: result.durationSeconds ?? undefined,
          channel: result.channel ?? undefined,
          // Required by the podcast axis (today / newest-first / age retention);
          // the info sidecar is the only place the date exists.
          publishedAt: result.publishedAt ?? undefined,
          error: null,
          lastSeenAt: new Date(),
        }).where(eq(schema.youtubeVideos.id, id));
      },
      markFailed: async (id, error) => {
        const current = (await drizzle
          .select({ attempts: schema.youtubeVideos.attempts })
          .from(schema.youtubeVideos)
          .where(eq(schema.youtubeVideos.id, id))
          .limit(1))[0] as { attempts?: number } | undefined;
        const attempts = (current?.attempts ?? 0) + 1;
        const retryAt = new Date(Date.now() + retryDelayMs(attempts));
        await drizzle.update(schema.youtubeVideos)
          .set({ status: 'FAILED', error, attempts, retryAt })
          .where(eq(schema.youtubeVideos.id, id));
      },
    });
  }

  for (const failure of outcome.failed) {
    const title = pending.find((video: { id: number; title: string }) => video.id === failure.id)?.title
      ?? `video ${failure.id}`;
    try {
      options.onFailure?.({ title, error: failure.error });
    } catch {
      // An alerting failure must not fail the job; the receipt below still records the error.
    }
  }

  const receipt: DownloadReceipt = {
    at: new Date().toISOString(),
    attempted: outcome.attempted,
    downloaded: outcome.downloaded,
    failed: outcome.failed,
  };
  await fsp.appendFile(pathPosix.join(options.configDir, 'youtube-download-receipts.jsonl'), `${JSON.stringify(receipt)}\n`);
  return receipt;
}
