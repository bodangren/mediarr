import type { NotificationTransport } from './transport';
import { DiscordTransport } from './DiscordTransport';
import { EmailTransport } from './EmailTransport';
import { GotifyTransport } from './GotifyTransport';
import { TelegramTransport } from './TelegramTransport';
import { WebhookTransport } from './WebhookTransport';
import { PushoverTransport } from './PushoverTransport';
import { SlackTransport } from './SlackTransport';

export class NotificationTransportRegistry {
  private readonly transportMap: Record<string, NotificationTransport>;

  constructor(overrides: Record<string, NotificationTransport> = {}) {
    this.transportMap = {
      webhook: new WebhookTransport(),
      slack: new SlackTransport(),
      discord: new DiscordTransport(),
      telegram: new TelegramTransport(),
      gotify: new GotifyTransport(),
      email: new EmailTransport(),
      pushover: new PushoverTransport(),
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
