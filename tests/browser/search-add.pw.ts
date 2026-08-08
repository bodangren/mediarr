import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

test.describe('deterministic metadata search and wanted persistence', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('searches, adds a movie to Wanted, and keeps it after a full Wanted reload', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    const searchResponse = page.waitForResponse((response) =>
      response.url().includes('/api/search?') && response.status() === 200,
    );

    await page.goto(`${server.origin}/search`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Search by title...').fill('Browser Search');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await searchResponse;

    const searchMovie = page
      .getByRole('heading', { name: 'Browser Search Movie', exact: true })
      .locator('xpath=../..');
    await searchMovie.getByRole('button', { name: 'Add to Wanted', exact: true }).click();
    await expect(page.getByText('Added to Wanted', { exact: true })).toBeVisible();
    await expect(page.getByText('"Browser Search Movie" has been added to your collection.', { exact: true })).toBeVisible();

    await page.goto(`${server.origin}/wanted`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Wanted', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Browser Search Movie', exact: false })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('cell', { name: 'Browser Search Movie', exact: false })).toBeVisible();
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
