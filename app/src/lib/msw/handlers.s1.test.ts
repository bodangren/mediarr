import { describe, expect, it } from 'vitest';
import {
  findHandler,
  isSpecificMatch,
  runHandler,
  type Method,
  type RouteExpectation,
} from './handlers.test-helpers';

const MOVIE_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/movies' },
  { method: 'GET', url: 'http://localhost/api/movies/1' },
  { method: 'POST', url: 'http://localhost/api/movies', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/movies/1', expectEnvelope: true },
  { method: 'DELETE', url: 'http://localhost/api/movies/1' },
  { method: 'PATCH', url: 'http://localhost/api/movies/1/monitored', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/movies/missing' },
  { method: 'GET', url: 'http://localhost/api/movies/root-folders', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/movies/import/scan', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/movies/import/apply', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/movies/bulk', expectEnvelope: true },
];

const SERIES_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/series' },
  { method: 'GET', url: 'http://localhost/api/series/1' },
  { method: 'DELETE', url: 'http://localhost/api/series/1' },
  { method: 'PATCH', url: 'http://localhost/api/series/1/monitored', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/series/root-folders', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/episodes/missing' },
  { method: 'POST', url: 'http://localhost/api/series/import/scan', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/series/import/apply', expectEnvelope: true },
  { method: 'PUT', url: 'http://localhost/api/series/bulk', expectEnvelope: true },
];

const INDEXER_ROUTES: RouteExpectation[] = [
  { method: 'GET', url: 'http://localhost/api/indexers/catalog', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/indexers/detect', expectEnvelope: true },
  { method: 'GET', url: 'http://localhost/api/indexers/schema/TorznabSettings', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/indexers/test' },
  { method: 'POST', url: 'http://localhost/api/indexers/1/test' },
  { method: 'POST', url: 'http://localhost/api/indexers/1/clone', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/indexers/catalog/cardigann-1337/add', expectEnvelope: true },
  { method: 'POST', url: 'http://localhost/api/indexers/catalog/reload' },
  { method: 'POST', url: 'http://localhost/api/indexers/import-from/prowlarr', expectEnvelope: true },
];

describe('Phase S1 — Core domain MSW handler coverage', () => {
  describe('movie routes', () => {
    for (const { method, url } of MOVIE_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S1 movie routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('series routes', () => {
    for (const { method, url } of SERIES_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S1 series routes)`,
        ).toBeDefined();
      });
    }
  });

  describe('indexer routes', () => {
    for (const { method, url } of INDEXER_ROUTES) {
      const label = `${method} ${new URL(url).pathname}`;
      it(`has a matching handler for ${label}`, async () => {
        const found = await findHandler(method, url);
        expect(
          found,
          `expected handlers.ts to define a handler for ${label} (Phase S1 indexer routes)`,
        ).toBeDefined();
      });
    }
  });
});

describe('Phase S1 — response envelopes for newly-required handlers', () => {
  const ENVELOPE_CASES: Array<{ method: Method; url: string; body?: unknown; expectFields: string[] }> = [
    {
      method: 'POST',
      url: 'http://localhost/api/movies',
      body: { title: 'Inception', year: 2010, tmdbId: 27205, monitored: true, qualityProfileId: 1 },
      expectFields: ['id', 'title', 'year'],
    },
    {
      method: 'PUT',
      url: 'http://localhost/api/movies/1',
      body: { monitored: false },
      expectFields: ['id', 'monitored'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/movies/root-folders',
      expectFields: ['rootFolders'],
    },
    {
      method: 'GET',
      url: 'http://localhost/api/series/root-folders',
      expectFields: ['rootFolders'],
    },
    {
      method: 'POST',
      url: 'http://localhost/api/indexers/1/clone',
      expectFields: ['id', 'name'],
    },
    {
      method: 'POST',
      url: 'http://localhost/api/indexers/catalog/reload',
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
