import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

function remediationHints(message: string): string[] {
  const hints: string[] = [];
  const normalized = message.toLowerCase();

  if (normalized.includes('http')) {
    hints.push('Verify indexer URL and protocol configuration.');
  }

  if (normalized.includes('apikey') || normalized.includes('auth')) {
    hints.push('Validate API key and authentication settings.');
  }

  if (normalized.includes('timeout') || normalized.includes('network')) {
    hints.push('Check outbound connectivity and DNS resolution.');
  }

  if (hints.length === 0) {
    hints.push('Review indexer settings and retry test.');
  }

  return hints;
}

async function loadHealthSnapshot(
  deps: ApiDependencies,
  indexerId: number,
): Promise<unknown> {
  if (!deps.indexerHealthRepository?.getByIndexerId) {
    return null;
  }

  return deps.indexerHealthRepository.getByIndexerId(indexerId);
}

export function registerIndexerRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/indexers', async (_request, reply) => {
    if (!deps.indexerRepository?.findAll) {
      throw new ValidationError('Indexer repository is not configured');
    }

    const indexers = await deps.indexerRepository.findAll();
    const withHealth = await Promise.all(indexers.map(async indexer => ({
      ...indexer,
      health: await loadHealthSnapshot(deps, indexer.id),
    })));

    return sendSuccess(reply, withHealth);
  });

  app.post('/api/indexers', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'implementation', 'configContract', 'settings', 'protocol'],
        properties: {
          name: { type: 'string' },
          implementation: { type: 'string' },
          configContract: { type: 'string' },
          settings: { type: 'string' },
          protocol: { type: 'string' },
          appProfileId: { type: 'number' },
          enabled: { type: 'boolean' },
          supportsRss: { type: 'boolean' },
          supportsSearch: { type: 'boolean' },
          priority: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.indexerRepository?.create) {
      throw new ValidationError('Indexer repository is not configured');
    }

    const payload = request.body as any;
    const created = await deps.indexerRepository.create(payload);

    return sendSuccess(reply, created, 201);
  });

  app.post('/api/indexers/test', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'implementation', 'configContract', 'settings', 'protocol'],
        properties: {
          name: { type: 'string' },
          implementation: { type: 'string' },
          configContract: { type: 'string' },
          settings: { type: 'string' },
          protocol: { type: 'string' },
          appProfileId: { type: 'number' },
          enabled: { type: 'boolean' },
          supportsRss: { type: 'boolean' },
          supportsSearch: { type: 'boolean' },
          priority: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.indexerTester?.test) {
      throw new ValidationError('Indexer tester is not configured');
    }

    const payload = request.body as Record<string, unknown>;
    const rawSettings = payload.settings;
    if (typeof rawSettings !== 'string') {
      throw new ValidationError('settings must be a JSON string');
    }

    let parsedSettings: Record<string, unknown>;
    try {
      parsedSettings = JSON.parse(rawSettings) as Record<string, unknown>;
    } catch {
      throw new ValidationError('settings must be valid JSON');
    }

    const draftRecord = {
      id: 0,
      name: typeof payload.name === 'string' ? payload.name : 'Draft indexer',
      implementation: typeof payload.implementation === 'string' ? payload.implementation : 'Torznab',
      configContract: typeof payload.configContract === 'string' ? payload.configContract : 'TorznabSettings',
      settings: JSON.stringify(parsedSettings),
      protocol: typeof payload.protocol === 'string' ? payload.protocol : 'torrent',
      appProfileId: typeof payload.appProfileId === 'number' ? payload.appProfileId : null,
      enabled: typeof payload.enabled === 'boolean' ? payload.enabled : true,
      supportsRss: typeof payload.supportsRss === 'boolean' ? payload.supportsRss : true,
      supportsSearch: typeof payload.supportsSearch === 'boolean' ? payload.supportsSearch : true,
      priority: typeof payload.priority === 'number' ? payload.priority : 25,
      added: new Date(),
    };

    let indexer;
    try {
      if (!deps.indexerFactory?.fromDatabaseRecord) {
        throw new ValidationError('Indexer factory is not configured');
      }
      indexer = deps.indexerFactory.fromDatabaseRecord(draftRecord as any);
    } catch (factoryError: any) {
      return sendSuccess(reply, {
        success: false,
        message: factoryError.message ?? 'Failed to create indexer instance',
        diagnostics: {
          remediationHints: ['Check that the indexer definition exists and is valid.'],
        },
        healthSnapshot: null,
      });
    }

    const result = await deps.indexerTester.test(indexer as any);

    return sendSuccess(reply, {
      ...result,
      diagnostics: {
        remediationHints: remediationHints(result.message),
      },
      healthSnapshot: null,
    });
  });

  app.put('/api/indexers/:id', {
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
      },
    },
  }, async (request, reply) => {
    if (!deps.indexerRepository?.update) {
      throw new ValidationError('Indexer repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'indexer');
    const payload = request.body as Record<string, unknown>;

    const updated = await deps.indexerRepository.update(id, payload as any);
    return sendSuccess(reply, updated);
  });

  app.delete('/api/indexers/:id', {
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
    if (!deps.indexerRepository?.delete) {
      throw new ValidationError('Indexer repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'indexer');
    const deleted = await deps.indexerRepository.delete(id);

    return sendSuccess(reply, deleted);
  });

  app.post('/api/indexers/:id/test', {
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
    if (!deps.indexerRepository?.findById) {
      throw new ValidationError('Indexer repository is not configured');
    }

    if (!deps.indexerTester?.test) {
      throw new ValidationError('Indexer tester is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'indexer');
    const record = await deps.indexerRepository.findById(id);
    if (!record) {
      throw new NotFoundError(`Indexer ${id} not found`);
    }

    const indexer = deps.indexerFactory?.fromDatabaseRecord
      ? deps.indexerFactory.fromDatabaseRecord(record as any)
      : record;

    const result = await deps.indexerTester.test(indexer as any);
    const snapshot = await loadHealthSnapshot(deps, id);

    if (snapshot && deps.eventHub) {
      deps.eventHub.publish('health:update', {
        indexerId: id,
        snapshot,
      });
    }

    return sendSuccess(reply, {
      ...result,
      diagnostics: {
        remediationHints: remediationHints(result.message),
      },
      healthSnapshot: snapshot,
    });
  });

  app.post('/api/indexers/:id/clone', {
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
    if (!deps.indexerRepository?.findById || !deps.indexerRepository?.create) {
      throw new ValidationError('Indexer repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'indexer');
    const source = await deps.indexerRepository.findById(id);
    if (!source) {
      throw new NotFoundError(`Indexer ${id} not found`);
    }

    const cloned = await deps.indexerRepository.create({
      name: `${source.name} (Copy)`,
      implementation: source.implementation,
      configContract: source.configContract,
      settings: source.settings,
      protocol: source.protocol,
      appProfileId: source.appProfileId,
      enabled: source.enabled,
      supportsRss: source.supportsRss,
      supportsSearch: source.supportsSearch,
      priority: source.priority,
    });

    return sendSuccess(reply, cloned, 201);
  });
}
