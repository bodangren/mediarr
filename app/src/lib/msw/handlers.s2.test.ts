import { describe, expect, it } from 'vitest';
import { createHandlers } from './handlers';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RouteExpectation {
  method: Method;
  url: string;
  /** When true, also assert the handler produces a non-error response body. */
  expectEnvelope?: boolean;
}

async function findHandler(
  method: Method,
  url: string,
): Promise<{ handler: { test: (args: { request: Request }) => Promise<boolean> }; path: string } | undefined> {
  const handlers = createHandlers('deterministic');
  const request = new Request(url, { method });
  // MSW stores handler paths as relative strings (e.g. "/api/quality-profiles"). To match them
  // against a full Request URL we must pass a baseUrl in the resolutionContext; without
  // it, matchRequestUrl treats the relative path as a full URL and never matches.
  const resolutionContext = { baseUrl: new URL(url).origin };
  for (const handler of handlers) {
    const info = handler.info as { method: string; path: string };
    if (info.method !== method) continue;
    const matches = await handler.test({ request, resolutionContext });
    if (!matches) continue;
    if (!isSpecificMatch(info.path, new URL(url).pathname)) continue;
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
    if (!isSpecificMatch(info.path, new URL(url).pathname)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handler as any).run({ request, requestId: `red-${method}-${url}`, resolutionContext });
    if (result?.response) {
      return result.response as Response;
    }
  }
  throw new Error(`No matching handler for ${method} ${url}`);
}

/**
 * Returns true when `handlerPath` is the most specific pattern that subsumes `requestPath`.
 * Rejects looser matches like `/api/quality-profiles/:id` for `/api/quality-definitions`
 * (different segment count, would fail segment check) and like
 * `/api/settings/categories/:id` for `/api/settings/categories` (length mismatch).
 */
function isSpecificMatch(handlerPath: string, requestPath: string): boolean {
  if (handlerPath === requestPath) return true;
  const handlerSegments = handlerPath.split('/');
  const requestSegments = requestPath.split('/');
  if (handlerSegments.length !== requestSegments.length) return false;
  for (let i = 0; i < handlerSegments.length; i++) {
    const h = handlerSegments[i];
    const r = requestSegments[i];
    if (h === r) continue;
    if (h?.startsWith(':')) continue;
    return false;
  }
  return true;
}

const SETTINGS_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/settings', expectEnvelope: true },
  { method: 'PATCH', url: 'http://localhost/api/settings', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/settings/media', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/settings/media', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/settings/categories', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/settings/categories', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/settings/categories/1', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/settings/categories/1' },
  { method: 'GET', url: 'http://localhost/api/settings/proxies', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/settings/proxies', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/settings/proxies/1', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/settings/proxies/1' },
];

const QUALITY_PROFILE_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/quality-profiles', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/quality-profiles/1', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/quality-profiles', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/quality-profiles/1', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/quality-profiles/1' },
  { method: 'GET', url: 'http://localhost/api/quality-definitions', expectEnvelope: true },
];

const DOWNLOAD_CLIENT_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/download-client', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/download-client', expectEnvelope: true },
];

describe('Phase S2 — Settings & config MSW handler coverage', () => {
  describe('settings routes', () => {
    for (const { method, url } of SETTINGS_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S2 settings routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('quality profile routes', () => {
    for (const { method, url } of QUALITY_PROFILE_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S2 quality profile routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('download client routes', () => {
    for (const { method, url } of DOWNLOAD_CLIENT_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S2 download client routes)`,
        ).toBeDefined();
      });
    }
  });
});

describe('Phase S2 — response envelopes for newly-required handlers', () => {
  const ENVELOPE_CASES: Array<{ method: Method; url: string; body?: unknown; expectFields: string[] }> = [
    {
      method: 'GET',
      url: 'http://localhost/api/settings/media',
      expectFields: ['movieRootFolder', 'tvRootFolder'],
    },
    {
      method: 'PUT',
      url: 'http://localhost/api/settings/media',
      body: { movieRootFolder: '/media/movies', tvRootFolder: '/media/series' },
      expectFields: ['movieRootFolder', 'tvRootFolder'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/settings/categories',
      expectFields: [],
    },
    {
      method: 'POST',
      url: 'http://localhost/api/settings/categories',
      body: { name: 'Test Category', description: 'desc', minSize: 1024, maxSize: 99999 },
      expectFields: ['name'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/settings/proxies',
      expectFields: [],
    },
    {
      method: 'POST',
      url: 'http://localhost/api/settings/proxies',
      body: { name: 'Test Proxy', type: 'http', hostname: 'proxy.example', port: 8080 },
      expectFields: ['name', 'hostname'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/quality-profiles',
      expectFields: [],
    },
    {
      method: 'POST',
      url: 'http://localhost/api/quality-profiles',
      body: { name: 'HD-1080p', cutoff: 7, items: [] },
      expectFields: ['name'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/quality-definitions',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/download-client',
      expectFields: ['maxActiveDownloads', 'maxActiveSeeds'],
    },
    {
      method: 'PUT',
      url: 'http://localhost/api/download-client',
      body: { maxActiveDownloads: 3, maxActiveSeeds: 5, globalDownloadLimitKbps: null, globalUploadLimitKbps: null, incompleteDirectory: '/tmp/incomplete', completeDirectory: '/tmp/complete', seedRatioLimit: 1.5, seedTimeLimitMinutes: 60, seedLimitAction: 'pause' },
      expectFields: ['maxActiveDownloads', 'maxActiveSeeds'],
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
