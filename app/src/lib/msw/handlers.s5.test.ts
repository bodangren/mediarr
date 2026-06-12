import { describe, expect, it } from 'vitest';
import { createHandlers } from './handlers';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RouteExpectation {
  method: Method;
  url: string;
  expectEnvelope?: boolean;
}

async function findHandler(
  method: Method,
  url: string,
): Promise<{ handler: { test: (args: { request: Request }) => Promise<boolean> }; path: string } | undefined> {
  const handlers = createHandlers('deterministic');
  const request = new Request(url, { method });
  // MSW stores handler paths as relative strings (e.g. "/api/backups/:id"). To match
  // them against a full Request URL we must pass a baseUrl in the resolutionContext;
  // without it, matchRequestUrl treats the relative path as a full URL and never matches.
  const resolutionContext = { baseUrl: new URL(url).origin };
  for (const handler of handlers) {
    const info = handler.info as { method: string; path: string };
    if (info.method !== method) continue;
    const matches = await handler.test({ request, resolutionContext });
    if (!matches) continue;
    if (!isMostSpecificMatch(info.path, new URL(url).pathname)) continue;
    return {
      handler: handler as unknown as { test: (args: { request: Request }) => Promise<boolean> },
      path: info.path,
    };
  }
  return undefined;
}

async function runHandler(method: Method, url: string, body?: unknown): Promise<Response> {
  const handlers = createHandlers('deterministic');
  const request = new Request(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const resolutionContext = { baseUrl: new URL(url).origin };
  for (const handler of handlers) {
    const info = handler.info as { method: string; path: string };
    if (info.method !== method) continue;
    const matches = await handler.test({ request, resolutionContext });
    if (!matches) continue;
    if (!isMostSpecificMatch(info.path, new URL(url).pathname)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handler as any).run({ request, requestId: `red-${method}-${url}`, resolutionContext });
    if (result?.response) {
      return result.response as Response;
    }
  }
  throw new Error(`No matching handler for ${method} ${url}`);
}

/**
 * Returns true only when `handlerPath` is at least as specific as `requestPath`.
 * Rejects handlers that use `:param` placeholders where `requestPath` has a
 * literal segment — e.g. `/api/backups/:id` is REJECTED for
 * `/api/backups/schedule`. Phase S5 has the largest collision surface
 * (backups/schedule, blocklist/clear, blocklist/remove, collections/:id/{search,sync},
 * custom-formats/schema, import-lists/{exclusions,providers}, logs/files/:filename/{download,clear})
 * and the strict check is required for the Red contract to actually gate the
 * new dedicated handlers. The Green phase will satisfy the strict check by
 * adding the literal dedicated handler alongside the `:id` catch-all.
 */
function isMostSpecificMatch(handlerPath: string, requestPath: string): boolean {
  if (handlerPath === requestPath) return true;
  const handlerSegments = handlerPath.split('/');
  const requestSegments = requestPath.split('/');
  if (handlerSegments.length !== requestSegments.length) return false;
  for (let i = 0; i < handlerSegments.length; i++) {
    const h = handlerSegments[i];
    const r = requestSegments[i];
    if (h === r) continue;
    // If the handler has a :param where the request has a literal segment,
    // the handler is LESS specific — reject.
    if (h?.startsWith(':')) {
      return false;
    }
    return false;
  }
  return true;
}

const BACKUP_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/backups', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/backups', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/backups/1' },
  { method: 'POST', url: 'http://localhost/api/backups/1/restore', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/backups/1/download', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/backups/schedule', expectEnvelope: true },
  { method: 'PATCH', url: 'http://localhost/api/backups/schedule', expectEnvelope: true },
];

const BLOCKLIST_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/blocklist', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/blocklist/1' },
  { method: 'DELETE', url: 'http://localhost/api/blocklist/clear' },
  { method: 'DELETE', url: 'http://localhost/api/blocklist/remove' },
];

const CALENDAR_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/calendar?start=2026-06-01&end=2026-06-30', expectEnvelope: true },
];

const COLLECTION_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/collections', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/collections/1', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/collections', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/collections/1', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/collections/1' },
  { method: 'POST', url: 'http://localhost/api/collections/1/search', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/collections/1/sync', expectEnvelope: true },
];

