import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';
import type { MediaManagementSettings } from '../../repositories/AppSettingsRepository';
import { DEFAULT_MEDIA_MANAGEMENT_SETTINGS } from '../../repositories/AppSettingsRepository';

const STRING_FIELDS = [
  'movieRootFolder',
  'tvRootFolder',
  'adultRootFolder',
  'movieNamingPattern',
  'seriesNamingPattern',
] as const;

function readStringField(
  body: Record<string, unknown>,
  field: keyof MediaManagementSettings,
  current: MediaManagementSettings,
): string {
  const value = body[field];
  if (value === undefined) {
    // Partial updates are allowed: an absent field keeps its stored value instead of being
    // silently reset to the default (which is what the first cut did for every field).
    return current[field];
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
  return value;
}

function validateMediaManagementBody(
  body: unknown,
  current: MediaManagementSettings = DEFAULT_MEDIA_MANAGEMENT_SETTINGS,
): MediaManagementSettings {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  const b = body as Record<string, unknown>;
  for (const field of STRING_FIELDS) {
    if (b[field] !== undefined && typeof b[field] !== 'string') {
      throw new ValidationError(`${field} must be a string`);
    }
  }

  return {
    movieRootFolder: readStringField(b, 'movieRootFolder', current),
    tvRootFolder: readStringField(b, 'tvRootFolder', current),
    adultRootFolder: readStringField(b, 'adultRootFolder', current),
    movieNamingPattern: readStringField(b, 'movieNamingPattern', current),
    seriesNamingPattern: readStringField(b, 'seriesNamingPattern', current),
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

    const current = await deps.settingsService.get();
    const mediaManagement = validateMediaManagementBody(request.body, current.mediaManagement);
    const updated = await deps.settingsService.update({ mediaManagement });
    return sendSuccess(reply, updated.mediaManagement ?? DEFAULT_MEDIA_MANAGEMENT_SETTINGS);
  });
}
