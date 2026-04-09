import type { Notification } from '@prisma/client';
import { readHeaders, readNotificationConfig, readString } from './config';
import { fetchWithTimeout, type TransportHttpOptions } from './http';
import type { NotificationEvent, NotificationTransport } from './transport';

export class WebhookTransport implements NotificationTransport {
  constructor(private readonly httpOptions: TransportHttpOptions = {}) {}

  async send(notification: Notification, event: NotificationEvent): Promise<void> {
    const config = readNotificationConfig(notification);
    const webhookUrl = readString(config, 'webhookUrl', 'url');
    if (!webhookUrl) {
      throw new Error('Webhook transport is missing webhook URL');
    }

    const method = normalizeMethod(readString(config, 'method') ?? 'POST');
    const headers = {
      'Content-Type': 'application/json',
      ...readHeaders(config, 'headers'),
    };

    const payload = {
      event: event.type,
      title: event.title,
      message: event.message,
      data: event.data ?? {},
    };

    const request: RequestInit = {
      method,
      headers,
    };

    if (method !== 'GET') {
      request.body = JSON.stringify(payload);
    }

    const response = await fetchWithTimeout(
      webhookUrl,
      request,
      this.httpOptions,
      'Webhook transport request timed out',
    );

    if (!response.ok) {
      throw new Error(`Webhook transport failed with status ${response.status}`);
    }
  }
}

function normalizeMethod(method: string): 'GET' | 'POST' | 'PUT' {
  const normalized = method.toUpperCase();
  if (normalized === 'GET' || normalized === 'PUT') {
    return normalized;
  }
  return 'POST';
}
