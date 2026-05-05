import type { Notification } from '@prisma/client';
import { NotificationTransportRegistry } from './notifications/NotificationTransportRegistry';
import type { NotificationEvent, NotificationTransport } from './notifications/transport';

/**
 * NotificationDispatchService
 *
 * Publishes notification events via SSE for connected clients and then forwards
 * the same event payload to any enabled external notification transports.
 * External transport failures are isolated so one failing transport cannot block
 * the main media pipeline.
 */

export interface GrabPayload {
  title: string;
  indexer?: string | undefined;
  size?: number | undefined;
  quality?: string | undefined;
}

export interface DownloadPayload {
  title: string;
  mediaType: 'movie' | 'episode';
  isUpgrade?: boolean | undefined;
}

export interface SeriesAddPayload {
  title: string;
  year?: number | undefined;
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

export interface NotificationRepositoryLike {
  findAllEnabled(): Promise<Notification[]>;
}

export interface NotificationTransportRegistryLike {
  getTransport(type: string): NotificationTransport | null;
}

// ── Service class ─────────────────────────────────────────────────────────────

export class NotificationDispatchService {
  constructor(
    private readonly eventHub: EventPublisher,
    private readonly notificationRepository?: NotificationRepositoryLike,
    private readonly transportRegistry: NotificationTransportRegistryLike = new NotificationTransportRegistry(),
  ) {}

  notifyGrab(payload: GrabPayload): void {
    try {
      const ssePayload = {
        title: payload.title,
        indexer: payload.indexer ?? null,
        quality: payload.quality ?? null,
        size: payload.size ?? null,
        sizeFormatted: payload.size != null ? formatBytes(payload.size) : null,
      };
      this.eventHub.publish('notification:grab', ssePayload);

      void this.dispatchExternalNotifications({
        type: 'grab',
        title: 'Release Grabbed',
        message: payload.indexer
          ? `${payload.title} grabbed from ${payload.indexer}`
          : `${payload.title} grabbed`,
        data: ssePayload,
      });
    } catch (error) {
      console.error('[NotificationDispatchService] Failed to publish notification:grab:', error);
    }
  }

  notifyDownload(payload: DownloadPayload): void {
    try {
      const ssePayload = {
        title: payload.title,
        mediaType: payload.mediaType,
        isUpgrade: payload.isUpgrade ?? false,
      };
      this.eventHub.publish('notification:download', ssePayload);

      void this.dispatchExternalNotifications({
        type: 'download',
        title: payload.isUpgrade ? 'Upgrade Completed' : 'Download Completed',
        message: payload.isUpgrade
          ? `${payload.title} was upgraded`
          : `${payload.title} finished downloading`,
        data: ssePayload,
      });
    } catch (error) {
      console.error('[NotificationDispatchService] Failed to publish notification:download:', error);
    }
  }

  notifySeriesAdd(payload: SeriesAddPayload): void {
    try {
      const ssePayload = {
        title: payload.title,
        year: payload.year ?? null,
      };
      this.eventHub.publish('notification:seriesAdd', ssePayload);

      void this.dispatchExternalNotifications({
        type: 'seriesAdd',
        title: 'Series Added',
        message: payload.year != null
          ? `${payload.title} (${payload.year}) added to library`
          : `${payload.title} added to library`,
        data: ssePayload,
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

      const ssePayload = {
        seriesTitle: payload.seriesTitle,
        episodeRef,
        episodeTitle: payload.episodeTitle ?? null,
        seasonNumber: payload.seasonNumber ?? null,
        episodeNumber: payload.episodeNumber ?? null,
      };

      this.eventHub.publish('notification:episodeDelete', ssePayload);

      void this.dispatchExternalNotifications({
        type: 'episodeDelete',
        title: 'Episode Deleted',
        message: `${payload.seriesTitle} ${episodeRef} deleted`,
        data: ssePayload,
      });
    } catch (error) {
      console.error('[NotificationDispatchService] Failed to publish notification:episodeDelete:', error);
    }
  }

  private async dispatchExternalNotifications(event: NotificationEvent): Promise<void> {
    if (!this.notificationRepository) {
      return;
    }

    let enabledNotifications: Notification[] = [];
    try {
      enabledNotifications = await this.notificationRepository.findAllEnabled();
    } catch (error) {
      console.error('[NotificationDispatchService] Failed to load enabled notifications:', error);
      return;
    }

    const candidates = enabledNotifications.filter((notification) =>
      shouldDispatchNotification(notification, event),
    );
    if (candidates.length === 0) {
      return;
    }

    const groupedByType = new Map<string, Notification[]>();
    for (const notification of candidates) {
      const type = notification.type.toLowerCase();
      const group = groupedByType.get(type) ?? [];
      group.push(notification);
      groupedByType.set(type, group);
    }

    for (const [type, notifications] of groupedByType.entries()) {
      const transport = this.transportRegistry.getTransport(type);
      if (!transport) {
        console.warn(`[NotificationDispatchService] No transport registered for notification type "${type}"`);
        continue;
      }

      for (const notification of notifications) {
        try {
          await transport.send(notification, event);
        } catch (error) {
          console.error(
            `[NotificationDispatchService] Transport send failed for notification ${notification.id} (${type}):`,
            error,
          );
        }
      }
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function shouldDispatchNotification(notification: Notification, event: NotificationEvent): boolean {
  switch (event.type) {
    case 'grab':
      return notification.onGrab;
    case 'download': {
      const isUpgrade = event.data?.isUpgrade === true;
      if (isUpgrade) {
        return notification.onUpgrade || notification.onDownload;
      }
      return notification.onDownload;
    }
    case 'seriesAdd':
      return notification.onSeriesAdd;
    case 'episodeDelete':
      return notification.onEpisodeDelete;
    case 'import':
      return notification.onDownload;
    case 'health':
      return notification.onSeriesAdd;
    default:
      return false;
  }
}
