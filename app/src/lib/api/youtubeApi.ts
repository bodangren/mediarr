import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

const videoSchema = z.object({
  id: z.number(),
  videoId: z.string(),
  title: z.string(),
  channel: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  publishedAt: z.string().nullable().optional(),
  isWatched: z.boolean(),
  position: z.number(),
  /** Set for downloaded videos; used to name the exact file in the delete confirmation. */
  path: z.string().nullable().optional(),
  streamUrl: z.string(),
  thumbUrl: z.string(),
});

const listSchema = z.object({ items: z.array(videoSchema), count: z.number() });

const queueSchema = z.object({
  available: z.number(),
  pending: z.number(),
  downloading: z.number(),
  failed: z.number(),
  retrying: z.number().optional().default(0),
  exhausted: z.number().optional().default(0),
  quarantined: z.number().optional().default(0),
  total: z.number(),
  throughput: z.object({
    windowHours: z.number(),
    downloaded: z.number(),
    runs: z.number(),
    perHour: z.number(),
    etaHours: z.number().nullable(),
  }).optional(),
});

const subscriptionSchema = z.object({
  id: z.number(),
  kind: z.string(),
  url: z.string(),
  externalId: z.string().nullable().optional(),
  title: z.string().nullable(),
  enabled: z.boolean(),
  lastPolledAt: z.string().nullable().optional(),
  lastError: z.string().nullable().optional(),
  options: z
    .object({ podcast: z.boolean().optional(), keepLatest: z.number().optional() })
    .passthrough()
    .optional(),
  added: z.string(),
});

const pollResultSchema = z.object({
  subscriptionId: z.number(),
  seen: z.number(),
  queued: z.number(),
  duplicates: z.number(),
  skipped: z.number(),
  failures: z.array(z.object({ videoId: z.string(), error: z.string() })),
  error: z.string().nullable(),
});

const pollAllSchema = z.object({
  at: z.string(),
  subscriptions: z.number(),
  results: z.array(pollResultSchema),
  queued: z.number(),
  failures: z.number(),
});

const queueItemSchema = z.object({
  id: z.number(),
  videoId: z.string(),
  title: z.string(),
  channel: z.string().nullable(),
  status: z.string(),
  attempts: z.number(),
  retryAt: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  isWatched: z.boolean(),
  watchedAt: z.string().nullable().optional(),
  added: z.string().optional(),
  sizeBytes: z.number().nullable().optional(),
});

const retentionCandidateSchema = z.object({
  id: z.number(),
  videoId: z.string(),
  title: z.string(),
  channel: z.string().nullable().optional(),
  source: z.string(),
  isWatched: z.boolean(),
  watchedAt: z.string().nullable(),
  path: z.string().nullable(),
  sizeBytes: z.number().nullable().optional(),
});

const retentionReceiptSchema = z.object({
  at: z.string(),
  dryRun: z.boolean(),
  retentionDays: z.number(),
  candidates: z.number(),
  moved: z.array(z.object({ id: z.number(), originalPath: z.string(), quarantinePath: z.string() })),
  failed: z.array(z.object({ id: z.number(), path: z.string(), error: z.string() })),
  skipped: z.number(),
});

const downloadReceiptSchema = z.object({
  attempted: z.number(),
  downloaded: z.number(),
  failed: z.array(z.object({ id: z.number(), videoId: z.string(), error: z.string() })),
});

export type YoutubeQueue = z.infer<typeof queueSchema>;
export type YoutubeVideo = z.infer<typeof videoSchema>;
export type YoutubeSubscription = z.infer<typeof subscriptionSchema>;
export type YoutubePollResult = z.infer<typeof pollResultSchema>;
export type YoutubePollAll = z.infer<typeof pollAllSchema>;
export type YoutubeQueueItem = z.infer<typeof queueItemSchema>;
export type YoutubeRetentionCandidate = z.infer<typeof retentionCandidateSchema>;
export type YoutubeRetentionReceipt = z.infer<typeof retentionReceiptSchema>;
export type YoutubeDownloadReceipt = z.infer<typeof downloadReceiptSchema>;

export interface YoutubePodcastOptions {
  /** Opt into podcast retention: keep only the newest `keepLatest` episodes. */
  podcast?: boolean;
  keepLatest?: number;
}

export interface YoutubeSubscriptionInput {
  url: string;
  title?: string;
  options?: YoutubePodcastOptions;
}

export interface YoutubeSubscriptionPatch {
  enabled?: boolean;
  title?: string | null;
  options?: YoutubePodcastOptions;
}

const okSchema = z.object({ id: z.number(), deleted: z.boolean() });

