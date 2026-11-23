import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { youtubeAuthArgs } from './YoutubeDownloadService';
import {
  normalizeYoutubeVideoId,
  selectNewEntries,
  queueNewVideos,
  type FeedEntry,
  type VideoPersistence,
} from './YoutubeLibrary';

/**
 * `yt-dlp` subscription poller (track feature_youtube_library_20261107, Phase 1).
 *
 * Uses a maintained extractor rather than scraping: `--flat-playlist --dump-single-json` returns the
 * listing in one bounded call. Entries are filtered by `selectNewEntries` (dedupe by video id, skip
 * shorts/live, per-poll cap) and inserted by `queueNewVideos`, so a repeated poll cannot download a
 * video twice. Every subscription records the poll time, or the exact failure — no silent skips.
 */

const execFileAsync = promisify(execFile);

export interface YtDlpEntry {
  id?: string;
  title?: string;
  duration?: number | null;
  channel?: string | null;
  timestamp?: number | null;
  url?: string | null;
}

export interface PollableSubscription {
  id: number;
  url: string;
  title: string | null;
  /**
   * Podcast sources only need the newest few: queuing 25 episodes to keep 3 wastes
   * bandwidth and disk before retention runs. When set, it caps what this poll queues.
   */
  queueCap?: number | null;
}

export interface SubscriptionStore {
  videos: VideoPersistence & { existingVideoIds(): Promise<Set<string>> };
  recordPoll(id: number, outcome: { at: Date; error?: string | null }): Promise<void>;
}

export interface PollResult {
  subscriptionId: number;
  seen: number;
  queued: number;
  duplicates: number;
  skipped: number;
  failures: Array<{ videoId: string; error: string }>;
  error: string | null;
}

export interface PollerOptions {
  ytDlpPath?: string;
  perPollCap?: number;
  timeoutMs?: number;
  runJson?: (args: string[]) => Promise<unknown>;
}

/**
 * Flatten a yt-dlp listing. A channel URL returns tabs (`Videos`, `Shorts`, `Live`) as nested
 * `entries`; only leaves carry an 11-character video id. Reading only the top level yielded
 * `seen: 0` on a real channel — a silent miss that looked like "nothing new".
 */
function toFeedEntries(payload: unknown): FeedEntry[] {
  const results: FeedEntry[] = [];

  const walk = (nodes: unknown, options: { shortTab: boolean; liveTab: boolean }): void => {
    if (!Array.isArray(nodes)) return;
    for (const raw of nodes) {
      const node = raw as YtDlpEntry & { entries?: unknown; title?: string };
      const title = typeof node.title === 'string' ? node.title : '';
      const childShort = options.shortTab || /shorts/i.test(title);
      const childLive = options.liveTab || /\blive\b/i.test(title);
      if (Array.isArray(node.entries)) {
        walk(node.entries, { shortTab: childShort, liveTab: childLive });
        continue;
      }
      const videoId = normalizeYoutubeVideoId(node.id ?? node.url ?? null);
      if (videoId === null) continue;
      const url = node.url ?? '';
      results.push({
        videoId,
        title: (node.title ?? videoId).trim(),
        channel: node.channel ?? null,
        durationSeconds: typeof node.duration === 'number' ? Math.trunc(node.duration) : null,
        publishedAt: typeof node.timestamp === 'number' ? new Date(node.timestamp * 1000) : null,
        isShort: options.shortTab || url.includes('/shorts/'),
        isLive: options.liveTab,
      });
    }
  };

  walk((payload as { entries?: unknown })?.entries, { shortTab: false, liveTab: false });
  return results;
}

export class YoutubeFeedPoller {
  private readonly ytDlpPath: string;
  private readonly perPollCap: number;
  private readonly timeoutMs: number;
  private readonly runJson: (args: string[]) => Promise<unknown>;

  constructor(options: PollerOptions = {}) {
    this.ytDlpPath = options.ytDlpPath ?? process.env.YT_DLP_PATH ?? 'yt-dlp';
    this.perPollCap = options.perPollCap ?? 25;
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.runJson = options.runJson ?? (async (args) => {
      const { stdout } = await execFileAsync(this.ytDlpPath, args, {
        timeout: this.timeoutMs,
        maxBuffer: 32 * 1024 * 1024,
      });
      const text = String(stdout).trim();
      const firstBrace = text.indexOf('{');
      return JSON.parse(firstBrace >= 0 ? text.slice(firstBrace) : text);
    });
  }

  async poll(subscription: PollableSubscription, store: SubscriptionStore): Promise<PollResult> {
    const base: PollResult = {
      subscriptionId: subscription.id,
      seen: 0,
      queued: 0,
      duplicates: 0,
      skipped: 0,
      failures: [],
      error: null,
    };

    // yt-dlp paginates every tab of a channel (Videos, Live, Shorts) before it emits the single
    // JSON document, so an unbounded channel request grows with the channel's whole history: the
    // RealClear Politics channel took 100–120 s and hit the 120 s timeout on 2026-11-23. Only the
    // newest slice can ever be queued, so bound the extraction and keep the poll far inside its
    // timeout; the headroom above the cap absorbs entries that are already queued or filtered.
    const cap = Math.max(1, Math.min(this.perPollCap, subscription.queueCap ?? this.perPollCap));
    const listingBound = Math.max(40, cap * 3);

    let payload: unknown;
    try {
      payload = await this.runJson([
        ...youtubeAuthArgs(),
        '--playlist-end',
        String(listingBound),
        '--flat-playlist',
        '--dump-single-json',
        '--no-warnings',
        '--ignore-errors',
        subscription.url,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await store.recordPoll(subscription.id, { at: new Date(), error: message });
      return { ...base, error: message };
    }

    const entries = toFeedEntries(payload);
    const existing = await store.videos.existingVideoIds();
    const decision = selectNewEntries(entries, existing, { perPollCap: cap });
    const outcome = await queueNewVideos(decision.accepted, subscription.id, store.videos);

    const result: PollResult = {
      ...base,
      seen: entries.length,
      queued: outcome.queued,
      duplicates: outcome.duplicates + decision.skipped.filter((item) => item.reason === 'duplicate').length,
      skipped: decision.skipped.length,
      failures: outcome.failures,
    };
    await store.recordPoll(subscription.id, { at: new Date(), error: null });
    return result;
  }
}
