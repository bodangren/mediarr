import { describe, expect, it } from 'vitest';
import {
  findHandler,
  isSpecificMatch,
  runHandler,
  type Method,
  type RouteExpectation,
} from './handlers.test-helpers';

const SYSTEM_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/system/status' },
  { method: 'GET', url: 'http://localhost/api/system/events' },
  { method: 'GET', url: 'http://localhost/api/system/events/export' },
  { method: 'DELETE', url: 'http://localhost/api/system/events/clear' },
  { method: 'GET', url: 'http://localhost/api/tasks/queued' },
  { method: 'GET', url: 'http://localhost/api/tasks/scheduled' },
  { method: 'GET', url: 'http://localhost/api/tasks/history' },
  { method: 'GET', url: 'http://localhost/api/tasks/history/1' },
  { method: 'POST', url: 'http://localhost/api/tasks/scheduled/rss-sync/run' },
  { method: 'DELETE', url: 'http://localhost/api/tasks/queued/1' },
];

const OPERATIONS_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/activity' },
  { method: 'DELETE', url: 'http://localhost/api/activity' },
  { method: 'GET', url: 'http://localhost/api/activity/export' },
  { method: 'GET', url: 'http://localhost/api/health' },
  { method: 'PATCH', url: 'http://localhost/api/activity/1/fail' },
  { method: 'POST', url: 'http://localhost/api/activity/1/retry-import' },
];

const STATS_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/system/stats' },
  { method: 'GET', url: 'http://localhost/api/stats/downloads' },
  { method: 'GET', url: 'http://localhost/api/stats/system' },
];

describe('Phase S3 — System & operations MSW handler coverage', () => {
  describe('system routes', () => {
    for (const { method, url } of SYSTEM_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S3 system routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('operations routes', () => {
    for (const { method, url } of OPERATIONS_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S3 operations routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('stats routes', () => {
    for (const { method, url } of STATS_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S3 stats routes)`,
        ).toBeDefined();
      });
    }
  });
});

describe('Phase S3 — response envelopes for newly-required handlers', () => {
  const ENVELOPE_CASES: Array<{ method: Method; url: string; body?: unknown; expectFields: string[] }> = [
    {
      method: 'GET',
      url: 'http://localhost/api/system/status',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/system/events',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/tasks/queued',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/tasks/scheduled',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/tasks/history',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/tasks/history/1',
      expectFields: ['id'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/system/stats',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/stats/downloads',
      expectFields: ['totalTorrents', 'activeDownloads'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/stats/system',
      expectFields: [],
    },
  ];

  for (const { method, url, body, expectFields } of ENVELOPE_CASES) {
    const label = `${method} ${new URL(url).pathname}`;
    it(`${label} returns a {ok, data} envelope with expected fields`, async () => {
      const found = await findHandler(method, url);
      expect(found, `missing handler for ${label}`).toBeDefined();
      const response = await runHandler(method, url, body);
      expect(response.status, `${label} should resolve with a real status`).toBeGreaterThanOrEqual(200);
      expect(response.status, `${label} should not be 5xx`).toBeLessThan(500);
      const payload = (await response.json()) as { ok?: boolean; data?: unknown };
      expect(payload.ok, `${label} envelope.ok must be true`).toBe(true);
      expect(payload.data, `${label} envelope.data must be present`).toBeDefined();
      for (const field of expectFields) {
        expect(
          (payload.data ?? {}) as Record<string, unknown>,
          `${label} envelope.data should expose "${field}"`,
        ).toHaveProperty(field);
      }
    });
  }
});

describe('Phase S3 — status codes for mutating operations', () => {
  // 202 Accepted is required by the plan for asynchronously-dispatched task runs and
  // activity retries (POST /api/tasks/scheduled/:taskId/run, POST /api/activity/:id/retry-import).
  const ACCEPTED_CASES: Array<{ method: Method; url: string; body?: unknown }> = [
    { method: 'POST', url: 'http://localhost/api/tasks/scheduled/rss-sync/run' },
    { method: 'POST', url: 'http://localhost/api/activity/1/retry-import' },
  ];

  for (const { method, url, body } of ACCEPTED_CASES) {
    const label = `${method} ${new URL(url).pathname}`;
    it(`${label} returns HTTP 202 Accepted`, async () => {
      const found = await findHandler(method, url);
      expect(found, `missing handler for ${label}`).toBeDefined();
      const response = await runHandler(method, url, body);
      expect(response.status, `${label} should return 202 Accepted per plan`).toBe(202);
    });
  }

  // 200 OK confirmations for synchronous mutations (per plan).
  const OK_CASES: Array<{ method: Method; url: string; body?: unknown }> = [
    { method: 'DELETE', url: 'http://localhost/api/system/events/clear' },
    { method: 'DELETE', url: 'http://localhost/api/tasks/queued/1' },
    { method: 'DELETE', url: 'http://localhost/api/activity' },
    { method: 'PATCH', url: 'http://localhost/api/activity/1/fail' },
  ];

  for (const { method, url, body } of OK_CASES) {
    const label = `${method} ${new URL(url).pathname}`;
    it(`${label} returns HTTP 200 OK`, async () => {
      const found = await findHandler(method, url);
      expect(found, `missing handler for ${label}`).toBeDefined();
      const response = await runHandler(method, url, body);
      expect(response.status, `${label} should return 200 OK per plan`).toBe(200);
    });
  }
});

describe('Phase S3 — export endpoints surface attachment metadata', () => {
  // Per test-strategy §3, /api/system/events/export and /api/activity/export are
  // "blob" endpoints in spirit — the server emits Content-Disposition: attachment
  // headers. The MSW handler must at minimum exist; ideally it should signal an
  // attachment via Content-Disposition so consumers exercising download flows
  // behave correctly. This Red test asserts the handler exists *and* sets a
  // Content-Disposition header. Both fail today because neither handler exists.
  const EXPORT_CASES: Array<{ method: Method; url: string }> = [
    { method: 'GET', url: 'http://localhost/api/system/events/export' },
    { method: 'GET', url: 'http://localhost/api/activity/export' },
  ];

  for (const { method, url } of EXPORT_CASES) {
    const label = `${method} ${new URL(url).pathname}`;
    it(`${label} sets a Content-Disposition: attachment header`, async () => {
      const found = await findHandler(method, url);
      expect(found, `missing handler for ${label}`).toBeDefined();
      const response = await runHandler(method, url);
      expect(response.status, `${label} should resolve with a real status`).toBeGreaterThanOrEqual(200);
      expect(response.status, `${label} should not be 5xx`).toBeLessThan(500);
      const contentDisposition = response.headers.get('content-disposition') ?? '';
      expect(
        contentDisposition.toLowerCase(),
        `${label} should set Content-Disposition: attachment (export downloads)`,
      ).toContain('attachment');
    });
  }
});
