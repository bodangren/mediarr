import { expect, test } from '@playwright/test';
import { access } from 'node:fs/promises';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

interface MovieSubtitleInventoryResponse {
  data: Array<{
    variantId: number;
    subtitleTracks: Array<{
      id: number;
      languageCode: string;
      path: string;
    }>;
    missingSubtitles: string[];
  }>;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

test.describe('movie subtitle inventory workflow', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('confirms and durably deletes the seeded subtitle row and sidecar', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    let deleteRequests = 0;
    page.on('request', request => {
      if (
        request.method() === 'DELETE'
        && request.url().startsWith(`${server.origin}/api/subtitles/`)
      ) {
        deleteRequests += 1;
      }
    });

    const beforeResponse = await page.request.get(
      `${server.origin}/api/subtitles/movie/1/variants`,
    );
    await expect(beforeResponse).toBeOK();
    const before = await beforeResponse.json() as MovieSubtitleInventoryResponse;
    const seededTrack = before.data
      .flatMap(variant => variant.subtitleTracks)
      .find(track => track.languageCode === 'en');
    expect(seededTrack).toBeDefined();
    expect(seededTrack?.path).toBe(server.paths.subtitleFile);
    expect(await pathExists(server.paths.subtitleFile)).toBe(true);

    await page.goto(`${server.origin}/library/movies/1`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Movie Details', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Available Subtitles', { exact: true })).toBeVisible();
    await expect(page.getByText('external', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Delete subtitle for en', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Delete Subtitle', exact: true }),
    ).toBeVisible();
    expect(deleteRequests).toBe(0);
    expect(await pathExists(server.paths.subtitleFile)).toBe(true);

    const deleteResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'DELETE'
      && response.url() === `${server.origin}/api/subtitles/${seededTrack!.id}`,
    );
    await page.getByRole('button', { name: 'Delete Subtitle', exact: true }).click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.ok()).toBe(true);
    expect(deleteRequests).toBe(1);
    await expect(
      page.getByRole('status').filter({ hasText: 'Subtitle removed' }),
    ).toContainText('Subtitle removed');
    await expect(
      page.getByRole('button', { name: 'Delete subtitle for en', exact: true }),
    ).toHaveCount(0);

    const afterResponse = await page.request.get(
      `${server.origin}/api/subtitles/movie/1/variants`,
    );
    await expect(afterResponse).toBeOK();
    const after = await afterResponse.json() as MovieSubtitleInventoryResponse;
    expect(after.data.flatMap(variant => variant.subtitleTracks)).toEqual([]);
    expect(await pathExists(server.paths.subtitleFile)).toBe(false);

    const reloadResponse = await page.reload({ waitUntil: 'domcontentloaded' });
    expect(reloadResponse?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Movie Details', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Available Subtitles', { exact: true })).toHaveCount(0);
    await expect(page.getByText('external', { exact: true })).toHaveCount(0);
    expect(await pathExists(server.paths.subtitleFile)).toBe(false);
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