const CUSTOM_FORMAT_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/custom-formats', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/custom-formats/1', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/custom-formats/schema', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/custom-formats', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/custom-formats/1', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/custom-formats/1' },
  { method: 'POST', url: 'http://localhost/api/custom-formats/1/test', expectEnvelope: true },
];

const IMPORT_LIST_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/import-lists', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/import-lists/1', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/import-lists', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/import-lists/1', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/import-lists/1' },
  { method: 'POST', url: 'http://localhost/api/import-lists/1/sync', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/import-lists/exclusions', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/import-lists/exclusions', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/import-lists/exclusions/1' },
  { method: 'GET', url: 'http://localhost/api/import-lists/providers', expectEnvelope: true },
];

const LOG_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/logs/files', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/logs/files/mediarr.log', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/logs/files/mediarr.log/download' },
  { method: 'DELETE', url: 'http://localhost/api/logs/files/mediarr.log' },
  { method: 'POST', url: 'http://localhost/api/logs/files/mediarr.log/clear' },
];

const UPDATE_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/updates/available', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/updates/check', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/updates/current', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/updates/history', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/updates/check', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/updates/download', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/updates/install', expectEnvelope: true },
];

const DASHBOARD_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/dashboard/disk-space', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/dashboard/upcoming', expectEnvelope: true },
];

const MISC_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/notifications/push-status', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/setup/status', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/setup/complete' },
  { method: 'GET', url: 'http://localhost/api/filesystem', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/images/proxy' },
  { method: 'GET', url: 'http://localhost/api/search?q=matrix', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/media/library', expectEnvelope: true },
];

const WANTED_MEDIA_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/media/wanted', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/media/search', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/wanted' },
  { method: 'POST', url: 'http://localhost/api/wanted/search-all' },
  { method: 'POST', url: 'http://localhost/api/library/scan' },
];

