import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import {
  captureBrowserFailures,
  type BrowserFailureSnapshot,
} from './harness/browserFailures.js';

const MAX_DCL_MS = 5_000;
const MAX_LOAD_MS = 5_000;
const MAX_SHORTCUT_INTERACTION_MS = 1_000;
const NAVIGATION_SAMPLE_COUNT = 3;

interface NavigationTimingSample {
  domContentLoaded: number;
  load: number;
}

function percentile95(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
}

test.describe('production browser experience quality', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('measures repeated Dashboard navigation in a real browser and has no automated accessibility violations', async ({
    browser,
    page,
  }, testInfo) => {
    const samples: NavigationTimingSample[] = [];
    const failureSnapshots: BrowserFailureSnapshot[] = [];
    const pages = [page];
    for (let index = 1; index < NAVIGATION_SAMPLE_COUNT; index += 1) {
      pages.push(await browser.newPage());
    }

    for (const samplePage of pages) {
      const failures = captureBrowserFailures(samplePage, server.origin);
      const response = await samplePage.goto(`${server.origin}/dashboard`, {
        waitUntil: 'load',
      });
      expect(response?.status()).toBe(200);
      await expect(samplePage.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      const timing = await samplePage.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd,
          load: navigation.loadEventEnd,
        };
      });
      samples.push(timing);
      failureSnapshots.push(failures.snapshot());
    }

    for (const samplePage of pages.slice(1)) {
      await samplePage.close();
    }

    const timing = {
      samples,
      p95: {
        domContentLoaded: percentile95(samples.map(sample => sample.domContentLoaded)),
        load: percentile95(samples.map(sample => sample.load)),
      },
    };
    await testInfo.attach('dashboard-navigation-timings.json', {
      body: JSON.stringify(timing),
      contentType: 'application/json',
    });

    expect(timing.p95.domContentLoaded).toBeGreaterThan(0);
    expect(timing.p95.domContentLoaded).toBeLessThanOrEqual(MAX_DCL_MS);
    expect(timing.p95.load).toBeGreaterThan(0);
    expect(timing.p95.load).toBeLessThanOrEqual(MAX_LOAD_MS);

    const accessibility = await new AxeBuilder({ page })
      .include('main')
      .analyze();
    await testInfo.attach('dashboard-axe.json', {
      body: JSON.stringify(accessibility),
      contentType: 'application/json',
    });
    expect(accessibility.violations).toEqual([]);
    for (const snapshot of failureSnapshots) {
      expect(snapshot).toEqual({
        consoleErrors: [],
        pageErrors: [],
        requestFailures: [],
        responseFailures: [],
      });
    }
  });

  test('supports keyboard access to global shortcut help and escape dismissal', async ({ page }, testInfo) => {
    const failures = captureBrowserFailures(page, server.origin);
    await page.goto(`${server.origin}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    const openStartedAt = await page.evaluate(() => performance.now());
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible();
    const openCompletedAt = await page.evaluate(() => performance.now());

    const closeStartedAt = await page.evaluate(() => performance.now());
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeHidden();
    const closeCompletedAt = await page.evaluate(() => performance.now());
    const interaction = {
      open: openCompletedAt - openStartedAt,
      close: closeCompletedAt - closeStartedAt,
    };
    await testInfo.attach('dashboard-shortcut-interaction-timing.json', {
      body: JSON.stringify(interaction),
      contentType: 'application/json',
    });
    expect(interaction.open).toBeLessThanOrEqual(MAX_SHORTCUT_INTERACTION_MS);
    expect(interaction.close).toBeLessThanOrEqual(MAX_SHORTCUT_INTERACTION_MS);
    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  });
});
