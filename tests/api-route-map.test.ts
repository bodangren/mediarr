import { afterEach, describe, expect, it } from 'vitest';
import { API_ROUTE_MAP } from '../server/src/api/routeMap';
import { createApiServer } from '../server/src/api/createApiServer';

describe('API canonical route map', () => {
  const apps: Array<ReturnType<typeof createApiServer>> = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.length = 0;
  });

  it('registers every required method/path pair', async () => {
    const app = createApiServer(
      {
        prisma: {},
      },
      {
        torrentStatsIntervalMs: 60_000,
        activityPollIntervalMs: 60_000,
        healthPollIntervalMs: 60_000,
      },
    );
    apps.push(app);

    await app.ready();

    for (const route of API_ROUTE_MAP) {
      const hasRoute = (app as any).hasRoute({
        method: route.method,
        url: route.path,
      });

      expect(hasRoute, `${route.method} ${route.path} should exist`).toBe(true);
    }
  });
});
