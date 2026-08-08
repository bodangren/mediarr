import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

test.describe('durable scheduler interval editing', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('updates the live rss-sync interval and keeps it after a full reload', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    await page.goto(`${server.origin}/settings/automation`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Automation', exact: true })).toBeVisible();
    const taskRow = page.getByRole('row').filter({ hasText: 'rss-sync' });
    await expect(taskRow).toContainText('*/15 * * * *');
    const intervalResponse = page.waitForResponse((response) => (
      response.url().includes('/api/scheduler/rss-sync/interval')
      && response.request().method() === 'PUT'
      && response.status() === 200
    ));
    await page.getByRole('button', { name: '30m', exact: true }).click();
    await intervalResponse;
    await expect(page.getByRole('button', { name: '30m', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(taskRow).toContainText('*/30 * * * *');

    const [tasksResponse, settingsResponse] = await Promise.all([
      page.request.get(`${server.origin}/api/scheduler/tasks`),
      page.request.get(`${server.origin}/api/settings`),
    ]);
    expect(tasksResponse.ok()).toBe(true);
    expect(settingsResponse.ok()).toBe(true);
    const tasksPayload = await tasksResponse.json() as {
      data: Array<{ id: string; cronExpression: string }>;
    };
    const settingsPayload = await settingsResponse.json() as {
      data: { schedulerIntervals: { rssSyncMinutes: number } };
    };
    expect(tasksPayload.data).toContainEqual(
      expect.objectContaining({ id: 'rss-sync', cronExpression: '*/30 * * * *' }),
    );
    expect(settingsPayload.data.schedulerIntervals.rssSyncMinutes).toBe(30);

    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloadedTaskRow = page.getByRole('row').filter({ hasText: 'rss-sync' });
    await expect(page.getByRole('button', { name: '30m', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(reloadedTaskRow).toContainText('*/30 * * * *');
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
