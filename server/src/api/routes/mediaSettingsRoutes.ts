import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';
import type { MediaManagementSettings } from '../../repositories/AppSettingsRepository';
import { DEFAULT_MEDIA_MANAGEMENT_SETTINGS } from '../../repositories/AppSettingsRepository';

function validateMediaManagementBody(body: unknown): MediaManagementSettings {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  const b = body as Record<string, unknown>;

  if (typeof b.movieRootFolder !== 'string') {
    throw new ValidationError('movieRootFolder must be a string');
  }
  if (typeof b.tvRootFolder !== 'string') {
    throw new ValidationError('tvRootFolder must be a string');
  }

  return {
    movieRootFolder: b.movieRootFolder,
    tvRootFolder: b.tvRootFolder,
  };
}

export function registerMediaSettingsRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  app.get('/api/settings/media', async (_request, reply) => {
    if (!deps.settingsService?.get) {
      throw new ValidationError('Settings service is not configured');
    }

    const settings = await deps.settingsService.get();
    return sendSuccess(reply, settings.mediaManagement ?? DEFAULT_MEDIA_MANAGEMENT_SETTINGS);
  });

  app.put('/api/settings/media', async (request, reply) => {
    if (!deps.settingsService?.update) {
      throw new ValidationError('Settings service is not configured');
    }

    const mediaManagement = validateMediaManagementBody(request.body);
    const updated = await deps.settingsService.update({ mediaManagement });
    return sendSuccess(reply, updated.mediaManagement ?? DEFAULT_MEDIA_MANAGEMENT_SETTINGS);
  });
}
