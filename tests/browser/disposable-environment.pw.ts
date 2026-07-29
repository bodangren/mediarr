import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

test('boots the built SPA through the real seeded daemon and removes its roots', async ({
  page,
}) => {
  let server: DisposableMediarr | undefined;
  let disposableRoot = '';

  try {
    server = await startDisposableMediarr();
    disposableRoot = server.paths.root;
    expect(existsSync(disposableRoot)).toBe(true);

    const failures = captureBrowserFailures(page, server.origin);
    const response = await page.goto(server.origin, {
      waitUntil: 'domcontentloaded',
    });

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('navigation', { name: 'Sidebar Navigation' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    const movieResponse = await page.request.get(`${server.origin}/api/movies`);
    expect(movieResponse.ok()).toBe(true);
    expect(await movieResponse.text()).toContain('Browser Acceptance Movie');

    const seriesResponse = await page.request.get(`${server.origin}/api/series`);
    expect(seriesResponse.ok()).toBe(true);
    expect(await seriesResponse.text()).toContain('Browser Acceptance Series');

    const notificationsResponse = await page.request.get(
      `${server.origin}/api/notifications`,
    );
    expect(notificationsResponse.ok()).toBe(true);
    expect(await notificationsResponse.text()).toContain(
      'Browser Acceptance Webhook',
    );

    const notificationPageResponse = await page.goto(
      `${server.origin}/settings/notifications`,
      { waitUntil: 'domcontentloaded' },
    );
    expect(notificationPageResponse?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Notifications' }),
    ).toBeVisible();
    await expect(page.getByText('Browser Acceptance Webhook')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add Notification' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Edit Browser Acceptance Webhook' }),
    ).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Browser Acceptance Webhook')).toBeVisible();

    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  } finally {
    await server?.close();
  }

  expect(disposableRoot).not.toBe('');
  expect(existsSync(disposableRoot)).toBe(false);
});

test('serves the shared placeholder poster from the built production SPA', async ({
  page,
}) => {
  let server: DisposableMediarr | undefined;

  try {
    server = await startDisposableMediarr();
    const response = await page.goto(
      `${server.origin}/images/placeholder-poster.png`,
      { waitUntil: 'load' },
    );

    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('image/png');

    const body = await response?.body();
    expect(body?.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(body?.byteLength).toBeGreaterThan(100);

    const renderedPoster = page.locator('img');
    await expect(renderedPoster).toBeVisible();
    const naturalSize = await renderedPoster.evaluate((image) => ({
      height: (image as HTMLImageElement).naturalHeight,
      width: (image as HTMLImageElement).naturalWidth,
    }));
    expect(naturalSize.width).toBeGreaterThan(0);
    expect(naturalSize.height).toBeGreaterThan(0);
  } finally {
    await server?.close();
  }
});
