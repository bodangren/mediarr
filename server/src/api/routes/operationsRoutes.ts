import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { parsePaginationParams, sendPaginatedSuccess, sendSuccess } from '../contracts';
import { parseBoolean, parseDate, parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

type Severity = 'critical' | 'warning' | 'ok';

const severityWeight: Record<Severity, number> = {
  critical: 3,
  warning: 2,
  ok: 1,
};

function computeSeverity(snapshot: {
  failureCount: number;
  lastErrorMessage?: string | null;
} | null): Severity {
  if (!snapshot) {
    return 'ok';
  }

  if (snapshot.failureCount >= 3) {
    return 'critical';
  }

  if (snapshot.failureCount > 0 || snapshot.lastErrorMessage) {
    return 'warning';
  }

  return 'ok';
}

function validateSettingsPatch(payload: unknown): void {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Settings payload must be an object');
  }

  const root = payload as Record<string, unknown>;

  if (root.torrentLimits && typeof root.torrentLimits === 'object') {
    const limits = root.torrentLimits as Record<string, unknown>;
    if (
      limits.maxActiveDownloads !== undefined &&
      (typeof limits.maxActiveDownloads !== 'number' || limits.maxActiveDownloads <= 0)
    ) {
      throw new ValidationError('torrentLimits.maxActiveDownloads must be a positive number');
    }
  }

  if (root.wantedLanguages !== undefined) {
    if (!Array.isArray(root.wantedLanguages)) {
      throw new ValidationError('wantedLanguages must be an array of language codes');
    }

    const invalid = root.wantedLanguages.some(
      item => typeof item !== 'string' || item.trim().length === 0,
    );
    if (invalid) {
      throw new ValidationError('wantedLanguages must only contain non-empty strings');
    }
  }

  if (root.streaming !== undefined) {
    if (!root.streaming || typeof root.streaming !== 'object' || Array.isArray(root.streaming)) {
      throw new ValidationError('streaming must be an object');
    }

    const streaming = root.streaming as Record<string, unknown>;

    if (
      streaming.discoveryEnabled !== undefined &&
      typeof streaming.discoveryEnabled !== 'boolean'
    ) {
      throw new ValidationError('streaming.discoveryEnabled must be a boolean');
    }

    if (streaming.discoveryServiceName !== undefined) {
      if (
        typeof streaming.discoveryServiceName !== 'string' ||
        streaming.discoveryServiceName.trim().length === 0
      ) {
        throw new ValidationError('streaming.discoveryServiceName must be a non-empty string');
      }
    }

    if (streaming.defaultUserId !== undefined) {
      if (
        typeof streaming.defaultUserId !== 'string' ||
        streaming.defaultUserId.trim().length === 0
      ) {
        throw new ValidationError('streaming.defaultUserId must be a non-empty string');
      }
    }

    if (streaming.watchedThreshold !== undefined) {
      if (
        typeof streaming.watchedThreshold !== 'number' ||
        !Number.isFinite(streaming.watchedThreshold) ||
        streaming.watchedThreshold <= 0 ||
        streaming.watchedThreshold > 1
      ) {
        throw new ValidationError('streaming.watchedThreshold must be a number between 0 and 1');
      }
    }

    if (
      streaming.subtitleDirectory !== undefined &&
      streaming.subtitleDirectory !== null &&
      typeof streaming.subtitleDirectory !== 'string'
    ) {
      throw new ValidationError('streaming.subtitleDirectory must be a string or null');
    }
  }
}

function parseActivityFilters(query: Record<string, unknown>) {
  return {
    eventType: typeof query.eventType === 'string' ? query.eventType as any : undefined,
    sourceModule:
      typeof query.sourceModule === 'string' ? query.sourceModule : undefined,
    entityRef: typeof query.entityRef === 'string' ? query.entityRef : undefined,
    success:
      query.success === undefined ? undefined : parseBoolean(query.success),
    from: parseDate(query.from),
    to: parseDate(query.to),
  };
}