/** YouTube library + management client (tracks feature_youtube_library_20261107, SPA management). */
export function createYoutubeApi(client: ApiHttpClient) {
  return {
    listVideos(limit = 200): Promise<{ items: YoutubeVideo[]; count: number }> {
      return client.request({ path: '/api/youtube/videos', query: { limit } }, listSchema);
    },

    /** Download queue health: available / pending / downloading / retrying / quarantined. */
    getQueue(): Promise<YoutubeQueue> {
      return client.request({ path: '/api/youtube/queue' }, queueSchema);
    },

    // ── subscriptions ───────────────────────────────────────────────────────
    listSubscriptions(): Promise<YoutubeSubscription[]> {
      return client.request({ path: '/api/youtube/subscriptions' }, z.array(subscriptionSchema));
    },

    /** `url` must be a channel (UC… or @handle) or playlist URL; plain video URLs are rejected 422. */
    addSubscription(input: YoutubeSubscriptionInput): Promise<YoutubeSubscription> {
      return client.request(
        { path: '/api/youtube/subscriptions', method: 'POST', body: input },
        subscriptionSchema,
      );
    },

    updateSubscription(id: number, patch: YoutubeSubscriptionPatch): Promise<YoutubeSubscription> {
      return client.request(
        { path: `/api/youtube/subscriptions/${id}`, method: 'PATCH', body: patch },
        subscriptionSchema,
      );
    },

    deleteSubscription(id: number): Promise<{ id: number; deleted: boolean }> {
      return client.request(
        { path: `/api/youtube/subscriptions/${id}`, method: 'DELETE' },
        okSchema,
      );
    },

    pollSubscription(id: number): Promise<YoutubePollResult> {
      return client.request(
        { path: `/api/youtube/subscriptions/${id}/poll`, method: 'POST' },
        pollResultSchema,
      );
    },

    pollAllSubscriptions(): Promise<YoutubePollAll> {
      return client.request(
        { path: '/api/youtube/automation/poll', method: 'POST' },
        pollAllSchema,
      );
    },

    // ── queue ───────────────────────────────────────────────────────────────
    listQueueItems(
      status: 'PENDING' | 'DOWNLOADING' | 'FAILED' | 'EXHAUSTED' | 'QUARANTINED',
      limit = 50,
    ): Promise<{ items: YoutubeQueueItem[]; count: number; status: string; limit: number }> {
      return client.request(
        { path: '/api/youtube/queue/videos', query: { status, limit } },
        z.object({
          items: z.array(queueItemSchema),
          count: z.number(),
          status: z.string(),
          limit: z.number(),
        }),
      );
    },

    /** Process the oldest PENDING rows with the same service the scheduled job uses. */
    downloadBatch(limit = 1): Promise<YoutubeDownloadReceipt> {
      return client.request(
        { path: '/api/youtube/download', method: 'POST', body: { limit } },
        downloadReceiptSchema,
      );
    },

    /** Clear the retry backoff on one FAILED video. */
    retryVideo(id: number): Promise<{ id: number; status: string }> {
      return client.request(
        { path: `/api/youtube/videos/${id}/retry`, method: 'POST' },
        z.object({ id: z.number(), status: z.string() }),
      );
    },

    /** Download one specific PENDING/FAILED video now (the batch route only takes the oldest). */
    downloadVideo(id: number): Promise<YoutubeDownloadReceipt & { id: number; videoId: string }> {
      return client.request(
        { path: `/api/youtube/videos/${id}/download`, method: 'POST' },
        downloadReceiptSchema.extend({ id: z.number(), videoId: z.string() }),
      );
    },

    /** Drop a queued/failed row; refuses AVAILABLE and QUARANTINED rows. */
    removeVideo(id: number): Promise<{ id: number; deleted: boolean }> {
      return client.request(
        { path: `/api/youtube/videos/${id}`, method: 'DELETE' },
        okSchema,
      );
    },

    /** Delete the downloaded file for an available video, leaving a DELETED tombstone row. */
    deleteVideoFile(id: number): Promise<{ id: number; deleted: boolean; path: string | null }> {
      return client.request(
        { path: `/api/youtube/videos/${id}/file`, method: 'DELETE' },
        z.object({ id: z.number(), deleted: z.boolean(), path: z.string().nullable().optional() })
          .transform((value) => ({ ...value, path: value.path ?? null })),
      );
    },

    // ── retention ───────────────────────────────────────────────────────────
    listRetentionCandidates(days = 7): Promise<{
      retentionDays: number;
      candidates: YoutubeRetentionCandidate[];
      count: number;
    }> {
      return client.request(
        { path: '/api/youtube/retention/candidates', query: { days } },
        z.object({
          retentionDays: z.number(),
          candidates: z.array(retentionCandidateSchema),
          count: z.number(),
        }),
      );
    },

    listQuarantined(): Promise<{ items: YoutubeRetentionCandidate[]; count: number }> {
      return client.request(
        { path: '/api/youtube/retention/quarantined' },
        z.object({ items: z.array(retentionCandidateSchema), count: z.number() }),
      );
    },

    /** Quarantine watched videos older than `days`; `dryRun: false` actually moves files. */
    runRetention(days = 7, dryRun = true): Promise<YoutubeRetentionReceipt> {
      return client.request(
        { path: '/api/youtube/retention/run', method: 'POST', body: { days, dryRun } },
        retentionReceiptSchema,
      );
    },

    restoreRetention(id: number): Promise<{
      id: number;
      originalPath: string;
      dryRun: boolean;
      restored: boolean;
      error?: string;
    }> {
      return client.request(
        { path: '/api/youtube/retention/restore', method: 'POST', body: { id, dryRun: false } },
        z.object({
          id: z.number(),
          originalPath: z.string(),
          dryRun: z.boolean(),
          restored: z.boolean(),
          error: z.string().optional(),
        }),
      );
    },

    purgeRetention(id: number): Promise<{ id: number; dryRun: boolean; deleted: boolean }> {
      return client.request(
        { path: '/api/youtube/retention/purge', method: 'POST', body: { id, dryRun: false } },
        z.object({ id: z.number(), dryRun: z.boolean(), deleted: z.boolean() }),
      );
    },
  };
}

export type YoutubeApi = ReturnType<typeof createYoutubeApi>;
