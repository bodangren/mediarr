import { expect, test } from '@playwright/test';
import path from 'node:path';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

test.describe('unconfigured setup wizard', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr({ setupCompleted: false });
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('persists guided setup through a hard dashboard reload', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    const movieRoot = path.join(server.paths.data, 'media', 'movies');
    const tvRoot = path.join(server.paths.data, 'media', 'tv');

    await page.goto(`${server.origin}/setup`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Setup Wizard', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Continue Guided Setup', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Root Folders', exact: true })).toBeVisible();

    await page.getByRole('textbox', { name: /Movie Root Folder/ }).fill(movieRoot);
    await page.getByRole('textbox', { name: /TV Root Folder/ }).fill(tvRoot);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Indexers', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quality Profile', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Mediarr is ready', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Go to Dashboard', exact: true }).click();
    await expect(page).toHaveURL(`${server.origin}/dashboard`);
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

    const persisted = await page.request.get(`${server.origin}/api/setup/status`);
    await expect(persisted).toBeOK();
    await expect(persisted.json()).resolves.toEqual(
      expect.objectContaining({ data: expect.objectContaining({ isConfigured: true }) }),
    );

    await page.goto(`${server.origin}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
