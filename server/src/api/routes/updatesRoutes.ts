import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '../../errors/domainErrors';
import {
  paginateArray,
  parsePaginationParams,
  sendPaginatedSuccess,
  sendSuccess,
} from '../contracts';
import type { ApiDependencies } from '../types';
import { UpdateService, type UpdateBranch } from '../../services/updates/UpdateService';

const sharedUpdateService = new UpdateService();

function normalizeBranch(input: unknown): UpdateBranch {
  if (input === 'develop') {
    return 'develop';
  }

  if (input === 'phantom') {
    return 'phantom';
  }

  if (input === 'stable') {
    return 'stable';
  }

  return 'master';
}

function toAvailablePayload(release: ReturnType<UpdateService['getLatestRelease']>) {
  if (!release) {
    return {
      available: false,
      version: undefined,
      releaseDate: undefined,
      changelog: undefined,
      downloadUrl: undefined,
      checksum: undefined,
      assetName: undefined,
    };
  }

  return {
    available: true,
    version: release.version,
    releaseDate: release.publishedAt,
    changelog: release.changelog,
    downloadUrl: release.downloadUrl,
    checksum: release.expectedChecksum ?? undefined,
    assetName: release.assetName,
  };
}

function getService(deps: ApiDependencies): UpdateService {
  return deps.updateService ?? sharedUpdateService;
}

export const updatesState = {
  get availableUpdate() {
    return toAvailablePayload(sharedUpdateService.getLatestRelease());
  },
  set availableUpdate(value: { available?: boolean } | null) {
    if (!value?.available) {
      sharedUpdateService.resetForTests();
    }
  },
  get updateHistory() {
    return sharedUpdateService.listHistory();
  },
  set updateHistory(_value: unknown[]) {
    sharedUpdateService.resetForTests();
  },
  get activeUpdates() {
    return new Map(sharedUpdateService.listProgress().map(item => [item.updateId, item]));
  },
  get currentVersion() {
    return sharedUpdateService.getCurrentVersionInfo();
  },
  reset() {
    sharedUpdateService.resetForTests();
  },
};

export function registerUpdatesRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  const updateService = getService(deps);

  app.get('/api/updates/current', async (_request, reply) => {
    return sendSuccess(reply, updateService.getCurrentVersionInfo());
  });

  app.get('/api/updates/available', async (_request, reply) => {
    return sendSuccess(reply, toAvailablePayload(updateService.getLatestRelease()));
  });

  app.get('/api/updates/history', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: ['number', 'string'] },
          pageSize: { type: ['number', 'string'] },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);
    const sorted = [...updateService.listHistory()].sort(
      (left, right) => new Date(right.installedDate).getTime() - new Date(left.installedDate).getTime(),
    );

    const { items, totalCount } = paginateArray(sorted, pagination.page, pagination.pageSize);

    return sendPaginatedSuccess(reply, items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount,
    });
  });

  app.get('/api/updates/check', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const requestedBranch = normalizeBranch(query.branch);
    const settings = await deps.settingsService?.get?.();
    const branch = settings?.update?.branch
      ? normalizeBranch(settings.update.branch)
      : requestedBranch;

    const result = await updateService.checkForUpdate({ branch });

    return sendSuccess(reply, {
      checked: true,
      timestamp: result.checkedAt,
      available: result.updateAvailable,
      ...result,
    });
  });

  app.post('/api/updates/check', async (request, reply) => {
    const body = request.body as Record<string, unknown> | undefined;
    const requestedBranch = normalizeBranch(body?.branch);
    const settings = await deps.settingsService?.get?.();
    const branch = settings?.update?.branch
      ? normalizeBranch(settings.update.branch)
      : requestedBranch;

    const result = await updateService.checkForUpdate({ branch });

    return sendSuccess(reply, {
      checked: true,
      timestamp: result.checkedAt,
      available: result.updateAvailable,
      ...result,
    });
  });

  app.post('/api/updates/download', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: true,
        properties: {
          version: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { version?: string } | undefined;
    const result = await updateService.downloadUpdate({ version: body?.version });

    return sendSuccess(reply, result, 202);
  });

  app.post('/api/updates/install', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: true,
        properties: {
          version: { type: 'string' },
          updateId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { version?: string; updateId?: string } | undefined;

    if (!body?.version && !body?.updateId) {
      throw new ValidationError('Either version or updateId is required');
    }

    const result = await updateService.installUpdate({
      version: body?.version,
      updateId: body?.updateId,
    });

    return sendSuccess(reply, result, 202);
  });

  app.get('/api/updates/progress/:updateId', async (request, reply) => {
    const params = request.params as { updateId?: string };

    if (!params.updateId) {
      throw new ValidationError('Update ID is required');
    }

    const progress = updateService.getProgress(params.updateId);
    if (!progress) {
      throw new NotFoundError(`Update with id '${params.updateId}' not found`);
    }

    return sendSuccess(reply, progress);
  });
}
