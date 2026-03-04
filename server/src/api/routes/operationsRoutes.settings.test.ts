import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerOperationsRoutes } from './operationsRoutes';
import type { ApiDependencies } from '../types';

function createSettingsServiceMock() {
  return {
    get: vi.fn().mockResolvedValue({ wantedLanguages: [] }),
    update: vi.fn().mockResolvedValue({ wantedLanguages: ['en', 'th'] }),
  };
}

function createApp(settingsService = createSettingsServiceMock()) {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    settingsService,
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerOperationsRoutes(app, deps);
  return { app, settingsService };
}

describe('operationsRoutes settings wantedLanguages', () => {
  it('accepts wantedLanguages patch and forwards to settingsService.update', async () => {
    const { app, settingsService } = createApp();

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      payload: {
        wantedLanguages: ['EN', 'th'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(settingsService.update).toHaveBeenCalledWith({ wantedLanguages: ['EN', 'th'] });
  });

  it('rejects invalid wantedLanguages payload', async () => {
    const { app } = createApp();

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      payload: {
        wantedLanguages: [''],
      },
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });
});
