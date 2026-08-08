import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

interface DownloadClientSettings {
  maxActiveDownloads: number;
  seedLimitAction: 'pause' | 'remove';
}

test.describe('Download Client settings durable workflow', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('saves a non-destructive limit and retains it after a full reload', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    await page.goto(`${server.origin}/settings/clients`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Download Client', exact: true })).toBeVisible();
    const limit = page.getByRole('spinbutton', {
      name: 'Max Active Downloads (0 = unlimited)',
      exact: true,
    });
    await expect(limit).toHaveValue('3');

    const saveResponsePromise = page.waitForResponse(response => (
      response.url() === `${server.origin}/api/download-client`
      && response.request().method() === 'PUT'
      && response.status() === 200
    ));
    await limit.fill('4');
    await page.getByRole('button', { name: 'Save Download Client Settings', exact: true }).click();
    await saveResponsePromise;
    await expect(limit).toHaveValue('4');

    const settingsResponse = await page.request.get(`${server.origin}/api/download-client`);
    expect(settingsResponse.ok()).toBe(true);
    await expect(settingsResponse.json()).resolves.toEqual(expect.objectContaining({
      data: expect.objectContaining<DownloadClientSettings>({
        maxActiveDownloads: 4,
        seedLimitAction: 'pause',
      }),
    }));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Download Client', exact: true })).toBeVisible();
    await expect(page.getByRole('spinbutton', {
      name: 'Max Active Downloads (0 = unlimited)',
      exact: true,
    })).toHaveValue('4');
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
