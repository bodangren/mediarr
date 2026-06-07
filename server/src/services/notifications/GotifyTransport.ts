import type { Notification } from '../../types/modelTypes';
import { readNotificationConfig, readNumber, readString } from './config';
import { fetchWithTimeout, type TransportHttpOptions } from './http';
import type { NotificationEvent, NotificationTransport } from './transport';

export class GotifyTransport implements NotificationTransport {
  constructor(private readonly httpOptions: TransportHttpOptions = {}) {}

  async send(notification: Notification, event: NotificationEvent): Promise<void> {
    const config = readNotificationConfig(notification);
    const serverUrl = readString(config, 'serverUrl', 'url');
    const appToken = readString(config, 'appToken');

    if (!serverUrl) {
      throw new Error('Gotify transport is missing server URL');
    }
    if (!appToken) {
      throw new Error('Gotify transport is missing app token');
    }

    const normalizedServerUrl = serverUrl.replace(/\/$/, '');
    const priority = readNumber(config, 'priority') ?? priorityForEvent(event.type);

    const response = await fetchWithTimeout(
      `${normalizedServerUrl}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gotify-Key': appToken,
        },
        body: JSON.stringify({
          title: event.title,
          message: event.message,
          priority,
          extras: {
            eventType: event.type,
            data: event.data ?? {},
          },
        }),
      },
      this.httpOptions,
      'Gotify transport request timed out',
    );

    if (!response.ok) {
      throw new Error(`Gotify transport failed with status ${response.status}`);
    }
  }
}

function priorityForEvent(eventType: NotificationEvent['type']): number {
  if (eventType === 'download') return 7;
  if (eventType === 'grab') return 5;
  return 8;
}
