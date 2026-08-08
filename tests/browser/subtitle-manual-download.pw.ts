import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

interface MovieRecord {
  id: number;
  title: string;
}

interface SubtitleTrack {
  languageCode: string;
  path: string;
}

test.describe('deterministic manual subtitle download', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server?.close();
  });

  test('downloads a provider result through the browser and retains its real sidecar after reload', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    const moviesResponse = await page.request.get(`${server.origin}/api/movies?page=1&pageSize=100`);
    expect(moviesResponse.ok()).toBe(true);
    const moviesPayload = await moviesResponse.json() as { data: MovieRecord[] };
    const movie = moviesPayload.data.find((item) => item.title === 'Browser Acceptance Movie');
    expect(movie).toBeDefined();

    await page.goto(`${server.origin}/library/movies/${movie!.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Browser Acceptance Movie', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Manual Subtitles', exact: true }).click();

    const modal = page.getByRole('dialog', { name: 'Manual Subtitle Search' });
    await expect(modal).toBeVisible();
    const candidate = modal.getByRole('row').filter({ hasText: 'browser-acceptance' });
    await expect(candidate).toContainText('th');
    await candidate.getByRole('button', { name: 'Download', exact: true }).click();
    await expect(page.getByText('Download Successful', { exact: true })).toBeVisible();
    await expect(modal).toBeHidden();

    const inventoryResponse = await page.request.get(`${server.origin}/api/subtitles/movie/${movie!.id}/variants`);
    expect(inventoryResponse.ok()).toBe(true);
    const inventoryPayload = await inventoryResponse.json() as {
      data: Array<{ subtitleTracks: SubtitleTrack[] }>;
    };
    const downloaded = inventoryPayload.data.flatMap((variant) => variant.subtitleTracks)
      .find((track) => track.languageCode === 'th');
    expect(downloaded).toBeDefined();
    expect(existsSync(downloaded!.path)).toBe(true);
    expect(readFileSync(downloaded!.path, 'utf8')).toContain('Browser acceptance Thai subtitle');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Available Subtitles', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Language: th').last()).toBeVisible();
    await expect(page.getByText('external', { exact: true }).last()).toBeVisible();
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
