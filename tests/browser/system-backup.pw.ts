import { expect, test } from '@playwright/test';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

interface BackupEntry {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'manual' | 'scheduled';
}

interface BackupResponse {
  data: BackupEntry;
}

interface BackupListResponse {
  data: BackupEntry[];
}

interface RestoreBackupResponse {
  data: {
    id: string;
    restartRequired: boolean;
    safetyBackupId: string;
  };
}

interface SettingsResponse {
  data: {
    logging: {
      logLevel: string;
    };
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

test.describe('System Backup durable workflow', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('creates, reloads, and safely deletes a real SQLite backup file', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    let deleteRequests = 0;
    page.on('request', request => {
      if (
        request.method() === 'DELETE'
        && request.url().startsWith(`${server.origin}/api/backups/`)
      ) {
        deleteRequests += 1;
      }
    });

    const initialResponse = await page.request.get(`${server.origin}/api/backups`);
    await expect(initialResponse).toBeOK();
    await expect(initialResponse.json()).resolves.toEqual(
      expect.objectContaining({ data: [] }),
    );

    await page.goto(`${server.origin}/system/backup`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: 'Backup', exact: true })).toBeVisible();
    await expect(page.getByText('No backups yet', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Automatic backup scheduling is not available in this deployment.', {
        exact: true,
      }),
    ).toBeVisible();