export function registerOperationsRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/activity', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: ['number', 'string'] },
          pageSize: { type: ['number', 'string'] },
          eventType: { type: 'string' },
          sourceModule: { type: 'string' },
          entityRef: { type: 'string' },
          success: { type: ['boolean', 'string'] },
          from: { type: 'string' },
          to: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.activityEventRepository?.query) {
      throw new ValidationError('Activity event repository is not configured');
    }

    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);
    const filters = parseActivityFilters(query);

    const result = await deps.activityEventRepository.query({
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return sendPaginatedSuccess(reply, result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalCount: result.total,
    });
  });

  app.delete('/api/activity', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          eventType: { type: 'string' },
          sourceModule: { type: 'string' },
          entityRef: { type: 'string' },
          success: { type: ['boolean', 'string'] },
          from: { type: 'string' },
          to: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.activityEventRepository?.clear) {
      throw new ValidationError('Activity event repository is not configured');
    }

    const query = request.query as Record<string, unknown>;
    const filters = parseActivityFilters(query);
    const deletedCount = await deps.activityEventRepository.clear(filters);

    return sendSuccess(reply, { deletedCount });
  });

  app.patch('/api/activity/:id/fail', async (request, reply) => {
    if (!deps.activityEventRepository?.markAsFailed) {
      throw new ValidationError('Activity event repository is not configured');
    }

    const params = request.params as { id?: string };
    const id = parseIdParam(params.id ?? '', 'activity event');
    const updated = await deps.activityEventRepository.markAsFailed(id);

    if (!updated) {
      throw new ValidationError('Activity event not found');
    }

    return sendSuccess(reply, updated);
  });

  app.post('/api/activity/:id/retry-import', async (request, reply) => {
    if (!deps.importManager?.retryImportByActivityEventId) {
      throw new ValidationError('Import manager is not configured');
    }

    const params = request.params as { id?: string };
    const id = parseIdParam(params.id ?? '', 'activity event');
    await deps.importManager.retryImportByActivityEventId(id);

    return sendSuccess(reply, {
      id,
      retried: true,
    });
  });

  app.get('/api/activity/export', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          eventType: { type: 'string' },
          sourceModule: { type: 'string' },
          entityRef: { type: 'string' },
          success: { type: ['boolean', 'string'] },
          from: { type: 'string' },
          to: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.activityEventRepository?.export) {
      throw new ValidationError('Activity event repository is not configured');
    }

    const query = request.query as Record<string, unknown>;
    const filters = parseActivityFilters(query);
    const items = await deps.activityEventRepository.export(filters);

    return sendSuccess(reply, {
      items,
      totalCount: items.length,
      exportedAt: new Date().toISOString(),
    });
  });

  app.get('/api/health', async (_request, reply) => {
    if (!deps.indexerRepository?.findAll) {
      throw new ValidationError('Indexer repository is not configured');
    }

    const indexers = await deps.indexerRepository.findAll();

    const snapshots = await Promise.all(indexers.map(async indexer => {
      const snapshot = deps.indexerHealthRepository?.getByIndexerId
        ? await deps.indexerHealthRepository.getByIndexerId(indexer.id)
        : null;
      const severity = computeSeverity(snapshot as any);

      return {
        indexerId: indexer.id,
        indexerName: indexer.name,
        severity,
        snapshot,
      };
    }));

    snapshots.sort((left, right) => {
      return severityWeight[right.severity] - severityWeight[left.severity];
    });

    const overall = snapshots[0]?.severity ?? 'ok';

    return sendSuccess(reply, {
      status: overall,
      indexers: snapshots,
    });
  });

  app.get('/api/settings', async (_request, reply) => {
    if (!deps.settingsService?.get) {
      throw new ValidationError('Settings service is not configured');
    }

    return sendSuccess(reply, await deps.settingsService.get());
  });

  app.patch('/api/settings', {
    schema: {
      body: {
        type: 'object',
        properties: {
          torrentLimits: { type: 'object' },
          schedulerIntervals: { type: 'object' },
          pathVisibility: { type: 'object' },
          apiKeys: { type: 'object' },
          wantedLanguages: { type: 'array', items: { type: 'string' } },
          host: { type: 'object' },
          security: { type: 'object' },
          logging: { type: 'object' },
          update: { type: 'object' },
          streaming: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.settingsService?.update) {
      throw new ValidationError('Settings service is not configured');
    }

    const payload = (request.body ?? {}) as Record<string, unknown>;
    validateSettingsPatch(payload);

    const updated = await deps.settingsService.update(payload as any);
    return sendSuccess(reply, updated);
  });
}
