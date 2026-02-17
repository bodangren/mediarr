import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

export function registerImportListRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  // GET /api/import-lists - List all import lists
  app.get('/api/import-lists', async (_request, reply) => {
    if (!deps.importListRepository?.findAll) {
      throw new ValidationError('Import list repository is not configured');
    }

    const lists = await deps.importListRepository.findAll();
    return sendSuccess(reply, lists);
  });

  // GET /api/import-lists/:id - Get a single import list
  app.get('/api/import-lists/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.importListRepository?.findById) {
      throw new ValidationError('Import list repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'import list');
    const list = await deps.importListRepository.findById(id);

    if (!list) {
      throw new NotFoundError(`Import list ${id} not found`);
    }

    return sendSuccess(reply, list);
  });

  // POST /api/import-lists - Create a new import list
  app.post('/api/import-lists', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'providerType', 'config', 'rootFolderPath', 'qualityProfileId', 'monitorType'],
        properties: {
          name: { type: 'string' },
          providerType: { type: 'string' },
          config: { type: 'object' },
          rootFolderPath: { type: 'string' },
          qualityProfileId: { type: 'number' },
          languageProfileId: { type: 'number' },
          monitorType: { type: 'string' },
          enabled: { type: 'boolean' },
          syncInterval: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.importListRepository?.create) {
      throw new ValidationError('Import list repository is not configured');
    }

    if (!deps.importListProviderRegistry) {
      throw new ValidationError('Import list provider registry is not configured');
    }

    const payload = request.body as Record<string, unknown>;
    const providerType = payload.providerType as string;
    const config = payload.config as Record<string, unknown>;

    // Validate provider type and config
    const provider = deps.importListProviderRegistry.getProvider(providerType);
    if (!provider) {
      throw new ValidationError(`Unknown provider type: ${providerType}`);
    }

    if (!provider.validateConfig(config)) {
      throw new ValidationError(`Invalid configuration for provider ${providerType}`);
    }

    const created = await deps.importListRepository.create({
      name: payload.name as string,
      providerType,
      config,
      rootFolderPath: payload.rootFolderPath as string,
      qualityProfileId: payload.qualityProfileId as number,
      languageProfileId: payload.languageProfileId as number | undefined,
      monitorType: payload.monitorType as string,
      enabled: payload.enabled as boolean | undefined,
      syncInterval: payload.syncInterval as number | undefined,
    });

    return sendSuccess(reply, created, 201);
  });

  // PUT /api/import-lists/:id - Update an import list
  app.put('/api/import-lists/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          providerType: { type: 'string' },
          config: { type: 'object' },
          rootFolderPath: { type: 'string' },
          qualityProfileId: { type: 'number' },
          languageProfileId: { type: 'number' },
          monitorType: { type: 'string' },
          enabled: { type: 'boolean' },
          syncInterval: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.importListRepository?.findById || !deps.importListRepository.update) {
      throw new ValidationError('Import list repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'import list');
    const payload = request.body as Record<string, unknown>;

    // Check if list exists
    const existing = await deps.importListRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Import list ${id} not found`);
    }

    // Validate provider config if changed
    if (payload.providerType || payload.config) {
      if (!deps.importListProviderRegistry) {
        throw new ValidationError('Import list provider registry is not configured');
      }

      const providerType = (payload.providerType as string) ?? existing.providerType;
      const config = (payload.config as Record<string, unknown>) ?? existing.config;

      const provider = deps.importListProviderRegistry.getProvider(providerType);
      if (!provider) {
        throw new ValidationError(`Unknown provider type: ${providerType}`);
      }

      if (!provider.validateConfig(config)) {
        throw new ValidationError(`Invalid configuration for provider ${providerType}`);
      }
    }

    const updateData: {
      name?: string;
      providerType?: string;
      config?: Record<string, unknown>;
      rootFolderPath?: string;
      qualityProfileId?: number;
      languageProfileId?: number | null;
      monitorType?: string;
      enabled?: boolean;
      syncInterval?: number;
    } = {};

    if (payload.name !== undefined) updateData.name = payload.name as string;
    if (payload.providerType !== undefined) updateData.providerType = payload.providerType as string;
    if (payload.config !== undefined) updateData.config = payload.config as Record<string, unknown>;
    if (payload.rootFolderPath !== undefined) updateData.rootFolderPath = payload.rootFolderPath as string;
    if (payload.qualityProfileId !== undefined) updateData.qualityProfileId = payload.qualityProfileId as number;
    if (payload.languageProfileId !== undefined) updateData.languageProfileId = payload.languageProfileId as number | null;
    if (payload.monitorType !== undefined) updateData.monitorType = payload.monitorType as string;
    if (payload.enabled !== undefined) updateData.enabled = payload.enabled as boolean;
    if (payload.syncInterval !== undefined) updateData.syncInterval = payload.syncInterval as number;

    const updated = await deps.importListRepository.update(id, updateData);
    return sendSuccess(reply, updated);
  });

  // DELETE /api/import-lists/:id - Delete an import list
  app.delete('/api/import-lists/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.importListRepository?.delete) {
      throw new ValidationError('Import list repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'import list');
    const deleted = await deps.importListRepository.delete(id);

    return sendSuccess(reply, deleted);
  });

  // POST /api/import-lists/:id/sync - Manually sync an import list
  app.post('/api/import-lists/:id/sync', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.importListSyncService?.syncList) {
      throw new ValidationError('Import list sync service is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'import list');
    const result = await deps.importListSyncService.syncList(id);

    return sendSuccess(reply, result);
  });

  // GET /api/import-lists/providers - Get available provider types
  app.get('/api/import-lists/providers', async (_request, reply) => {
    if (!deps.importListProviderRegistry) {
      throw new ValidationError('Import list provider registry is not configured');
    }

    const types = deps.importListProviderRegistry.getAllProviderTypes();
    const providers = types.map(type => {
      const provider = deps.importListProviderRegistry!.getProvider(type);
      return {
        type,
        name: provider?.name ?? type,
      };
    });

    return sendSuccess(reply, providers);
  });

  // Exclusion routes
  // GET /api/import-lists/exclusions - List all exclusions
  app.get('/api/import-lists/exclusions', async (_request, reply) => {
    if (!deps.importListRepository?.findAllExclusions) {
      throw new ValidationError('Import list repository is not configured');
    }

    const exclusions = await deps.importListRepository.findAllExclusions();
    return sendSuccess(reply, exclusions);
  });

  // POST /api/import-lists/exclusions - Add an exclusion
  app.post('/api/import-lists/exclusions', {
    schema: {
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          importListId: { type: 'number' },
          tmdbId: { type: 'number' },
          imdbId: { type: 'string' },
          tvdbId: { type: 'number' },
          title: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.importListRepository?.createExclusion) {
      throw new ValidationError('Import list repository is not configured');
    }

    const payload = request.body as Record<string, unknown>;

    // At least one ID should be provided
    if (!payload.tmdbId && !payload.imdbId && !payload.tvdbId) {
      throw new ValidationError('At least one of tmdbId, imdbId, or tvdbId must be provided');
    }

    const created = await deps.importListRepository.createExclusion({
      importListId: payload.importListId as number | undefined,
      tmdbId: payload.tmdbId as number | undefined,
      imdbId: payload.imdbId as string | undefined,
      tvdbId: payload.tvdbId as number | undefined,
      title: payload.title as string,
    });

    return sendSuccess(reply, created, 201);
  });

  // DELETE /api/import-lists/exclusions/:id - Remove an exclusion
  app.delete('/api/import-lists/exclusions/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.importListRepository?.deleteExclusion) {
      throw new ValidationError('Import list repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'exclusion');
    const deleted = await deps.importListRepository.deleteExclusion(id);

    return sendSuccess(reply, deleted);
  });
}