    const createResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'POST'
      && response.url() === `${server.origin}/api/backups`,
    );
    await page.getByRole('button', { name: 'Back Up Now', exact: true }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json() as BackupResponse).data;
    expect(created.type).toBe('manual');
    expect(path.dirname(created.path)).toBe(server.paths.backups);
    expect(created.size).toBeGreaterThan(0);
    expect(await pathExists(created.path)).toBe(true);
    expect((await readFile(created.path)).subarray(0, 15).toString()).toBe('SQLite format 3');
    await expect(page.getByText(created.name, { exact: true })).toBeVisible();

    const listedResponse = await page.request.get(`${server.origin}/api/backups`);
    await expect(listedResponse).toBeOK();
    const listed = await listedResponse.json() as BackupListResponse;
    expect(listed.data).toContainEqual(expect.objectContaining({ id: created.id }));

    const createReloadResponse = await page.reload({ waitUntil: 'domcontentloaded' });
    expect(createReloadResponse?.status()).toBe(200);
    const backupRow = page.getByRole('row').filter({ hasText: created.name });
    await expect(backupRow).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await backupRow.getByRole('button', { name: 'Download', exact: true }).click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toBe(created.name);
    const downloadedPath = await download.path();
    expect(downloadedPath).not.toBeNull();
    expect((await readFile(downloadedPath!)).subarray(0, 15).toString()).toBe('SQLite format 3');

    await backupRow.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete Backup', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(created.name);
    expect(deleteRequests).toBe(0);
    expect(await pathExists(created.path)).toBe(true);

    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(deleteRequests).toBe(0);
    await expect(backupRow).toBeVisible();
    expect(await pathExists(created.path)).toBe(true);

    await backupRow.getByRole('button', { name: 'Delete', exact: true }).click();
    const reopenedDialog = page.getByRole('dialog', { name: 'Delete Backup', exact: true });
    await expect(reopenedDialog).toBeVisible();
    const deleteResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'DELETE'
      && response.url() === `${server.origin}/api/backups/${encodeURIComponent(created.id)}`,
    );
    await reopenedDialog.getByRole('button', { name: 'Delete Backup', exact: true }).click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.ok()).toBe(true);
    expect(deleteRequests).toBe(1);
    await expect(page.getByText('No backups yet', { exact: true })).toBeVisible();

    const deletedResponse = await page.request.get(`${server.origin}/api/backups`);
    await expect(deletedResponse).toBeOK();
    await expect(deletedResponse.json()).resolves.toEqual(
      expect.objectContaining({ data: [] }),
    );
    expect(await pathExists(created.path)).toBe(false);

    const deleteReloadResponse = await page.reload({ waitUntil: 'domcontentloaded' });
    expect(deleteReloadResponse?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Backup', exact: true })).toBeVisible();
    await expect(page.getByText('No backups yet', { exact: true })).toBeVisible();
    expect(await pathExists(created.path)).toBe(false);
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });

  test('safely restores a changed persisted setting after explicit daemon restart', async ({ page }) => {
    const failures = captureBrowserFailures(page, server.origin);
    let restoreRequests = 0;
    page.on('request', request => {
      if (
        request.method() === 'POST'
        && request.url().endsWith('/restore')
      ) {
        restoreRequests += 1;
      }
    });

    await page.goto(`${server.origin}/system/backup`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText('No backups yet', { exact: true })).toBeVisible();

    const createResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'POST'
      && response.url() === `${server.origin}/api/backups`,
    );
    await page.getByRole('button', { name: 'Back Up Now', exact: true }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json() as BackupResponse).data;
    await expect(page.getByText(created.name, { exact: true })).toBeVisible();

    const originalSettingsResponse = await page.request.get(`${server.origin}/api/settings`);
    await expect(originalSettingsResponse).toBeOK();
    const originalSettings = await originalSettingsResponse.json() as SettingsResponse;
    expect(originalSettings.data.logging.logLevel).toBe('info');

    const mutationResponse = await page.request.patch(`${server.origin}/api/settings`, {
      data: {
        logging: {
          logLevel: 'debug',
        },
      },
    });
    await expect(mutationResponse).toBeOK();
    const mutatedSettings = await mutationResponse.json() as SettingsResponse;
    expect(mutatedSettings.data.logging.logLevel).toBe('debug');

    const backupRow = page.getByRole('row').filter({ hasText: created.name });
    await backupRow.getByRole('button', { name: 'Restore', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Restore Backup', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(created.name);
    await expect(dialog).toContainText(/restart/i);
    expect(restoreRequests).toBe(0);

    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(restoreRequests).toBe(0);
    await expect(backupRow).toBeVisible();

    await backupRow.getByRole('button', { name: 'Restore', exact: true }).click();
    const reopenedDialog = page.getByRole('dialog', { name: 'Restore Backup', exact: true });
    await expect(reopenedDialog).toBeVisible();
    const restoreResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'POST'
      && response.url()
        === `${server.origin}/api/backups/${encodeURIComponent(created.id)}/restore`,
    );
    await reopenedDialog.getByRole('button', { name: 'Restore Backup', exact: true }).click();
    const restoreResponse = await restoreResponsePromise;
    expect(restoreResponse.ok()).toBe(true);
    expect(restoreRequests).toBe(1);
    const restored = (await restoreResponse.json() as RestoreBackupResponse).data;
    expect(restored).toEqual(expect.objectContaining({
      id: created.id,
      restartRequired: true,
      safetyBackupId: expect.any(String),
    }));
    await expect(
      page.getByRole('status').filter({
        hasText: 'Backup restored. Restart Mediarr to finish applying it.',
      }),
    ).toHaveText('Backup restored. Restart Mediarr to finish applying it.');

    const safetyBackupPath = path.join(server.paths.backups, restored.safetyBackupId);
    expect(await pathExists(created.path)).toBe(true);
    expect(await pathExists(safetyBackupPath)).toBe(true);
    expect((await readFile(safetyBackupPath)).subarray(0, 15).toString())
      .toBe('SQLite format 3');
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });

    const browserContext = page.context();
    await page.close();
    await server.restart();

    const restoredPage = await browserContext.newPage();
    const restartFailures = captureBrowserFailures(restoredPage, server.origin);
    const postRestartSettingsResponse = await restoredPage.request.get(
      `${server.origin}/api/settings`,
    );
    await expect(postRestartSettingsResponse).toBeOK();
    const postRestartSettings =
      await postRestartSettingsResponse.json() as SettingsResponse;
    expect(postRestartSettings.data.logging.logLevel).toBe('info');

    await restoredPage.goto(`${server.origin}/system/backup`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(restoredPage.getByText(created.name, { exact: true })).toBeVisible();
    await expect(
      restoredPage.getByText(restored.safetyBackupId, { exact: true }),
    ).toBeVisible();
    const reloadResponse = await restoredPage.reload({ waitUntil: 'domcontentloaded' });
    expect(reloadResponse?.status()).toBe(200);
    await expect(restoredPage.getByText(created.name, { exact: true })).toBeVisible();
    expect(restartFailures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
