import { expect, test } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

test.describe('durable scheduler controls', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('disables a real scheduled task, preserves the visible state, and survives reload', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    await page.goto(`${server.origin}/settings/automation`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Automation', exact: true })).toBeVisible();
    const taskRow = page.getByRole('row').filter({ hasText: 'rss-sync' });
    const enabledSwitch = taskRow.getByRole('switch', { name: 'Enable rss-sync', exact: true });
    await expect(enabledSwitch).toBeChecked();

    await enabledSwitch.click();
    await expect(enabledSwitch).not.toBeChecked();
    await expect(taskRow).toContainText(/disabled/i);
    await expect(taskRow.getByRole('button', { name: 'Run Now', exact: true })).toBeDisabled();

    const tasksResponse = await page.request.get(`${server.origin}/api/scheduler/tasks`);
    expect(tasksResponse.ok()).toBe(true);
    const tasksPayload = await tasksResponse.json() as {
      data: Array<{ id: string; enabled: boolean; status: string }>;
    };
    expect(tasksPayload.data).toContainEqual(
      expect.objectContaining({ id: 'rss-sync', enabled: false, status: 'disabled' }),
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloadedTaskRow = page.getByRole('row').filter({ hasText: 'rss-sync' });
    await expect(reloadedTaskRow.getByRole('switch', { name: 'Enable rss-sync', exact: true })).not.toBeChecked();
    await expect(reloadedTaskRow).toContainText(/disabled/i);
    await expect(reloadedTaskRow.getByRole('button', { name: 'Run Now', exact: true })).toBeDisabled();
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
