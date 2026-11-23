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

/** Default pull window: the same seven-day retention window the YouTube library uses. */
export const DEFAULT_PULL_WINDOW_DAYS = 7;

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
  /**
   * Pull window in days: only episodes published inside it are queued. Defaults to
   * {@link DEFAULT_PULL_WINDOW_DAYS}; a subscription's `options.retentionDays` overrides it.
   */
  windowDays?: number | null;
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
  /** Pull window this poll applied, in days. */
  windowDays: number;
  /** Listing entries that fell inside the window. */
  windowEntries: number;
  /** Video ids inside the window, so the caller can retire queued rows outside it. */
  windowVideoIds: string[];
  /** Video ids the listing proved older than the window. */
  outsideVideoIds: string[];
  /**
   * True when the listing reached past the window's cutoff, so every video newer than the
   * cutoff is present in `windowVideoIds` and a queued row missing from it is provably outside.
   */
  windowComplete: boolean;
}

export interface PollerOptions {
  ytDlpPath?: string;
  perPollCap?: number;
  timeoutMs?: number;
  /** Pull window applied when the subscription carries none. */
  windowDays?: number;
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
  private readonly windowDays: number;
  private readonly runJson: (args: string[]) => Promise<unknown>;

  constructor(options: PollerOptions = {}) {
    this.ytDlpPath = options.ytDlpPath ?? process.env.YT_DLP_PATH ?? 'yt-dlp';
    this.perPollCap = options.perPollCap ?? 25;
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.windowDays = options.windowDays ?? DEFAULT_PULL_WINDOW_DAYS;
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
    const windowDays = Math.max(1, Math.min(365, Math.trunc(subscription.windowDays ?? this.windowDays)));
    const base: PollResult = {
      subscriptionId: subscription.id,
      seen: 0,
      queued: 0,
      duplicates: 0,
      skipped: 0,
      failures: [],
      error: null,
      windowDays,
      windowEntries: 0,
      windowVideoIds: [],
      outsideVideoIds: [],
      windowComplete: false,
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
        // Channel tabs only know an upload's approximate age, and yt-dlp drops even that from a
        // flat listing unless asked: without dates a pull cannot be bounded by the retention
        // window, which is how a poll used to walk into a channel's back catalogue.
        '--extractor-args',
        'youtubetab:approximate_date',
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

    // Only what the retention window keeps is worth queueing: a poll that accepted the first N
    // *new* entries walked deeper into the catalogue on every run (the 25 newest already queued,
    // so the next poll took 26–50, then 51–75, …), which filled the queue with years-old uploads.
    const cutoffMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const windowVideoIds: string[] = [];
    const outsideVideoIds: string[] = [];
    let candidates: FeedEntry[];
    if (entries.some((entry) => entry.publishedAt !== null)) {
      for (const entry of entries) {
        const publishedAt = entry.publishedAt;
        if (publishedAt === null || publishedAt === undefined) continue; // live-tab noise
        if (publishedAt.getTime() >= cutoffMs) windowVideoIds.push(entry.videoId);
        else outsideVideoIds.push(entry.videoId);
      }
      candidates = entries.filter((entry) => {
        const publishedAt = entry.publishedAt;
        return publishedAt !== null && publishedAt !== undefined && publishedAt.getTime() >= cutoffMs;
      });
    } else {
      // An undated listing (a plain playlist) cannot be windowed, so hold it to the newest slice
      // the queue cap can hold: the catalogue beyond that is never drained either.
      candidates = entries.slice(0, cap);
    }

    const decision = selectNewEntries(candidates, existing, { perPollCap: cap });
    const outcome = await queueNewVideos(decision.accepted, subscription.id, store.videos);

    const result: PollResult = {
      ...base,
      seen: entries.length,
      queued: outcome.queued,
      duplicates: outcome.duplicates + decision.skipped.filter((item) => item.reason === 'duplicate').length,
      skipped: decision.skipped.length,
      failures: outcome.failures,
      windowEntries: windowVideoIds.length,
      windowVideoIds,
      outsideVideoIds,
      windowComplete: outsideVideoIds.length > 0,
    };
    await store.recordPoll(subscription.id, { at: new Date(), error: null });
    return result;
  }
}
