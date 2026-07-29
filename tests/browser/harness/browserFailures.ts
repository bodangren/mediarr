import type { Page } from '@playwright/test';

export interface BrowserFailureSnapshot {
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
  responseFailures: string[];
}

/**
 * Captures failures produced by the shipped page instead of relying on a
 * successful document response as proof that the application rendered.
 */
export function captureBrowserFailures(page: Page, applicationOrigin: string) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const responseFailures: string[] = [];
  const origin = new URL(applicationOrigin).origin;

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.stack ?? error.message);
  });
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).origin !== origin) {
      return;
    }
    requestFailures.push(
      `${request.method()} ${request.url()}: ${
        request.failure()?.errorText ?? 'unknown failure'
      }`,
    );
  });
  page.on('response', (response) => {
    if (new URL(response.url()).origin !== origin || response.status() < 400) {
      return;
    }
    responseFailures.push(
      `${response.status()} ${response.request().method()} ${response.url()}`,
    );
  });

  return {
    snapshot(): BrowserFailureSnapshot {
      return {
        consoleErrors: [...consoleErrors],
        pageErrors: [...pageErrors],
        requestFailures: [...requestFailures],
        responseFailures: [...responseFailures],
      };
    },
  };
}
