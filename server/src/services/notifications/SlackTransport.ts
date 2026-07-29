import type { Notification } from '../../types/modelTypes';
import { readNotificationConfig, readString } from './config';
import { fetchWithTimeout, type TransportHttpOptions } from './http';
import type { NotificationEvent, NotificationTransport } from './transport';

export class SlackTransport implements NotificationTransport {
  constructor(private readonly httpOptions: TransportHttpOptions = {}) {}

  async send(notification: Notification, event: NotificationEvent): Promise<void> {
    const config = readNotificationConfig(notification);
    const webhookUrl = readString(config, 'webhookUrl', 'url');
    if (!webhookUrl) {
      throw new Error('Slack transport is missing webhook URL');
    }

    const response = await fetchWithTimeout(
      webhookUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*${event.title}*\n${event.message}` }),
      },
      this.httpOptions,
      'Slack transport request timed out',
    );

    if (!response.ok) {
      throw new Error(`Slack transport failed with status ${response.status}`);
    }
  }
}
