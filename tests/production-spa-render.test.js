import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerStaticServing } from '../server/src/api/staticServing';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(REPO_ROOT, 'app', 'dist');
const BUILD_TIMEOUT_MS = 600_000;
const RENDER_TIMEOUT_MS = 30_000;
const SYSTEM_CHROME_PATHS = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

function getBrowserLaunchOptions() {
  if (existsSync(chromium.executablePath())) {
    return { headless: true };
  }

  const executablePath = SYSTEM_CHROME_PATHS.find((candidate) => existsSync(candidate));
  if (!executablePath) {
    throw new Error(
      'Production SPA render gate requires either the Playwright Chromium bundle ' +
        'or an installed Chrome/Chromium executable.',
    );
  }

  return { headless: true, executablePath };
}

function buildProductionSpa() {
  const result = spawnSync(
    'npm',
    ['run', 'build', '--workspace=app'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: BUILD_TIMEOUT_MS,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Production SPA build failed with exit ${result.status}.\n` +
        `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    );
  }
}

async function startProductionServer() {
  const app = Fastify({ logger: false });

  app.get('/api/setup/status', async () => ({
    ok: true,
    data: {
      isConfigured: true,
      completedSteps: [],
    },
  }));

  app.get('/api/events/stream', async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'content-type': 'text/event-stream',
    });
    reply.raw.write(': connected\n\n');
    request.raw.once('close', () => reply.raw.end());
  });

  // The render gate is about the shipped browser artifact and production
  // static-serving path. Other dashboard data is deliberately empty so the
  // shell can settle deterministically without a database fixture.
  app.all('/api/*', async () => ({ ok: true, data: [] }));
  registerStaticServing(app, DIST_DIR);

  const origin = await app.listen({ host: '127.0.0.1', port: 0 });
  return {
    origin,
    close: () => app.close(),
  };
}

describe('production SPA render gate', () => {
  it(
    'builds the shipped artifact and renders the configured app shell without browser errors',
    { timeout: BUILD_TIMEOUT_MS + RENDER_TIMEOUT_MS + 30_000 },
    async () => {
      buildProductionSpa();
      const productionServer = await startProductionServer();
      let browser;
      let page;
      const pageErrors = [];
      const consoleErrors = [];
      const requestFailures = [];
      const httpFailures = [];

      try {
        browser = await chromium.launch(getBrowserLaunchOptions());
        page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

        page.on('pageerror', (error) => {
          pageErrors.push(error.stack ?? error.message);
        });
        page.on('console', (message) => {
          if (message.type() === 'error') {
            consoleErrors.push(message.text());
          }
        });
        page.on('requestfailed', (request) => {
          requestFailures.push(
            `${request.method()} ${request.url()}: ` +
              `${request.failure()?.errorText ?? 'unknown failure'}`,
          );
        });
        page.on('response', (response) => {
          const responseUrl = new URL(response.url());
          if (response.status() >= 400 && !responseUrl.pathname.startsWith('/api/')) {
            httpFailures.push(`${response.status()} ${response.request().method()} ${response.url()}`);
          }
        });

        const response = await page.goto(productionServer.origin, {
          waitUntil: 'domcontentloaded',
          timeout: RENDER_TIMEOUT_MS,
        });
        expect(response?.status()).toBe(200);

        try {
          await page.waitForURL('**/dashboard', { timeout: RENDER_TIMEOUT_MS });
          await page
            .getByRole('navigation', { name: 'Sidebar Navigation' })
            .waitFor({ state: 'visible', timeout: RENDER_TIMEOUT_MS });
          await page
            .getByRole('heading', { name: 'Dashboard' })
            .waitFor({ state: 'visible', timeout: RENDER_TIMEOUT_MS });
        } catch (error) {
          const rootMarkup = await page.locator('#root').innerHTML().catch(() => '<missing #root>');
          throw new Error(
            `Production SPA did not reach the configured Dashboard shell.\n` +
              `root=${rootMarkup}\npageErrors=${pageErrors.join('\n') || '<none>'}`,
            { cause: error },
          );
        }

        const rootText = await page.locator('#root').textContent();
        expect(rootText).not.toContain('Checking setup status...');
        expect(
          await page.getByText('MEDIARR', { exact: true }).first().isVisible(),
        ).toBe(true);
        expect(pageErrors).toEqual([]);
        expect(consoleErrors).toEqual([]);
        expect(requestFailures).toEqual([]);
        expect(httpFailures).toEqual([]);
      } finally {
        await page?.close();
        await browser?.close();
        await productionServer.close();
      }
    },
  );
});
