import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

test.describe('deterministic metadata provider recovery', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('shows a local provider outage and recovers with a subsequent successful search', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    await page.goto(`${server.origin}/search`, { waitUntil: 'domcontentloaded' });

    await page.getByPlaceholder('Search by title...').fill('Browser Provider Failure');
    const failedSearch = page.waitForResponse((response) =>
      response.url().includes('/api/search?') && response.status() === 502,
    );
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await failedSearch;
    await expect(page.getByText(
      'Browser acceptance metadata provider is temporarily unavailable',
      { exact: true },
    )).toBeVisible();

    await page.getByPlaceholder('Search by title...').fill('Browser Search');
    const recoveredSearch = page.waitForResponse((response) =>
      response.url().includes('/api/search?') && response.status() === 200,
    );
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await recoveredSearch;
    await expect(page.getByRole('heading', { name: 'Browser Search Movie', exact: true })).toBeVisible();
    await expect(page.getByText(
      'Browser acceptance metadata provider is temporarily unavailable',
      { exact: true },
    )).not.toBeVisible();
    expect(failures.snapshot()).toEqual({
      // The deterministic outage is the scenario under test. Any extra browser
      // or same-origin failure makes this assertion fail.
      consoleErrors: [
        'Failed to load resource: the server responded with a status of 502 (Bad Gateway)',
      ],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [
        `502 GET ${server.origin}/api/search?term=Browser+Provider+Failure`,
      ],
    });
  });
});
