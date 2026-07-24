import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseClient } from '../../db/drizzleClient';
import { QualityProfileRepository } from '../../repositories/QualityProfileRepository';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerQualityProfileRoutes } from './qualityProfileRoutes';

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'drizzle');

const allowedItems = [
  {
    quality: { id: 5 },
    allowed: true,
  },
  {
    quality: { id: 9 },
    allowed: false,
  },
];

function applyMigrations(client: DatabaseClient): void {
  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter(file => file.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) {
        client.sqlite.exec(statement);
      }
    }
  }
}

function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
}

describe('quality profile registered handlers', () => {
  let app: FastifyInstance;
  let client: DatabaseClient;
  let repository: QualityProfileRepository;

  beforeEach(() => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client);
    repository = new QualityProfileRepository(client);
    app = Fastify();
    registerErrorHandler(app);
    registerQualityProfileRoutes(app, {
      prisma: client,
      qualityProfileRepository: repository,
    });
  });

  afterEach(async () => {
    await app.close();
    await client.$disconnect();
  });

  it('serves all definitions through the success envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/quality-definitions',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 5,
          name: 'HDTV-720p',
          source: 'television',
          resolution: 720,
        }),
      ]),
    });
    expect(response.json().data).toHaveLength(19);
  });

  it('persists create, list, get, update, and delete through installed SQLite', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/quality-profiles',
      payload: {
        name: ' Household HD ',
        cutoff: 5,
        items: allowedItems,
        languageProfileId: 3,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toEqual({
      ok: true,
      data: {
        id: expect.any(Number),
        name: 'Household HD',
        cutoff: 5,
        items: [
          {
            quality: {
              id: 5,
              name: 'HDTV-720p',
              source: 'television',
              resolution: 720,
            },
            allowed: true,
          },
          {
            quality: {
              id: 9,
              name: 'HDTV-1080p',
              source: 'television',
              resolution: 1080,
            },
            allowed: false,
          },
        ],
        languageProfileId: 3,
      },
    });
    const profileId = createResponse.json().data.id as number;

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/quality-profiles',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      ok: true,
      data: [expect.objectContaining({ id: profileId, name: 'Household HD' })],
    });

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/quality-profiles/${profileId}`,
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: profileId,
        name: 'Household HD',
        cutoff: 5,
      }),
    });

    const updateResponse = await app.inject({
      method: 'PUT',
      url: `/api/quality-profiles/${profileId}`,
      payload: {
        name: 'Household 1080p',
        cutoff: 9,
        items: [
          {
            quality: { id: 9 },
            allowed: true,
          },
        ],
        languageProfileId: null,
      },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: profileId,
        name: 'Household 1080p',
        cutoff: 9,
        languageProfileId: null,
      }),
    });

    const persisted = client.sqlite
      .prepare('SELECT "name", "cutoff", "languageProfileId" FROM "QualityProfile" WHERE "id" = ?')
      .get(profileId);
    expect(persisted).toEqual({
      name: 'Household 1080p',
      cutoff: 9,
      languageProfileId: null,
    });

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/quality-profiles/${profileId}`,
    });
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.json()).toEqual({
      ok: true,
      data: expect.objectContaining({ id: profileId, name: 'Household 1080p' }),
    });

    const missingResponse = await app.inject({
      method: 'GET',
      url: `/api/quality-profiles/${profileId}`,
    });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: `Quality profile ${profileId} not found`,
        retryable: false,
        path: `/api/quality-profiles/${profileId}`,
      },
    });
  });

  it('normalizes names before enforcing duplicate conflicts', async () => {
    await repository.create({
      name: 'Existing',
      cutoff: 5,
      items: [{
        quality: {
          id: 5,
          name: 'HDTV-720p',
          source: 'television',
          resolution: 720,
        },
        allowed: true,
      }],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/quality-profiles',
      payload: {
        name: ' Existing ',
        cutoff: 5,
        items: allowedItems,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Quality profile with name "Existing" already exists',
        retryable: false,
        path: '/api/quality-profiles',
      },
    });
  });

  it('returns exact validation and not-found errors without repository mutation', async () => {
    const createSpy = vi.spyOn(repository, 'create');
    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/quality-profiles',
      payload: {
        name: 'Invalid quality',
        cutoff: 999,
        items: [{ quality: { id: 999 }, allowed: true }],
      },
    });

    expect(invalidResponse.statusCode).toBe(422);
    expect(invalidResponse.json()).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'invalid quality id: 999',
        retryable: false,
        path: '/api/quality-profiles',
      },
    });
    expect(createSpy).not.toHaveBeenCalled();

    const invalidIdResponse = await app.inject({
      method: 'GET',
      url: '/api/quality-profiles/not-a-number',
    });
    expect(invalidIdResponse.statusCode).toBe(422);
    expect(invalidIdResponse.json()).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid quality profile id',
        retryable: false,
        path: '/api/quality-profiles/not-a-number',
      },
    });

    const updateMissingResponse = await app.inject({
      method: 'PUT',
      url: '/api/quality-profiles/404',
      payload: { name: 'Missing' },
    });
    expect(updateMissingResponse.statusCode).toBe(404);
    expect(updateMissingResponse.json().error).toEqual({
      code: 'NOT_FOUND',
      message: 'Quality profile 404 not found',
      retryable: false,
      path: '/api/quality-profiles/404',
    });
  });

  it('rejects deletion while a profile is referenced by media', async () => {
    const profile = await repository.create({
      name: 'In use',
      cutoff: 5,
      items: [{
        quality: {
          id: 5,
          name: 'HDTV-720p',
          source: 'television',
          resolution: 720,
        },
        allowed: true,
      }],
    });
    client.sqlite.prepare(`
      INSERT INTO "Media" (
        "mediaType", "title", "cleanTitle", "sortTitle", "status",
        "qualityProfileId", "year"
      ) VALUES ('MOVIE', 'Referenced', 'referenced', 'referenced', 'released', ?, 2026)
    `).run(profile.id);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/quality-profiles/${profile.id}`,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Cannot delete quality profile "In use" because it is in use by media items',
        details: {
          profileId: profile.id,
          profileName: 'In use',
        },
        retryable: false,
        path: `/api/quality-profiles/${profile.id}`,
      },
    });
    expect(await repository.findById(profile.id)).not.toBeNull();
  });

  it('rejects profiles with no allowed quality or a disallowed cutoff', async () => {
    const noAllowedResponse = await app.inject({
      method: 'POST',
      url: '/api/quality-profiles',
      payload: {
        name: 'Nothing allowed',
        cutoff: 5,
        items: [{
          quality: { id: 5 },
          allowed: false,
        }],
      },
    });
    expect(noAllowedResponse.statusCode).toBe(422);
    expect(noAllowedResponse.json()).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'at least one quality must be allowed',
        retryable: false,
        path: '/api/quality-profiles',
      },
    });

    const invalidCutoffResponse = await app.inject({
      method: 'POST',
      url: '/api/quality-profiles',
      payload: {
        name: 'Wrong cutoff',
        cutoff: 9,
        items: allowedItems,
      },
    });
    expect(invalidCutoffResponse.statusCode).toBe(422);
    expect(invalidCutoffResponse.json()).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'cutoff must be one of the allowed qualities',
        details: {
          cutoff: 9,
          allowedQualityIds: [5],
        },
        retryable: false,
        path: '/api/quality-profiles',
      },
    });
  });

  it('requires a replacement cutoff when updated items invalidate the stored cutoff', async () => {
    const profile = await repository.create({
      name: 'Changing qualities',
      cutoff: 5,
      items: [{
        quality: {
          id: 5,
          name: 'HDTV-720p',
          source: 'television',
          resolution: 720,
        },
        allowed: true,
      }],
    });

    const response = await app.inject({
      method: 'PUT',
      url: `/api/quality-profiles/${profile.id}`,
      payload: {
        items: [{
          quality: { id: 9 },
          allowed: true,
        }],
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'cutoff is no longer valid after items update; please provide a new cutoff',
        details: { currentCutoff: 5 },
        retryable: false,
        path: `/api/quality-profiles/${profile.id}`,
      },
    });
    expect((await repository.findById(profile.id))?.items[0]?.quality.id).toBe(5);
  });

  it('returns exact missing and unconfigured repository errors', async () => {
    const deleteMissingResponse = await app.inject({
      method: 'DELETE',
      url: '/api/quality-profiles/404',
    });
    expect(deleteMissingResponse.statusCode).toBe(404);
    expect(deleteMissingResponse.json()).toEqual({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Quality profile 404 not found',
        retryable: false,
        path: '/api/quality-profiles/404',
      },
    });

    const unconfiguredApp = Fastify();
    registerErrorHandler(unconfiguredApp);
    registerQualityProfileRoutes(unconfiguredApp, { prisma: {} });

    const unconfiguredResponse = await unconfiguredApp.inject({
      method: 'GET',
      url: '/api/quality-profiles',
    });
    expect(unconfiguredResponse.statusCode).toBe(422);
    expect(unconfiguredResponse.json()).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Quality profile repository is not configured',
        retryable: false,
        path: '/api/quality-profiles',
      },
    });
    await unconfiguredApp.close();
  });

  it('propagates repository failures through the API error contract', async () => {
    const failingApp = Fastify();
    registerErrorHandler(failingApp);
    registerQualityProfileRoutes(failingApp, {
      prisma: {},
      qualityProfileRepository: {
        findAll: vi.fn().mockRejectedValue(new Error('database unavailable')),
      } as unknown as ApiDependencies['qualityProfileRepository'],
    });

    const response = await failingApp.inject({
      method: 'GET',
      url: '/api/quality-profiles',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'database unavailable',
        retryable: false,
        path: '/api/quality-profiles',
      },
    });
    await failingApp.close();
  });
});
