import type { Notification } from '../../types/modelTypes';

export type NotificationEventType =
  | 'grab'
  | 'download'
  | 'import'
  | 'seriesAdd'
  | 'episodeDelete'
  | 'health';

export interface NotificationEvent {
  type: NotificationEventType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface NotificationTransport {
  send(notification: Notification, event: NotificationEvent): Promise<void>;
}
