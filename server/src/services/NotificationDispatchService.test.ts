import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationDispatchService, sendSingleNotification } from './NotificationDispatchService';

// ── sendSingleNotification unit tests ──────────────────────────────────────

describe('sendSingleNotification', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns error for unknown type', async () => {
    const result = await sendSingleNotification('unknown_type', {}, 'title', 'body');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown notification type');
  });

  it('discord: returns error when webhookUrl missing', async () => {
    const result = await sendSingleNotification('discord', {}, 'title', 'body');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Webhook URL');
  });

  it('discord: returns success on 2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' }));
    const result = await sendSingleNotification(
      'discord',
      { webhookUrl: 'https://discord.com/api/webhooks/test' },
      'Test Title',
      'Test body',
    );
    expect(result.success).toBe(true);
  });

  it('discord: returns failure on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' }));
    const result = await sendSingleNotification(
      'discord',
      { webhookUrl: 'https://discord.com/api/webhooks/test' },
      'Test',
      'body',
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('400');
  });

  it('telegram: returns error when botToken or chatId missing', async () => {
    const result = await sendSingleNotification('telegram', { botToken: 'abc' }, 'title', 'body');
    expect(result.success).toBe(false);
  });

  it('telegram: returns success on ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }),
    );
    const result = await sendSingleNotification(
      'telegram',
      { botToken: 'abc', chatId: '123' },
      'title',
      'body',
    );
    expect(result.success).toBe(true);
  });

  it('slack: returns error when webhookUrl missing', async () => {
    const result = await sendSingleNotification('slack', {}, 'title', 'body');
    expect(result.success).toBe(false);
  });

  it('gotify: returns error when serverUrl or appToken missing', async () => {
    const result = await sendSingleNotification('gotify', { serverUrl: 'http://x' }, 'title', 'body');
    expect(result.success).toBe(false);
  });

  it('pushover: returns error when appToken or userKey missing', async () => {
    const result = await sendSingleNotification('pushover', {}, 'title', 'body');
    expect(result.success).toBe(false);
  });

  it('webhook: returns error when url missing', async () => {
    const result = await sendSingleNotification('webhook', {}, 'title', 'body');
    expect(result.success).toBe(false);
  });

  it('webhook: sends request with correct method and body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);
    await sendSingleNotification(
      'webhook',
      { url: 'http://example.com/hook', method: 'POST' },
      'title',
      'body',
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com/hook',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('email: returns simulated success with required fields', async () => {
    const result = await sendSingleNotification(
      'email',
      { server: 'smtp.example.com', port: 587, from: 'a@b.com', to: 'c@d.com' },
      'title',
      'body',
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain('c@d.com');
  });

  it('email: returns failure when required fields are missing', async () => {
    const result = await sendSingleNotification('email', { server: 'smtp.x.com' }, 'title', 'body');
    expect(result.success).toBe(false);
  });
});

// ── NotificationDispatchService unit tests ─────────────────────────────────

function makeRepo(notifications: any[] = []) {
  return {
    findAllEnabled: vi.fn().mockResolvedValue(notifications),
  };
}

function makeNotification(overrides: Partial<{
  id: number; type: string; onGrab: boolean; onDownload: boolean;
  onUpgrade: boolean; onSeriesAdd: boolean; onEpisodeDelete: boolean;
  config: Record<string, unknown>;
}> = {}) {
  return {
    id: 1,
    type: 'discord',
    enabled: true,
    onGrab: false,
    onDownload: false,
    onUpgrade: false,
    onRename: false,
    onSeriesAdd: false,
    onEpisodeDelete: false,
    config: { webhookUrl: 'https://discord.com/api/webhooks/test' },
    ...overrides,
  };
}

describe('NotificationDispatchService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  });

  describe('notifyGrab', () => {
    it('dispatches to notifications with onGrab=true', async () => {
      const repo = makeRepo([makeNotification({ onGrab: true })]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifyGrab({ title: 'My Movie', indexer: 'TestIndexer', size: 1024 * 1024 });
      expect(repo.findAllEnabled).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('skips notifications with onGrab=false', async () => {
      const repo = makeRepo([makeNotification({ onGrab: false })]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifyGrab({ title: 'My Movie' });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('dispatches to multiple matching notifications', async () => {
      const repo = makeRepo([
        makeNotification({ id: 1, onGrab: true }),
        makeNotification({ id: 2, onGrab: true, type: 'slack', config: { webhookUrl: 'https://hooks.slack.com/test' } }),
        makeNotification({ id: 3, onGrab: false }),
      ]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifyGrab({ title: 'Release' });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('swallows errors from individual notification sends without throwing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
      const repo = makeRepo([makeNotification({ onGrab: true })]);
      const svc = new NotificationDispatchService(repo);
      // Should not throw
      await expect(svc.notifyGrab({ title: 'Movie' })).resolves.toBeUndefined();
    });

    it('does not throw when repository fails', async () => {
      const repo = { findAllEnabled: vi.fn().mockRejectedValue(new Error('db error')) };
      const svc = new NotificationDispatchService(repo);
      await expect(svc.notifyGrab({ title: 'Movie' })).resolves.toBeUndefined();
    });
  });

  describe('notifyDownload', () => {
    it('uses onDownload flag for non-upgrade downloads', async () => {
      const repo = makeRepo([
        makeNotification({ onDownload: true }),
        makeNotification({ id: 2, onUpgrade: true }), // should NOT fire
      ]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifyDownload({ title: 'Movie', mediaType: 'movie' });
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('uses onUpgrade flag when isUpgrade=true', async () => {
      const repo = makeRepo([
        makeNotification({ onDownload: true }), // should NOT fire
        makeNotification({ id: 2, onUpgrade: true }),
      ]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifyDownload({ title: 'Movie', mediaType: 'movie', isUpgrade: true });
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('includes mediaType label in title for episodes', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal('fetch', mockFetch);
      const repo = makeRepo([makeNotification({ onDownload: true })]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifyDownload({ title: 'Breaking Bad S01E01', mediaType: 'episode' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.content).toContain('Episode');
    });
  });

  describe('notifySeriesAdd', () => {
    it('dispatches to notifications with onSeriesAdd=true', async () => {
      const repo = makeRepo([makeNotification({ onSeriesAdd: true })]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifySeriesAdd({ title: 'Breaking Bad', year: 2008 });
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('skips notifications with onSeriesAdd=false', async () => {
      const repo = makeRepo([makeNotification({ onSeriesAdd: false })]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifySeriesAdd({ title: 'Breaking Bad' });
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('notifyEpisodeDelete', () => {
    it('dispatches to notifications with onEpisodeDelete=true', async () => {
      const repo = makeRepo([makeNotification({ onEpisodeDelete: true })]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifyEpisodeDelete({
        seriesTitle: 'Breaking Bad',
        seasonNumber: 1,
        episodeNumber: 5,
      });
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('formats episode reference correctly in message', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal('fetch', mockFetch);
      const repo = makeRepo([makeNotification({ onEpisodeDelete: true })]);
      const svc = new NotificationDispatchService(repo);
      await svc.notifyEpisodeDelete({
        seriesTitle: 'Breaking Bad',
        seasonNumber: 3,
        episodeNumber: 10,
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.content).toContain('S03E10');
    });
  });
});
