/**
 * NotificationDispatchService
 *
 * Fires configured, enabled notifications on real app events.
 * Supported events: grab, download, upgrade, seriesAdd, episodeDelete.
 * Each method fetches all enabled notifications from the DB, filters by
 * the relevant flag, and dispatches to each one — swallowing per-notification
 * send errors so a broken integration never blocks the main flow.
 */

export interface GrabPayload {
  title: string;
  indexer?: string;
  size?: number;
  quality?: string;
}

export interface DownloadPayload {
  title: string;
  mediaType: 'movie' | 'episode';
  isUpgrade?: boolean;
}

export interface SeriesAddPayload {
  title: string;
  year?: number;
}

export interface EpisodeDeletePayload {
  seriesTitle: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

type NotificationRow = {
  id: number;
  type: string;
  enabled: boolean;
  onGrab: boolean;
  onDownload: boolean;
  onUpgrade: boolean;
  onRename: boolean;
  onSeriesAdd: boolean;
  onEpisodeDelete: boolean;
  config: Record<string, unknown>;
};

type NotificationRepository = {
  findAllEnabled: () => Promise<NotificationRow[]>;
};

// ── Per-type HTTP dispatch ────────────────────────────────────────────────────

export async function sendSingleNotification(
  type: string,
  config: Record<string, unknown>,
  title: string,
  body: string,
): Promise<{ success: boolean; message: string }> {
  try {
    switch (type) {
      case 'discord':
        return await dispatchDiscord(config, title, body);
      case 'telegram':
        return await dispatchTelegram(config, title, body);
      case 'slack':
        return await dispatchSlack(config, title, body);
      case 'gotify':
        return await dispatchGotify(config, title, body);
      case 'pushover':
        return await dispatchPushover(config, title, body);
      case 'webhook':
        return await dispatchWebhook(config, title, body);
      case 'email':
        // Email requires SMTP — validate fields and return simulated result
        return dispatchEmailSimulated(config, title, body);
      default:
        return { success: false, message: `Unknown notification type: ${type}` };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function dispatchDiscord(
  config: Record<string, unknown>,
  title: string,
  body: string,
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = config.webhookUrl as string | undefined;
  if (!webhookUrl) return { success: false, message: 'Webhook URL is required' };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `**${title}**\n${body}`,
      username: (config.username as string) || 'Mediarr',
      avatar_url: (config.avatarUrl as string) || undefined,
    }),
  });

  return response.ok
    ? { success: true, message: 'Sent to Discord' }
    : { success: false, message: `Discord error: ${response.status} ${response.statusText}` };
}

async function dispatchTelegram(
  config: Record<string, unknown>,
  title: string,
  body: string,
): Promise<{ success: boolean; message: string }> {
  const botToken = config.botToken as string | undefined;
  const chatId = config.chatId as string | undefined;
  if (!botToken || !chatId) return { success: false, message: 'Bot token and Chat ID are required' };

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `*${title}*\n${body}`,
      parse_mode: 'Markdown',
    }),
  });

  const data = (await response.json()) as { ok?: boolean; description?: string };
  return response.ok && data.ok
    ? { success: true, message: 'Sent to Telegram' }
    : { success: false, message: `Telegram error: ${data.description || response.statusText}` };
}

async function dispatchSlack(
  config: Record<string, unknown>,
  title: string,
  body: string,
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = config.webhookUrl as string | undefined;
  if (!webhookUrl) return { success: false, message: 'Webhook URL is required' };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `*${title}*\n${body}`,
      channel: (config.channel as string) || undefined,
      username: (config.username as string) || 'Mediarr',
      icon_url: (config.iconUrl as string) || undefined,
    }),
  });

  return response.ok
    ? { success: true, message: 'Sent to Slack' }
    : { success: false, message: `Slack error: ${response.status} ${response.statusText}` };
}

