import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

export interface SetupStatusPayload {
  isConfigured: boolean;
  completedSteps: string[];
}

function hasRequiredRootFolders(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  const mediaManagement = (settings as { mediaManagement?: unknown }).mediaManagement;
  if (!mediaManagement || typeof mediaManagement !== 'object') {
    return false;
  }

  const movieRootFolder = (mediaManagement as { movieRootFolder?: unknown }).movieRootFolder;
  const tvRootFolder = (mediaManagement as { tvRootFolder?: unknown }).tvRootFolder;

  return typeof movieRootFolder === 'string'
    && movieRootFolder.trim().length > 0
    && typeof tvRootFolder === 'string'
    && tvRootFolder.trim().length > 0;
}

function isSetupMarkedComplete(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  const update = (settings as { update?: unknown }).update;
  if (!update || typeof update !== 'object') {
    return false;
  }

  return (update as { setupCompleted?: unknown }).setupCompleted === true;
}

async function resolveIndexerCount(deps: ApiDependencies): Promise<number> {
  if (deps.indexerRepository?.findAll) {
    const all = await deps.indexerRepository.findAll();
    return all.length;
  }

  const prismaLike = deps.prisma as {
    indexer?: {
      count?: () => Promise<number>;
      findMany?: () => Promise<unknown[]>;
    };
  };

  if (prismaLike?.indexer?.count) {
    return prismaLike.indexer.count();
  }

  if (prismaLike?.indexer?.findMany) {
    const rows = await prismaLike.indexer.findMany();
    return rows.length;
  }

  return 0;
}

export async function getSetupStatus(deps: ApiDependencies): Promise<SetupStatusPayload> {
  const settings = await deps.settingsService?.get?.();
  const rootFoldersConfigured = hasRequiredRootFolders(settings);
  const indexerCount = await resolveIndexerCount(deps);
  const indexersConfigured = indexerCount > 0;
  const setupCompleted = isSetupMarkedComplete(settings);

  const completedSteps: string[] = [];
  if (rootFoldersConfigured) {
    completedSteps.push('rootFolders');
  }
  if (indexersConfigured) {
    completedSteps.push('indexers');
  }
  if (setupCompleted) {
    completedSteps.push('complete');
  }

  return {
    isConfigured: setupCompleted || (rootFoldersConfigured && indexersConfigured),
    completedSteps,
  };
}

export function registerSetupRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  app.get('/api/setup/status', async (_request, reply) => {
    const status = await getSetupStatus(deps);
    return sendSuccess(reply, status);
  });

  app.post('/api/setup/complete', async (_request, reply) => {
    if (!deps.settingsService?.update) {
      throw new ValidationError('Settings service is not configured');
    }

    await deps.settingsService.update({
      update: {
        setupCompleted: true,
      } as import('../../repositories/AppSettingsRepository').UpdateSettings,
    });

    const status = await getSetupStatus(deps);
    return sendSuccess(reply, status);
  });
}
