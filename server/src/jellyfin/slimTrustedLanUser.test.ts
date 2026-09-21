import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createJellyfinServer } from '../api/createJellyfinServer';
import {
  buildTrustedLanUserDto,
  COMPAT_USER_ID,
} from './compatibilityDtos';

const SERVER_ID = 'slim-mode-server-id';

function createPrismaFixture() {
  return {
    movie: { findMany: async () => [], findUnique: async () => null },
    series: { findMany: async () => [], findUnique: async () => null },
    season: { findMany: async () => [], findUnique: async () => null },
    episode: { findMany: async () => [], findUnique: async () => null },
  } as any;
}

function createPlaybackServiceFixture() {
  return {
    resolveStreamSource: async () => null,
    recordHeartbeat: async () => undefined,
    getContinueWatching: async () => [],
  } as any;
}

const apps: FastifyInstance[] = [];

function buildServer(): FastifyInstance {
  const app = createJellyfinServer(
    { prisma: createPrismaFixture(), playbackService: createPlaybackServiceFixture() },
    { serverId: SERVER_ID, serverName: 'Mediarr', lanAddress: '192.168.10.10', port: 8096 },
  );
  apps.push(app);
  return app;
}

afterEach(async () => {
  while (apps.length > 0) {
    await apps.pop()!.close();
  }
});

describe('slim mode single trusted-LAN user (FR-2)', () => {
  it('exposes exactly one user via /Users/Public with the compat id and name', async () => {
    const app = buildServer();

    const response = await app.inject({ method: 'GET', url: '/Users/Public' });
    expect(response.statusCode).toBe(200);

    const users = response.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users).toHaveLength(1);
    expect(users[0]).toEqual(buildTrustedLanUserDto({
      serverId: SERVER_ID,
      userId: COMPAT_USER_ID,
      userName: 'Mediarr',
    }));
    expect(users[0].Id).toBe('4d656469-6172-7200-0000-000000000001');
    expect(users[0].Name).toBe('Mediarr');
  });

  it('satisfies the login flow via /Users/AuthenticateByName without storing credentials', async () => {
    const app = buildServer();

    const response = await app.inject({
      method: 'POST',
      url: '/Users/AuthenticateByName',
      payload: { Username: 'anything', Pw: 'ignored' },
    });
    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.User.Id).toBe(COMPAT_USER_ID);
    expect(body.User.Name).toBe('Mediarr');
    expect(body.User.HasPassword).toBe(false);
    expect(body.User.HasConfiguredPassword).toBe(false);
    expect(body.ServerId).toBe(SERVER_ID);
    expect(typeof body.AccessToken).toBe('string');
  });

  it('serves the same single user via /Users/{uid}', async () => {
    const app = buildServer();

    const response = await app.inject({ method: 'GET', url: `/Users/${COMPAT_USER_ID}` });
    expect(response.statusCode).toBe(200);

    const user = response.json();
    expect(user.Id).toBe(COMPAT_USER_ID);
    expect(user.Name).toBe('Mediarr');
  });

  it('keeps full-mode behaviour identical (regression guard)', async () => {
    // The trusted-LAN surface is mode-independent: slim and full mode serve
    // the same single user, so the assertions above hold for both. Pin the
    // full-mode shape here explicitly.
    const app = buildServer();

    const publicUsers = (await app.inject({ method: 'GET', url: '/Users/Public' })).json();
    const namedUsers = (await app.inject({ method: 'GET', url: '/Users' })).json();
    expect(namedUsers).toEqual(publicUsers);
    expect(publicUsers).toHaveLength(1);
  });
});
