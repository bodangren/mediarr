import type { Notification } from '@prisma/client';
import { readNotificationConfig, readString } from './config';
import { fetchWithTimeout, type TransportHttpOptions } from './http';
import type { NotificationEvent, NotificationTransport } from './transport';

export class DiscordTransport implements NotificationTransport {
  constructor(private readonly httpOptions: TransportHttpOptions = {}) {}

  async send(notification: Notification, event: NotificationEvent): Promise<void> {
    const config = readNotificationConfig(notification);
    const webhookUrl = readString(config, 'webhookUrl', 'url');
    if (!webhookUrl) {
      throw new Error('Discord transport is missing webhook URL');
    }

    const fields = Object.entries(event.data ?? {}).map(([name, value]) => ({
      name,
      value: stringifyValue(value),
      inline: false,
    }));

    const payload = {
      embeds: [
        {
          title: event.title,
          description: event.message,
          color: colorForEvent(event.type),
          fields,
        },
      ],
    };

    const response = await fetchWithTimeout(
      webhookUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      this.httpOptions,
      'Discord transport request timed out',
    );

    if (!response.ok) {
      throw new Error(`Discord transport failed with status ${response.status}`);
    }
  }
}

function colorForEvent(eventType: NotificationEvent['type']): number {
  if (eventType === 'download') return 0x2ecc71;
  if (eventType === 'grab') return 0x3498db;
  return 0xe74c3c;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return 'null';
  return JSON.stringify(value);
}
