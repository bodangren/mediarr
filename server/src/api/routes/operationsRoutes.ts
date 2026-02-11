import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { parsePaginationParams, sendPaginatedSuccess, sendSuccess } from '../contracts';
import { parseBoolean, parseDate } from '../routeUtils';
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

    const result = await deps.activityEventRepository.query({
      eventType: typeof query.eventType === 'string' ? query.eventType as any : undefined,
      sourceModule:
        typeof query.sourceModule === 'string' ? query.sourceModule : undefined,
      entityRef: typeof query.entityRef === 'string' ? query.entityRef : undefined,
      success:
        query.success === undefined ? undefined : parseBoolean(query.success),
      from: parseDate(query.from),
      to: parseDate(query.to),
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return sendPaginatedSuccess(reply, result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalCount: result.total,
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
