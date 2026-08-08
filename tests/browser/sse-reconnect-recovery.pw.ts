import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

interface SseProbe {
  created: number;
  opens: number;
  errors: number;
  torrentStats: Array<Array<{ infoHash?: string; status?: string }>>;
}

function readSseProbe() {
  return window.__browserSseReconnectProbe as SseProbe;
}

declare global {
  interface Window {
    __browserSseReconnectProbe: SseProbe;
  }
}

test.describe('SSE reconnect recovery', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr({ completionDelayMs: 60_000 });
  });

  test.afterAll(async () => {
    await server?.close();
  });

  test('reconnects the real browser EventSource and applies post-restart torrent stats', async ({ page }) => {
    await page.addInitScript(() => {
      const nativeEventSource = window.EventSource;
      const probe = {
        created: 0,
        opens: 0,
        errors: 0,
        torrentStats: [] as Array<Array<{ infoHash?: string; status?: string }>>,
      };
      window.__browserSseReconnectProbe = probe;
      window.EventSource = new Proxy(nativeEventSource, {
        construct(target, argumentsList) {
          const source = Reflect.construct(target, argumentsList) as EventSource;
          if (new URL(String(argumentsList[0]), window.location.href).pathname !== '/api/events/stream') {
            return source;
          }
          probe.created += 1;
          source.addEventListener('open', () => { probe.opens += 1; });
          source.addEventListener('error', () => { probe.errors += 1; });
          source.addEventListener('torrent:stats', (event) => {
            try {
              probe.torrentStats.push(JSON.parse(event.data));
            } catch {
              // The app ignores malformed events too; keep this probe passive.
            }
          });
          return source;
        },
      }) as typeof EventSource;
    });

    await page.goto(`${server.origin}/activity/queue`, { waitUntil: 'domcontentloaded' });
    const row = page.getByRole('row').filter({ hasText: 'Browser Acceptance Queue Item' });
    await expect(row).toBeVisible();
    await expect(row).toContainText(/queued/i);
    await expect.poll(() => page.evaluate(() => window.__browserSseReconnectProbe.opens)).toBeGreaterThanOrEqual(1);
    const opensBeforeRestart = await page.evaluate(() => window.__browserSseReconnectProbe.opens);

    await server.restart();
    const recoveredFailures = captureBrowserFailures(page, server.origin);
    await expect.poll(
      () => page.evaluate(() => window.__browserSseReconnectProbe.opens),
      { timeout: 20_000 },
    ).toBeGreaterThan(opensBeforeRestart);

    const pauseResult = await page.evaluate(async (infoHash) => {
      const response = await fetch(`/api/torrents/${infoHash}/pause`, { method: 'PATCH' });
      return { ok: response.ok, status: response.status };
    }, '0123456789abcdef0123456789abcdef01234567');
    expect(pauseResult).toEqual({ ok: true, status: 200 });

    await expect.poll(async () => page.evaluate(readSseProbe), { timeout: 12_000 }).toEqual(
      expect.objectContaining({
        torrentStats: expect.arrayContaining([
          expect.arrayContaining([
            expect.objectContaining({
              infoHash: '0123456789abcdef0123456789abcdef01234567',
              status: 'paused',
            }),
          ]),
        ]),
      }),
    );
    await expect(row).toContainText(/paused/i);
    expect(recoveredFailures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
