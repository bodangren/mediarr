/**
 * NotificationDispatchService
 *
 * Publishes notification events via the SSE ApiEventHub so connected clients
 * (primarily the Android TV app) receive real-time push notifications.
 *
 * Supported events: grab, download, seriesAdd, episodeDelete.
 * Each method formats a structured payload and publishes it to the hub.
 * Errors from the hub are swallowed so a broken connection never blocks the main flow.
 */

export interface GrabPayload {
  title: string;
  indexer?: string;
  size?: number;
  quality?: string;
}

export interface DownloadPayload {
  title: string;
  mediaType: 'movie' | 'episode';
  isUpgrade?: boolean;
}

export interface SeriesAddPayload {
  title: string;
  year?: number;
}

export interface EpisodeDeletePayload {
  seriesTitle: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

/** Minimal interface required from ApiEventHub */
export interface EventPublisher {
  publish(event: string, payload: unknown): void;
}

// ── Service class ─────────────────────────────────────────────────────────────

export class NotificationDispatchService {
  constructor(private readonly eventHub: EventPublisher) {}

  notifyGrab(payload: GrabPayload): void {
    try {
      this.eventHub.publish('notification:grab', {
        title: payload.title,
        indexer: payload.indexer ?? null,
        quality: payload.quality ?? null,
        size: payload.size ?? null,
        sizeFormatted: payload.size != null ? formatBytes(payload.size) : null,
      });
    } catch (error) {
      console.error('[NotificationDispatchService] Failed to publish notification:grab:', error);
    }
  }

  notifyDownload(payload: DownloadPayload): void {
    try {
      this.eventHub.publish('notification:download', {
        title: payload.title,
        mediaType: payload.mediaType,
        isUpgrade: payload.isUpgrade ?? false,
      });
    } catch (error) {
      console.error('[NotificationDispatchService] Failed to publish notification:download:', error);
    }
  }

  notifySeriesAdd(payload: SeriesAddPayload): void {
    try {
      this.eventHub.publish('notification:seriesAdd', {
        title: payload.title,
        year: payload.year ?? null,
      });
    } catch (error) {
      console.error('[NotificationDispatchService] Failed to publish notification:seriesAdd:', error);
    }
  }

  notifyEpisodeDelete(payload: EpisodeDeletePayload): void {
    try {
      const episodeRef =
        payload.seasonNumber != null && payload.episodeNumber != null
          ? `S${String(payload.seasonNumber).padStart(2, '0')}E${String(payload.episodeNumber).padStart(2, '0')}`
          : payload.episodeTitle ?? 'unknown episode';

      this.eventHub.publish('notification:episodeDelete', {
        seriesTitle: payload.seriesTitle,
        episodeRef,
        episodeTitle: payload.episodeTitle ?? null,
        seasonNumber: payload.seasonNumber ?? null,
        episodeNumber: payload.episodeNumber ?? null,
      });
    } catch (error) {
      console.error('[NotificationDispatchService] Failed to publish notification:episodeDelete:', error);
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
