import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const browserTestDir = path.dirname(fileURLToPath(import.meta.url));
const systemChrome = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((candidate) => existsSync(candidate));

export default defineConfig({
  testDir: browserTestDir,
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  outputDir: path.resolve(browserTestDir, '../../test-results/browser'),
  reporter: [['line']],
  use: {
    headless: true,
    ...(systemChrome
      ? { launchOptions: { executablePath: systemChrome } }
      : {}),
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