const RELEASE_ROUTES: RouteExpectation[] = [
  { method: 'POST', url: 'http://localhost/api/releases/search', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/releases/grab', expectEnvelope: true },
];

const IMPORT_ROUTES: RouteExpectation[] = [
  { method: 'POST', url: 'http://localhost/api/import/scan', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/import/execute', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/import/search', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/import/backfill-posters' },
];

const TORRENT_ROUTES: RouteExpectation[] = [
  { method: 'POST', url: 'http://localhost/api/torrents', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/torrents/bulk', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/torrents/abc123/retry-import' },
  { method: 'PATCH', url: 'http://localhost/api/torrents/abc123/priority' },
];

describe('Phase S5 — Remaining domain MSW handler coverage', () => {
  describe('backup routes', () => {
    for (const { method, url } of BACKUP_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 backup routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('blocklist routes', () => {
    for (const { method, url } of BLOCKLIST_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 blocklist routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('calendar route', () => {
    for (const { method, url } of CALENDAR_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 calendar route)`,
        ).toBeDefined();
      });
    }
  });

  describe('collection routes', () => {
    for (const { method, url } of COLLECTION_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 collection routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('custom format routes', () => {
    for (const { method, url } of CUSTOM_FORMAT_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 custom format routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('import list routes', () => {
    for (const { method, url } of IMPORT_LIST_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 import list routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('log routes', () => {
    for (const { method, url } of LOG_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 log routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('update routes', () => {
    for (const { method, url } of UPDATE_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 update routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('dashboard routes', () => {
    for (const { method, url } of DASHBOARD_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 dashboard routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('misc setup/notification/filesystem/search routes', () => {
    for (const { method, url } of MISC_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 misc routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('wanted / media-search / library-scan routes', () => {
    for (const { method, url } of WANTED_MEDIA_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 wanted/media routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('release routes', () => {
    for (const { method, url } of RELEASE_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 release routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('import routes', () => {
    for (const { method, url } of IMPORT_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 import routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('torrent routes (S5 additions)', () => {
    for (const { method, url } of TORRENT_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S5 torrent routes)`,
        ).toBeDefined();
      });
    }
  });
});

describe('Phase S5 — response envelopes for newly-required handlers', () => {
  // All envelope cases below exercise LIVE handler behavior via runHandler().
  // Per test-strategy §4, no artifact or markdown assertions are used; every
  // assertion is a real roundtrip through the createHandlers('deterministic')
  // + handler.run() path.
  //
  // We assert the basic envelope shape (ok: true, data defined) and a small
  // set of key fields per route that the server-side schema is expected to
  // expose. We do not pin every field — handler maintainers can extend the
  // shape without breaking these tests, as long as the new shape stays
  // backwards-compatible.
  const ENVELOPE_CASES: Array<{
    method: Method;
    url: string;
    body?: unknown;
    expectFields: string[];
  }> = [
    {
      method: 'GET',
      url: 'http://localhost/api/backups',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/backups/schedule',
      expectFields: ['enabled', 'interval', 'retentionDays'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/calendar?start=2026-06-01&end=2026-06-30',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/collections',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/collections/1',
      expectFields: ['id', 'name'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/custom-formats',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/custom-formats/1',
      expectFields: ['id', 'name'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/import-lists',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/import-lists/1',
      expectFields: ['id', 'name'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/import-lists/exclusions',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/import-lists/providers',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/updates/current',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/updates/available',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/dashboard/disk-space',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/dashboard/upcoming',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/notifications/push-status',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/setup/status',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/filesystem',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/media/library',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/media/wanted',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/logs/files',
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

describe('Phase S5 — status codes for mutating operations', () => {
  // 200 OK confirmations for synchronous S5 mutations (per plan).
  const OK_CASES: Array<{ method: Method; url: string; body?: unknown }> = [
    { method: 'DELETE', url: 'http://localhost/api/backups/1' },
    { method: 'PATCH', url: 'http://localhost/api/backups/schedule', body: { enabled: true, interval: 'daily', retentionDays: 30 } },
    { method: 'POST', url: 'http://localhost/api/backups/1/restore' },
    { method: 'DELETE', url: 'http://localhost/api/blocklist/1' },
    { method: 'DELETE', url: 'http://localhost/api/blocklist/clear' },
    { method: 'DELETE', url: 'http://localhost/api/blocklist/remove' },
    { method: 'DELETE', url: 'http://localhost/api/collections/1' },
    { method: 'DELETE', url: 'http://localhost/api/custom-formats/1' },
    { method: 'DELETE', url: 'http://localhost/api/import-lists/1' },
    { method: 'DELETE', url: 'http://localhost/api/import-lists/exclusions/1' },
    { method: 'DELETE', url: 'http://localhost/api/logs/files/mediarr.log' },
    { method: 'POST', url: 'http://localhost/api/logs/files/mediarr.log/clear' },
    { method: 'POST', url: 'http://localhost/api/setup/complete' },
    { method: 'POST', url: 'http://localhost/api/import/backfill-posters' },
    { method: 'POST', url: 'http://localhost/api/torrents/abc123/retry-import' },
    { method: 'PATCH', url: 'http://localhost/api/torrents/abc123/priority', body: { priority: 'normal' } },
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

describe('Phase S5 — 202 Accepted for async-triggering operations', () => {
  // 202 Accepted for endpoints that schedule background work (per plan).
  const ACCEPTED_CASES: Array<{ method: Method; url: string; body?: unknown }> = [
    { method: 'POST', url: 'http://localhost/api/wanted/search-all' },
    { method: 'POST', url: 'http://localhost/api/library/scan' },
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
});

describe('Phase S5 — binary/blob endpoints expose Content-Disposition', () => {
  // Binary endpoints (per test-strategy §3 and S3 precedent at lines 392-399)
  // must set Content-Disposition: attachment. S3 added the precedent with
  // /api/system/events/export and /api/activity/export; S5 extends the same
  // pattern to backups download, logs file download, and images proxy.
  const BLOB_CASES: Array<{ method: Method; url: string; body?: unknown }> = [
    { method: 'POST', url: 'http://localhost/api/backups/1/download' },
    { method: 'GET', url: 'http://localhost/api/logs/files/mediarr.log/download' },
    { method: 'GET', url: 'http://localhost/api/images/proxy?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Foriginal%2Fabc.jpg' },
  ];

  for (const { method, url, body } of BLOB_CASES) {
    const label = `${method} ${new URL(url).pathname}`;
    it(`${label} sets Content-Disposition: attachment`, async () => {
      const found = await findHandler(method, url);
      expect(found, `missing handler for ${label}`).toBeDefined();
      const response = await runHandler(method, url, body);
      // Blob responses don't always parse as JSON — the assertion is on the header.
      const disposition = response.headers.get('content-disposition') ?? '';
      expect(
        disposition.toLowerCase(),
        `${label} should set Content-Disposition: attachment (got "${disposition}")`,
      ).toContain('attachment');
    });
  }
});