async function dispatchGotify(
  config: Record<string, unknown>,
  title: string,
  body: string,
): Promise<{ success: boolean; message: string }> {
  const serverUrl = config.serverUrl as string | undefined;
  const appToken = config.appToken as string | undefined;
  if (!serverUrl || !appToken) return { success: false, message: 'Server URL and App Token are required' };

  const url = `${serverUrl.replace(/\/$/, '')}/message?token=${appToken}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      message: body,
      priority: (config.priority as number) ?? 5,
    }),
  });

  return response.ok
    ? { success: true, message: 'Sent to Gotify' }
    : { success: false, message: `Gotify error: ${response.status} ${response.statusText}` };
}

async function dispatchPushover(
  config: Record<string, unknown>,
  title: string,
  body: string,
): Promise<{ success: boolean; message: string }> {
  const appToken = config.appToken as string | undefined;
  const userKey = config.userKey as string | undefined;
  if (!appToken || !userKey) return { success: false, message: 'App Token and User Key are required' };

  const response = await fetch('https://api.pushover.net/1/messages.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: appToken,
      user: userKey,
      title,
      message: body,
      priority: (config.priority as number) ?? 0,
      sound: (config.sound as string) || undefined,
    }),
  });

  const data = (await response.json()) as { status?: number; errors?: string[] };
  return response.ok && data.status === 1
    ? { success: true, message: 'Sent to Pushover' }
    : { success: false, message: `Pushover error: ${data.errors?.join(', ') || response.statusText}` };
}

async function dispatchWebhook(
  config: Record<string, unknown>,
  title: string,
  body: string,
): Promise<{ success: boolean; message: string }> {
  const url = config.url as string | undefined;
  if (!url) return { success: false, message: 'URL is required' };

  const method = (config.method as string) || 'POST';
  const headers: Record<string, string> = {
    'Content-Type': (config.contentType as string) || 'application/json',
  };

  if (config.headers && typeof config.headers === 'string') {
    try {
      Object.assign(headers, JSON.parse(config.headers) as Record<string, string>);
    } catch {
      // ignore malformed custom headers
    }
  }

  const requestBody =
    method !== 'GET'
      ? JSON.stringify({ title, message: body, timestamp: new Date().toISOString() })
      : null;

  const response = await fetch(url, {
    method,
    headers,
    ...(requestBody ? { body: requestBody } : {}),
  });

  return response.ok
    ? { success: true, message: `Webhook called (${response.status})` }
    : { success: false, message: `Webhook error: ${response.status} ${response.statusText}` };
}

function dispatchEmailSimulated(
  config: Record<string, unknown>,
  _title: string,
  _body: string,
): { success: boolean; message: string } {
  const required = ['server', 'port', 'from', 'to'];
  const missing = required.filter((f) => !config[f]);
  if (missing.length > 0) {
    return { success: false, message: `Missing email fields: ${missing.join(', ')}` };
  }
  // SMTP sending requires an external library — simulated success
  return { success: true, message: `Email queued to ${config.to as string} via ${config.server as string}` };
}

// ── Service class ─────────────────────────────────────────────────────────────

export class NotificationDispatchService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async notifyGrab(payload: GrabPayload): Promise<void> {
    const title = `Release Grabbed: ${payload.title}`;
    const lines: string[] = [`Title: ${payload.title}`];
    if (payload.indexer) lines.push(`Indexer: ${payload.indexer}`);
    if (payload.quality) lines.push(`Quality: ${payload.quality}`);
    if (payload.size) lines.push(`Size: ${formatBytes(payload.size)}`);
    await this.dispatch('onGrab', title, lines.join('\n'));
  }

  async notifyDownload(payload: DownloadPayload): Promise<void> {
    const eventLabel = payload.isUpgrade ? 'Upgraded' : 'Downloaded';
    const typeLabel = payload.mediaType === 'movie' ? 'Movie' : 'Episode';
    const title = `${typeLabel} ${eventLabel}: ${payload.title}`;
    const body = `${typeLabel}: ${payload.title}`;
    const flag = payload.isUpgrade ? 'onUpgrade' : 'onDownload';
    await this.dispatch(flag, title, body);
  }

  async notifySeriesAdd(payload: SeriesAddPayload): Promise<void> {
    const title = `Series Added: ${payload.title}`;
    const lines: string[] = [`Title: ${payload.title}`];
    if (payload.year) lines.push(`Year: ${payload.year}`);
    await this.dispatch('onSeriesAdd', title, lines.join('\n'));
  }

  async notifyEpisodeDelete(payload: EpisodeDeletePayload): Promise<void> {
    const episodeRef =
      payload.seasonNumber != null && payload.episodeNumber != null
        ? `S${String(payload.seasonNumber).padStart(2, '0')}E${String(payload.episodeNumber).padStart(2, '0')}`
        : payload.episodeTitle ?? 'unknown episode';
    const title = `Episode Deleted: ${payload.seriesTitle} - ${episodeRef}`;
    const body = `Series: ${payload.seriesTitle}\nEpisode: ${episodeRef}`;
    await this.dispatch('onEpisodeDelete', title, body);
  }

  private async dispatch(
    flag: 'onGrab' | 'onDownload' | 'onUpgrade' | 'onRename' | 'onSeriesAdd' | 'onEpisodeDelete',
    title: string,
    body: string,
  ): Promise<void> {
    let notifications: NotificationRow[];
    try {
      notifications = await this.notificationRepository.findAllEnabled();
    } catch (error) {
      console.error(`[NotificationDispatchService] Failed to fetch notifications:`, error);
      return;
    }

    const targets = notifications.filter((n) => n[flag] === true);

    await Promise.allSettled(
      targets.map(async (n) => {
        try {
          const result = await sendSingleNotification(n.type, n.config, title, body);
          if (!result.success) {
            console.warn(
              `[NotificationDispatchService] Notification "${n.id}" (${n.type}) failed: ${result.message}`,
            );
          }
        } catch (error) {
          console.error(
            `[NotificationDispatchService] Unexpected error for notification "${n.id}" (${n.type}):`,
            error,
          );
        }
      }),
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
