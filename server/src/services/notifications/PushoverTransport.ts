import type { Notification } from '../../types/modelTypes';
import { readNotificationConfig, readString } from './config';
import { fetchWithTimeout, type TransportHttpOptions } from './http';
import type { NotificationEvent, NotificationTransport } from './transport';

const PUSHOVER_MESSAGES_URL = 'https://api.pushover.net/1/messages.json';

export class PushoverTransport implements NotificationTransport {
  constructor(private readonly httpOptions: TransportHttpOptions = {}) {}

  async send(notification: Notification, event: NotificationEvent): Promise<void> {
    const config = readNotificationConfig(notification);
    const appToken = readString(config, 'appToken', 'token');
    const userKey = readString(config, 'userKey', 'user');

    if (!appToken) {
      throw new Error('Pushover transport is missing application token');
    }
    if (!userKey) {
      throw new Error('Pushover transport is missing user key');
    }

    const body = new URLSearchParams({
      token: appToken,
      user: userKey,
      title: event.title,
      message: event.message,
    });
    const response = await fetchWithTimeout(
      PUSHOVER_MESSAGES_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
      this.httpOptions,
      'Pushover transport request timed out',
    );

    if (!response.ok) {
      throw new Error(`Pushover transport failed with status ${response.status}`);
    }
  }
}
