import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

test.describe('disposable daemon restart recovery', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('retains a browser-created Wanted movie across a controlled daemon restart', async ({
    page,
  }) => {
    await page.goto(`${server.origin}/search`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByPlaceholder('Search by title...').fill('Browser Search');
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    const movie = page
      .getByRole('heading', { name: 'Browser Search Movie', exact: true })
      .locator('xpath=../..');
    await movie
      .getByRole('button', { name: 'Add to Wanted', exact: true })
      .click();
    await expect(
      page.getByText('Added to Wanted', { exact: true }),
    ).toBeVisible();

    await page.goto(`${server.origin}/wanted`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('cell', { name: 'Browser Search Movie', exact: false }),
    ).toBeVisible();

    await server.restart();

    const recoveredFailures = captureBrowserFailures(page, server.origin);
    await page.goto(`${server.origin}/wanted`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Wanted', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Browser Search Movie', exact: false }),
    ).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('cell', { name: 'Browser Search Movie', exact: false }),
    ).toBeVisible();
    expect(recoveredFailures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
