import type { Notification } from '../../types/modelTypes';
import { readNotificationConfig, readString } from './config';
import { fetchWithTimeout, type TransportHttpOptions } from './http';
import type { NotificationEvent, NotificationTransport } from './transport';

export class TelegramTransport implements NotificationTransport {
  constructor(private readonly httpOptions: TransportHttpOptions = {}) {}

  async send(notification: Notification, event: NotificationEvent): Promise<void> {
    const config = readNotificationConfig(notification);
    const botToken = readString(config, 'botToken', 'token');
    const chatId = readString(config, 'chatId');

    if (!botToken) {
      throw new Error('Telegram transport is missing bot token');
    }
    if (!chatId) {
      throw new Error('Telegram transport is missing chatId');
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          parse_mode: 'Markdown',
          text: formatMessage(event),
          disable_web_page_preview: true,
        }),
      },
      this.httpOptions,
      'Telegram transport request timed out',
    );

    if (!response.ok) {
      throw new Error(`Telegram transport failed with status ${response.status}`);
    }
  }
}

function formatMessage(event: NotificationEvent): string {
  const base = `*${escapeMarkdown(event.title)}*\n${escapeMarkdown(event.message)}`;
  const data = event.data ?? {};
  if (Object.keys(data).length === 0) {
    return base;
  }

  const lines = Object.entries(data).map(([key, value]) => `${escapeMarkdown(key)}: ${escapeMarkdown(stringifyValue(value))}`);
  return `${base}\n\n${lines.join('\n')}`;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return 'null';
  return JSON.stringify(value);
}

function escapeMarkdown(value: string): string {
  return value.replace(/([_*`\[\]])/g, '\\$1');
}
