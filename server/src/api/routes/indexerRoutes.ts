import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

type DynamicSchemaFieldType = 'text' | 'password' | 'number' | 'boolean';

interface DynamicSchemaField {
  name: string;
  label: string;
  type: DynamicSchemaFieldType;
  required?: boolean;
  defaultValue?: string | number | boolean;
}

const TORZNAB_SCHEMA_FIELDS: DynamicSchemaField[] = [
  { name: 'url', label: 'Indexer URL', type: 'text', required: true },
  { name: 'apiKey', label: 'API Key', type: 'password', required: true },
];

const NEWZNAB_SCHEMA_FIELDS: DynamicSchemaField[] = [
  { name: 'host', label: 'Host', type: 'text', required: true },
  { name: 'apiKey', label: 'API Key', type: 'password', required: true },
];

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

function normalizeCardigannSettingType(rawType: string): DynamicSchemaFieldType | null {
  const normalized = rawType.toLowerCase();

  if (normalized === 'password') {
    return 'password';
  }
  if (normalized === 'number' || normalized === 'integer') {
    return 'number';
  }
  if (normalized === 'checkbox' || normalized === 'bool' || normalized === 'boolean') {
    return 'boolean';
  }
  if (normalized === 'info') {
    return null;
  }

  return 'text';
}

function buildCardigannSchemaFields(definition: { settings?: unknown[] }, definitionId: string): DynamicSchemaField[] {
  const fields: DynamicSchemaField[] = [
    {
      name: 'definitionId',
      label: 'Definition ID',
      type: 'text',
      required: true,
      defaultValue: definitionId,
    },
  ];

  for (const rawSetting of definition.settings ?? []) {
    if (!rawSetting || typeof rawSetting !== 'object') {
      continue;
    }

    const setting = rawSetting as {
      name?: unknown;
      label?: unknown;
      type?: unknown;
      default?: unknown;
      optional?: unknown;
    };
    if (typeof setting.name !== 'string' || !setting.name || setting.name === 'definitionId') {
      continue;
    }

    const fieldType = normalizeCardigannSettingType(typeof setting.type === 'string' ? setting.type : 'text');
    if (!fieldType) {
      continue;
    }

    const defaultValue = (
      typeof setting.default === 'string'
      || typeof setting.default === 'number'
      || typeof setting.default === 'boolean'
    ) ? setting.default : undefined;

    fields.push({
      name: setting.name,
      label: typeof setting.label === 'string' && setting.label.trim().length > 0
        ? setting.label
        : setting.name,
      type: fieldType,
      required: !Boolean(setting.optional),
      ...(defaultValue !== undefined ? { defaultValue } : {}),
    });
  }

  return fields;
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

  app.get('/api/indexers/schema/:configContract', {
    schema: {
      params: {
        type: 'object',
        required: ['configContract'],
        properties: {
          configContract: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          definitionId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { configContract } = request.params as { configContract: string };

    if (configContract === 'TorznabSettings') {
      return sendSuccess(reply, {
        configContract,
        fields: TORZNAB_SCHEMA_FIELDS,
        compatibility: null,
      });
    }

    if (configContract === 'NewznabSettings') {
      return sendSuccess(reply, {
        configContract,
        fields: NEWZNAB_SCHEMA_FIELDS,
        compatibility: null,
      });
    }

    if (configContract !== 'CardigannSettings') {
      return sendSuccess(reply, {
        configContract,
        fields: [],
        compatibility: null,
      });
    }

    const { definitionId } = request.query as { definitionId?: string };
    if (!definitionId || definitionId.trim().length === 0) {
      throw new ValidationError('definitionId query parameter is required for CardigannSettings schema lookup');
    }

    if (!deps.indexerFactory?.getDefinition) {
      throw new ValidationError('Indexer factory schema lookup is not configured');
    }

    const definition = deps.indexerFactory.getDefinition(definitionId);
    if (!definition) {
      throw new NotFoundError(`Cardigann definition '${definitionId}' not found`);
    }

    const compatibility = deps.indexerFactory.getCompatibilityReport
      ? deps.indexerFactory.getCompatibilityReport(definitionId)
      : null;

    return sendSuccess(reply, {
      configContract,
      definitionId,
      fields: buildCardigannSchemaFields(definition, definitionId),
      compatibility,
    });
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
          supportedMediaTypes: { type: 'string' },
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
          supportedMediaTypes: { type: 'string' },
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
      supportedMediaTypes: typeof payload.supportedMediaTypes === 'string' ? payload.supportedMediaTypes : '[]',
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
      const message = factoryError.message ?? 'Failed to create indexer instance';
      return sendSuccess(reply, {
        success: false,
        message,
        diagnostics: {
          remediationHints: remediationHints(message),
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

    let indexer;
    try {
      indexer = deps.indexerFactory?.fromDatabaseRecord
        ? deps.indexerFactory.fromDatabaseRecord(record as any)
        : record;
    } catch (factoryError: any) {
      const message = factoryError.message ?? 'Failed to create indexer instance';
      return sendSuccess(reply, {
        success: false,
        message,
        diagnostics: {
          remediationHints: remediationHints(message),
        },
        healthSnapshot: await loadHealthSnapshot(deps, id),
      });
    }

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
      supportedMediaTypes: source.supportedMediaTypes,
      enabled: source.enabled,
      supportsRss: source.supportsRss,
      supportsSearch: source.supportsSearch,
      priority: source.priority,
    });

    return sendSuccess(reply, cloned, 201);
  });
}
