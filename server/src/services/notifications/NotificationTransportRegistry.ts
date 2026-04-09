import type { NotificationTransport } from './transport';
import { DiscordTransport } from './DiscordTransport';
import { EmailTransport } from './EmailTransport';
import { GotifyTransport } from './GotifyTransport';
import { TelegramTransport } from './TelegramTransport';
import { WebhookTransport } from './WebhookTransport';

export class NotificationTransportRegistry {
  private readonly transportMap: Record<string, NotificationTransport>;

  constructor(overrides: Record<string, NotificationTransport> = {}) {
    this.transportMap = {
      webhook: new WebhookTransport(),
      discord: new DiscordTransport(),
      telegram: new TelegramTransport(),
      gotify: new GotifyTransport(),
      email: new EmailTransport(),
      ...normalizeOverrideKeys(overrides),
    };
  }

  getTransport(type: string): NotificationTransport | null {
    return this.transportMap[type.toLowerCase()] ?? null;
  }
}

function normalizeOverrideKeys(overrides: Record<string, NotificationTransport>): Record<string, NotificationTransport> {
  const normalized: Record<string, NotificationTransport> = {};
  for (const [key, transport] of Object.entries(overrides)) {
    normalized[key.toLowerCase()] = transport;
  }
  return normalized;
}
