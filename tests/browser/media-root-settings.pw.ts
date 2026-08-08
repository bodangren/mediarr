import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

interface MediaManagementSettings {
  movieRootFolder: string;
  tvRootFolder: string;
}

test.describe('Media root settings durable workflow', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('validates and persists a writable movie root after a full reload', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    const movieRoot = path.join(server.paths.data, 'media-root-verification', 'movies');
    await mkdir(movieRoot, { recursive: true });

    await page.goto(`${server.origin}/settings/media`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Media Management', exact: true })).toBeVisible();
    const movieRootInput = page.getByRole('textbox', { name: 'Movie Root Folder', exact: true });
    await expect(movieRootInput).not.toHaveValue('');

    await movieRootInput.fill(movieRoot);
    const validationResponse = page.waitForResponse(response => (
      response.url().includes(`/api/filesystem?path=${encodeURIComponent(movieRoot)}`)
      && response.status() === 200
    ));
    await page.getByRole('button', { name: 'Validate movie root folder', exact: true }).click();
    await validationResponse;
    await expect(page.getByText('Writable', { exact: true })).toBeVisible();

    const saveResponse = page.waitForResponse(response => (
      response.url() === `${server.origin}/api/settings/media`
      && response.request().method() === 'PUT'
      && response.status() === 200
    ));
    await page.getByRole('button', { name: 'Save Media Settings', exact: true }).click();
    await saveResponse;

    const settingsResponse = await page.request.get(`${server.origin}/api/settings/media`);
    expect(settingsResponse.ok()).toBe(true);
    await expect(settingsResponse.json()).resolves.toEqual(expect.objectContaining({
      data: expect.objectContaining<MediaManagementSettings>({ movieRootFolder: movieRoot }),
    }));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Media Management', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Movie Root Folder', exact: true })).toHaveValue(movieRoot);
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
