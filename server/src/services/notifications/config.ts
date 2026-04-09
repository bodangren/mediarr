import type { Notification } from '@prisma/client';

export type NotificationConfig = Record<string, unknown>;

export function readNotificationConfig(notification: Notification): NotificationConfig {
  const raw = notification.config as unknown;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(raw) ? raw : {};
}

export function readString(config: NotificationConfig, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function readNumber(config: NotificationConfig, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

export function readBoolean(config: NotificationConfig, ...keys: string[]): boolean | null {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
  }
  return null;
}

export function readHeaders(config: NotificationConfig, ...keys: string[]): Record<string, string> {
  for (const key of keys) {
    const value = config[key];
    if (isRecord(value)) {
      return toStringRecord(value);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (isRecord(parsed)) {
          return toStringRecord(parsed);
        }
      } catch {
        // ignore invalid JSON headers
      }
    }
  }

  return {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStringRecord(value: Record<string, unknown>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      output[key] = entry;
    } else if (entry != null) {
      output[key] = String(entry);
    }
  }
  return output;
}
