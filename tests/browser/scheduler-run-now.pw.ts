import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

test.describe('manual scheduler execution', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('runs rss-sync, exposes its success in Task History, and keeps it after reload', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    await page.goto(`${server.origin}/settings/automation`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Automation', exact: true })).toBeVisible();
    const scheduledTaskRow = page.getByRole('row').filter({ hasText: 'rss-sync' });
    const triggerResponse = page.waitForResponse((response) => (
      response.url().includes('/api/scheduler/rss-sync/trigger')
      && response.request().method() === 'POST'
      && response.status() === 202
    ));
    await scheduledTaskRow.getByRole('button', { name: 'Run Now', exact: true }).click();
    await triggerResponse;
    await expect(page.getByText('Task triggered', { exact: true })).toBeVisible();

    const historySection = page.getByRole('heading', { name: 'Task History', exact: true }).locator('..');
    const historyRow = historySection.getByRole('row').filter({ hasText: 'rss-sync' });
    await expect(historyRow).toContainText('SUCCESS', { timeout: 15_000 });

    const historyResponse = await page.request.get(`${server.origin}/api/scheduler/history?page=1&pageSize=25`);
    expect(historyResponse.ok()).toBe(true);
    const historyPayload = await historyResponse.json() as {
      data: Array<{ taskName: string; status: string; completedAt: string | null; durationMs: number | null }>;
    };
    expect(historyPayload.data).toContainEqual(expect.objectContaining({
      taskName: 'rss-sync',
      status: 'SUCCESS',
      completedAt: expect.any(String),
      durationMs: expect.any(Number),
    }));

    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloadedHistorySection = page.getByRole('heading', { name: 'Task History', exact: true }).locator('..');
    await expect(reloadedHistorySection.getByRole('row').filter({ hasText: 'rss-sync' })).toContainText('SUCCESS');
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
