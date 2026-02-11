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
}
