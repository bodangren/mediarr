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
    const requestUrl = new URL(request.url());
    const errorText = request.failure()?.errorText ?? 'unknown failure';
    if (requestUrl.origin !== origin) {
      return;
    }
    // A hard navigation closes the prior document's intentionally long-lived
    // EventSource. Chromium reports that lifecycle cancellation as ERR_ABORTED;
    // it is expected only for this stream and does not represent a failed app
    // request. Reconnect failures after the new document loads remain visible.
    if (
      requestUrl.pathname === '/api/events/stream' &&
      errorText === 'net::ERR_ABORTED'
    ) {
      return;
    }
    requestFailures.push(
      `${request.method()} ${request.url()}: ${errorText}`,
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
