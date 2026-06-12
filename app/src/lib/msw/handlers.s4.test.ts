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
  // MSW stores handler paths as relative strings (e.g. "/api/playback/:id"). To match
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
 * Unlike the lenient isSpecificMatch used in earlier phases, this rejects
 * handlers that use `:param` placeholders where `requestPath` has a literal
 * segment — e.g. `/api/playback/:id` is REJECTED for
 * `/api/playback/continue-watching`. This is required for Phase S4 because
 * we add both `/api/playback/:id` and `/api/playback/continue-watching`
 * dedicated handlers; the catch-all `:id` would otherwise subsume the
 * literal paths and hide missing implementations.
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

const SUBTITLE_WANTED_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/subtitles/wanted/movies', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/subtitles/wanted/series', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/subtitles/wanted/count', expectEnvelope: true },
  // Pre-existing from prior phases — included as a regression baseline.
  { method: 'POST', url: 'http://localhost/api/subtitles/search', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/subtitles/download', expectEnvelope: true },
];

const SUBTITLE_HISTORY_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/subtitles/history', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/subtitles/history/stats', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/subtitles/history' },
];

const SUBTITLE_PROVIDER_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/subtitles/providers', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/subtitles/providers/opensubtitles', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/subtitles/providers/opensubtitles', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/subtitles/providers/opensubtitles/test', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/subtitles/providers/opensubtitles/reset' },
];

const SUBTITLE_BLACKLIST_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/subtitles/blacklist/movies', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/subtitles/blacklist/series', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/subtitles/blacklist/1' },
  { method: 'DELETE', url: 'http://localhost/api/subtitles/blacklist/movies' },
  { method: 'DELETE', url: 'http://localhost/api/subtitles/blacklist/series' },
];

const PLAYBACK_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/playback/continue-watching', expectEnvelope: true },
  // `/api/playback/:id` is parameterized in the server route — use a literal id here.
  // The isMostSpecificMatch function ensures the catch-all handler is rejected
  // in favor of a dedicated handler at the same path.
  { method: 'GET', url: 'http://localhost/api/playback/1', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/playback/progress' },
  { method: 'GET', url: 'http://localhost/api/playback/subtitles/1' },
  { method: 'GET', url: 'http://localhost/api/stream/1' },
];

describe('Phase S4 — Subtitle & playback MSW handler coverage', () => {
  describe('subtitle wanted routes', () => {
    for (const { method, url } of SUBTITLE_WANTED_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S4 subtitle wanted routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('subtitle history routes', () => {
    for (const { method, url } of SUBTITLE_HISTORY_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S4 subtitle history routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('subtitle provider routes', () => {
    for (const { method, url } of SUBTITLE_PROVIDER_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S4 subtitle provider routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('subtitle blacklist routes', () => {
    for (const { method, url } of SUBTITLE_BLACKLIST_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S4 subtitle blacklist routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('playback routes', () => {
    for (const { method, url } of PLAYBACK_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S4 playback routes)`,
        ).toBeDefined();
      });
    }
  });
});

describe('Phase S4 — response envelopes for newly-required handlers', () => {
  // All envelope cases below exercise LIVE handler behavior via runHandler().
  // Per test-strategy §4, no artifact or markdown assertions are used; every
  // assertion is a real roundtrip through the createHandlers('deterministic')
  // + handler.run() path.
  const ENVELOPE_CASES: Array<{ method: Method; url: string; body?: unknown; expectFields: string[] }> = [
    {
      method: 'GET',
      url: 'http://localhost/api/subtitles/wanted/count',
      expectFields: ['seriesCount', 'moviesCount', 'totalCount'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/subtitles/history',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/subtitles/history/stats',
      expectFields: ['period', 'downloads', 'byProvider', 'byLanguage'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/subtitles/providers',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/subtitles/providers/opensubtitles',
      expectFields: ['id', 'name', 'enabled'],
    },
    {
      method: 'PUT',
      url: 'http://localhost/api/subtitles/providers/opensubtitles',
      body: { apiKey: 'test-key-12345' },
      expectFields: ['id', 'name', 'enabled'],
    },
    {
      method: 'POST',
      url: 'http://localhost/api/subtitles/providers/opensubtitles/test',
      expectFields: ['success', 'message'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/subtitles/blacklist/movies',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/subtitles/blacklist/series',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/playback/continue-watching',
      expectFields: [],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/playback/1',
      expectFields: ['id', 'mediaType', 'mediaId', 'sources'],
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

describe('Phase S4 — status codes for mutating operations', () => {
  // 200 OK confirmations for synchronous subtitle mutations (per plan).
  const OK_CASES: Array<{ method: Method; url: string; body?: unknown }> = [
    { method: 'DELETE', url: 'http://localhost/api/subtitles/history' },
    { method: 'POST', url: 'http://localhost/api/subtitles/providers/opensubtitles/reset' },
    { method: 'DELETE', url: 'http://localhost/api/subtitles/blacklist/1' },
    { method: 'DELETE', url: 'http://localhost/api/subtitles/blacklist/movies' },
    { method: 'DELETE', url: 'http://localhost/api/subtitles/blacklist/series' },
    { method: 'POST', url: 'http://localhost/api/playback/progress', body: { type: 'movie', mediaId: 1, position: 0, duration: 0 } },
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
