/**
 * Download Client API Routes
 *
 * Provides a single-instance settings API for the integrated downloader.
 * GET /api/download-client — returns current torrent limits settings.
 * PUT /api/download-client — saves torrent limits and applies speed limits.
 *
 * @module routes/downloadClients
 */
import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';
import type { TorrentLimitsSettings } from '../../repositories/AppSettingsRepository';

function validateTorrentLimitsBody(body: unknown): TorrentLimitsSettings {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }

  const b = body as Record<string, unknown>;

  if (typeof b.maxActiveDownloads !== 'number') {
    throw new ValidationError('maxActiveDownloads must be a number');
  }
  if (typeof b.maxActiveSeeds !== 'number') {
    throw new ValidationError('maxActiveSeeds must be a number');
  }
  if (b.globalDownloadLimitKbps !== null && typeof b.globalDownloadLimitKbps !== 'number') {
    throw new ValidationError('globalDownloadLimitKbps must be a number or null');
  }
  if (b.globalUploadLimitKbps !== null && typeof b.globalUploadLimitKbps !== 'number') {
    throw new ValidationError('globalUploadLimitKbps must be a number or null');
  }
  if (typeof b.incompleteDirectory !== 'string') {
    throw new ValidationError('incompleteDirectory must be a string');
  }
  if (!b.incompleteDirectory.trim()) {
    throw new ValidationError('incompleteDirectory must not be empty');
  }
  if (typeof b.completeDirectory !== 'string') {
    throw new ValidationError('completeDirectory must be a string');
  }
  if (!b.completeDirectory.trim()) {
    throw new ValidationError('completeDirectory must not be empty');
  }
  if (typeof b.seedRatioLimit !== 'number') {
    throw new ValidationError('seedRatioLimit must be a number');
  }
  if (typeof b.seedTimeLimitMinutes !== 'number') {
    throw new ValidationError('seedTimeLimitMinutes must be a number');
  }
  if (b.seedLimitAction !== 'pause' && b.seedLimitAction !== 'remove') {
    throw new ValidationError("seedLimitAction must be 'pause' or 'remove'");
  }

  return {
    maxActiveDownloads: b.maxActiveDownloads,
    maxActiveSeeds: b.maxActiveSeeds,
    globalDownloadLimitKbps: b.globalDownloadLimitKbps as number | null,
    globalUploadLimitKbps: b.globalUploadLimitKbps as number | null,
    incompleteDirectory: b.incompleteDirectory,
    completeDirectory: b.completeDirectory,
    seedRatioLimit: b.seedRatioLimit,
    seedTimeLimitMinutes: b.seedTimeLimitMinutes,
    seedLimitAction: b.seedLimitAction,
  };
}

export function registerDownloadClientRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  // GET /api/download-client — read current torrent limits settings
  app.get('/api/download-client', async (_request, reply) => {
    if (!deps.settingsService?.get) {
      throw new ValidationError('Settings service is not configured');
    }

    const settings = await deps.settingsService.get();
    return sendSuccess(reply, settings.torrentLimits);
  });

  // PUT /api/download-client — save torrent limits settings
  app.put('/api/download-client', {
    schema: {
      body: {
        type: 'object',
        required: [
          'maxActiveDownloads',
          'maxActiveSeeds',
          'incompleteDirectory',
          'completeDirectory',
          'seedRatioLimit',
          'seedTimeLimitMinutes',
          'seedLimitAction',
        ],
        properties: {
          maxActiveDownloads: { type: 'number' },
          maxActiveSeeds: { type: 'number' },
          globalDownloadLimitKbps: { type: ['number', 'null'] },
          globalUploadLimitKbps: { type: ['number', 'null'] },
          incompleteDirectory: { type: 'string' },
          completeDirectory: { type: 'string' },
          seedRatioLimit: { type: 'number' },
          seedTimeLimitMinutes: { type: 'number' },
          seedLimitAction: { type: 'string', enum: ['pause', 'remove'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.settingsService?.update) {
      throw new ValidationError('Settings service is not configured');
    }

    const torrentLimits = validateTorrentLimitsBody(request.body);

    const updated = await deps.settingsService.update({ torrentLimits });

    // Apply speed limits to torrent manager if available
    if (deps.torrentManager?.setSpeedLimits) {
      await deps.torrentManager.setSpeedLimits({
        download: torrentLimits.globalDownloadLimitKbps ?? undefined,
        upload: torrentLimits.globalUploadLimitKbps ?? undefined,
      });
    }
    if (deps.torrentManager?.setDownloadPaths) {
      deps.torrentManager.setDownloadPaths({
        incomplete: torrentLimits.incompleteDirectory,
        complete: torrentLimits.completeDirectory,
        seedRatioLimit: torrentLimits.seedRatioLimit,
        seedTimeLimitMinutes: torrentLimits.seedTimeLimitMinutes,
        seedLimitAction: torrentLimits.seedLimitAction,
        maxActiveDownloads: torrentLimits.maxActiveDownloads,
      });
    }

    return sendSuccess(reply, updated.torrentLimits);
  });
}
