import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { startDisposableMediarr, type DisposableMediarr } from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

test.describe('deterministic wanted acquisition queue', () => {
  let server: DisposableMediarr;
  test.beforeAll(async () => {
    // Keep the fixture downloading long enough for the browser to render the
    // initial state before the real API event stream publishes completion.
    server = await startDisposableMediarr({ completionDelayMs: 6_500 });
  });
  test.afterAll(async () => { await server.close(); });

  test('imports a contextual Wanted Search grab through Queue into the real movie library', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    let eventStreamConnected = false;
    page.on('request', request => {
      if (request.url() === `${server.origin}/api/events/stream`) {
        eventStreamConnected = true;
      }
    });
    await page.goto(`${server.origin}/search`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Search by title...').fill('Browser Search');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    const card = page.getByRole('heading', { name: 'Browser Search Movie', exact: true }).locator('xpath=../..');
    await card.getByRole('button', { name: 'Add to Wanted', exact: true }).click();
    await expect(page.getByText('Added to Wanted', { exact: true })).toBeVisible();

    await page.goto(`${server.origin}/wanted`, { waitUntil: 'domcontentloaded' });
    const row = page.getByRole('row').filter({ hasText: 'Browser Search Movie' });
    await row.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Search started for Browser Search Movie' })).toBeVisible();

    await page.goto(`${server.origin}/activity/queue`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Queue', exact: true })).toBeVisible();
    const queueRow = page.getByRole('row').filter({ hasText: 'Browser.Search.Movie.2026.1080p.WEB-DL-BROWSER' });
    await expect(queueRow).toBeVisible();
    await expect(queueRow).toContainText(/downloading/i);
    await expect(queueRow).toContainText('42%');
    await expect.poll(() => eventStreamConnected).toBe(true);
    await expect(queueRow).toContainText(/seeding/i, { timeout: 20_000 });
    await expect(queueRow).toContainText('100%');

    await page.goto(`${server.origin}/library/movies`, { waitUntil: 'domcontentloaded' });
    const importedMovie = page.locator('article').filter({ hasText: 'Browser Search Movie' });
    await expect(importedMovie).toBeVisible({ timeout: 15_000 });
    await expect(importedMovie).toContainText(/completed/i);

    const moviesResponse = await page.request.get(`${server.origin}/api/movies?page=1&pageSize=100`);
    expect(moviesResponse.ok()).toBe(true);
    const moviesPayload = await moviesResponse.json() as {
      data: Array<{ title: string; path?: string | null; fileVariants?: Array<{ path?: string | null }> }>;
    };
    const importedMovieRecord = moviesPayload.data.find(movie => movie.title === 'Browser Search Movie');
    expect(importedMovieRecord).toEqual(expect.objectContaining({
      path: path.join(server.paths.data, 'media', 'movies', 'Browser Search Movie (2026)'),
      fileVariants: [expect.objectContaining({
        path: path.join(
          server.paths.data,
          'media',
          'movies',
          'Browser Search Movie (2026)',
          'Browser Search Movie (2026).mp4',
        ),
      })],
    }));
    expect(existsSync(path.join(
      server.paths.data,
      'downloads',
      'complete',
      'abcdefabcdefabcdefabcdefabcdefabcdefabcd.mp4',
    ))).toBe(true);
    expect(existsSync(importedMovieRecord?.fileVariants?.[0]?.path ?? '')).toBe(true);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').filter({ hasText: 'Browser Search Movie' })).toBeVisible();
    expect(failures.snapshot()).toEqual({ consoleErrors: [], pageErrors: [], requestFailures: [], responseFailures: [] });
  });
});
