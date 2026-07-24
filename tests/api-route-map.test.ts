import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteOptions } from 'fastify';

const capturedRoutes = vi.hoisted(() => [] as Array<{ method: string; path: string }>);

vi.mock('fastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fastify')>();
  const wrapped = ((options?: Parameters<typeof actual.default>[0]) => {
    const app = actual.default(options);
    app.addHook('onRoute', (route: RouteOptions) => {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      for (const method of methods) {
        capturedRoutes.push({ method: String(method), path: route.url });
      }
    });
    return app;
  }) as typeof actual.default;
  Object.assign(wrapped, actual.default);
  return { ...actual, default: wrapped };
});

import { API_ROUTE_MAP, type ApiRouteDefinition } from '../server/src/api/routeMap';
import { createApiServer } from '../server/src/api/createApiServer';
import type { ApiDependencies } from '../server/src/api/types';

interface RouteLike {
  method: string;
  path: string;
}

// Registered only under NODE_ENV=test; never part of the production API contract.
const API_ROUTE_MAP_EXCLUSIONS: ApiRouteDefinition[] = [
  { method: 'POST', path: '/api/__test__/emit-event' },
];

function normalizeFastifyRoutePath(routePath: string): string {
  const withLeadingSlash = routePath.startsWith('/') ? routePath : `/${routePath}`;
  const withoutConstraints = withLeadingSlash.replace(/:([A-Za-z0-9_]+)\([^/]+\)/g, ':$1');
  const collapsed = withoutConstraints.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/$/, '') : collapsed;
}

function validateApiRouteMap(canonical: readonly RouteLike[], runtime: readonly RouteLike[]): void {
  const keys = (routes: readonly RouteLike[]) => routes.map(route => (
    `${route.method.toUpperCase()} ${normalizeFastifyRoutePath(route.path)}`
  ));
  const canonicalKeys = keys(canonical);
  const runtimeKeys = keys(runtime);
  const duplicates = [...new Set(canonicalKeys.filter((key, index) => canonicalKeys.indexOf(key) !== index))].sort();
  const runtimeDuplicates = [...new Set(runtimeKeys.filter((key, index) => runtimeKeys.indexOf(key) !== index))].sort();
  const canonicalSet = new Set(canonicalKeys);
  const runtimeSet = new Set(runtimeKeys);
  const missing = [...runtimeSet].filter(key => !canonicalSet.has(key)).sort();
  const stale = [...canonicalSet].filter(key => !runtimeSet.has(key)).sort();
  if (duplicates.length === 0 && runtimeDuplicates.length === 0 && missing.length === 0 && stale.length === 0) return;
  const sections = ['API route map mismatch:'];
  if (duplicates.length > 0) sections.push('Duplicate canonical entries:', ...duplicates.map(key => `  ${key}`));
  if (runtimeDuplicates.length > 0) sections.push('Duplicate runtime entries:', ...runtimeDuplicates.map(key => `  ${key}`));
  if (missing.length > 0) sections.push('Missing from API_ROUTE_MAP:', ...missing.map(key => `  ${key}`));
  if (stale.length > 0) sections.push('Stale in API_ROUTE_MAP:', ...stale.map(key => `  ${key}`));
  throw new Error(sections.join('\n'));
}

function createProductionDependencies(): ApiDependencies {
  return {
    prisma: {},
    scheduler: {
      setTaskExecutionsRepository: vi.fn(),
      listJobsMeta: vi.fn(() => []),
      runNow: vi.fn(),
      isScheduled: vi.fn(() => true),
      reschedule: vi.fn(),
      triggerTask: vi.fn(async () => true),
      toggleEnabled: vi.fn(async () => undefined),
    },
    settingsService: {
      get: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    taskExecutionsRepository: {
      create: vi.fn(),
      query: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 50 })),
    },
  } as unknown as ApiDependencies;
}

describe('API canonical route map', () => {
  const apps: Array<ReturnType<typeof createApiServer>> = [];

  beforeEach(() => {
    capturedRoutes.length = 0;
  });

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.length = 0;
  });

  it('normalizes Fastify constrained parameters and harmless slash differences', () => {
    expect(normalizeFastifyRoutePath('api/items/:id(^\\d+)/')).toBe('/api/items/:id');
    expect(normalizeFastifyRoutePath('/api//items///:itemId')).toBe('/api/items/:itemId');
    expect(normalizeFastifyRoutePath('/api/files/*')).toBe('/api/files/*');
  });

  it('reports duplicate, missing, and stale entries with actionable sorted diffs', () => {
    const canonical: ApiRouteDefinition[] = [
      { method: 'GET', path: '/api/stale' },
      { method: 'GET', path: '/api/stale/' },
    ];
    const runtime: ApiRouteDefinition[] = [
      { method: 'POST', path: '/api/missing' },
      { method: 'POST', path: '/api/missing/' },
    ];

    expect(() => validateApiRouteMap(canonical, runtime)).toThrowError(
      [
        'API route map mismatch:',
        'Duplicate canonical entries:',
        '  GET /api/stale',
        'Duplicate runtime entries:',
        '  POST /api/missing',
        'Missing from API_ROUTE_MAP:',
        '  POST /api/missing',
        'Stale in API_ROUTE_MAP:',
        '  GET /api/stale',
      ].join('\n'),
    );
  });

  it('matches every production Fastify method/path exactly in both directions', async () => {
    const app = createApiServer(
      createProductionDependencies(),
      {
        torrentStatsIntervalMs: 60_000,
        activityPollIntervalMs: 60_000,
        healthPollIntervalMs: 60_000,
      },
    );
    apps.push(app);

    await app.ready();

    const exclusions = new Set(
      API_ROUTE_MAP_EXCLUSIONS.map(route => `${route.method} ${normalizeFastifyRoutePath(route.path)}`),
    );
    // Fastify synthesizes HEAD companions for GET routes. API_ROUTE_MAP tracks
    // the explicitly registered production methods, so generated HEAD routes are normalized away.
    const productionRoutes = capturedRoutes.filter(route => (
      route.method !== 'HEAD'
      && !exclusions.has(`${route.method} ${normalizeFastifyRoutePath(route.path)}`)
    ));

    expect(() => validateApiRouteMap(API_ROUTE_MAP, productionRoutes)).not.toThrow();
    expect(API_ROUTE_MAP).toHaveLength(productionRoutes.length);
  });
});
