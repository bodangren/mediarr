import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

interface EventsResponse {
  data: Array<{ message: string }>;
  meta: { totalCount: number };
}

interface ClearEventsResponse {
  data: { cleared: number };
}

test.describe('system events destructive workflow', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('requires confirmation and persists a clear through hard reload', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    let clearRequests = 0;
    page.on('request', request => {
      if (
        request.method() === 'DELETE'
        && request.url() === `${server.origin}/api/system/events/clear`
      ) {
        clearRequests += 1;
      }
    });

    const beforeResponse = await page.request.get(
      `${server.origin}/api/system/events?page=1&pageSize=25`,
    );
    await expect(beforeResponse).toBeOK();
    const before = await beforeResponse.json() as EventsResponse;
    expect(before.meta.totalCount).toBeGreaterThan(0);
    expect(before.data.some(event => event.message === 'Imported Browser Acceptance Movie')).toBe(true);

    await page.goto(`${server.origin}/system/events`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
    await expect(page.getByText('Imported Browser Acceptance Movie', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Clear All', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Clear System Events', exact: true }),
    ).toBeVisible();
    expect(clearRequests).toBe(0);
    await expect(page.getByText('Imported Browser Acceptance Movie', { exact: true })).toBeVisible();

    const clearResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'DELETE'
      && response.url() === `${server.origin}/api/system/events/clear`,
    );
    await page.getByRole('button', { name: 'Clear All Events', exact: true }).click();
    const clearResponse = await clearResponsePromise;
    expect(clearResponse.ok()).toBe(true);
    const clearResult = await clearResponse.json() as ClearEventsResponse;
    expect(clearRequests).toBe(1);
    expect(clearResult.data.cleared).toBe(before.meta.totalCount);
    const clearMessage =
      `Cleared ${clearResult.data.cleared} system ${clearResult.data.cleared === 1 ? 'event' : 'events'}.`;
    await expect(
      page.getByRole('status').filter({ hasText: clearMessage }),
    ).toHaveText(clearMessage);
    await expect(page.getByText('No events found.', { exact: true })).toBeVisible();

    const afterResponse = await page.request.get(
      `${server.origin}/api/system/events?page=1&pageSize=25`,
    );
    await expect(afterResponse).toBeOK();
    await expect(afterResponse.json()).resolves.toEqual(
      expect.objectContaining({
        data: [],
        meta: expect.objectContaining({ totalCount: 0 }),
      }),
    );

    const reloadResponse = await page.reload({ waitUntil: 'domcontentloaded' });
    expect(reloadResponse?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
    await expect(page.getByText('No events found.', { exact: true })).toBeVisible();
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
