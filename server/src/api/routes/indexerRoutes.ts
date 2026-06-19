import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';
import { IndexerServiceDiscovery, type DiscoveredService } from '../../services/discovery/IndexerServiceDiscovery';
import type { CatalogEntry } from '../../services/indexers/CatalogCache';
import { validateCatalogEntry } from '../../services/indexers/indexerValidation';

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

  app.get('/api/indexers/:id/health', {
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
    const id = parseIdParam((request.params as { id: string }).id, 'indexer');

    if (!deps.indexerRepository?.findById) {
      throw new ValidationError('Indexer repository is not configured');
    }

    const indexer = await deps.indexerRepository.findById(id);
    if (!indexer) {
      throw new NotFoundError(`Indexer ${id} not found`);
    }

    const snapshot = await loadHealthSnapshot(deps, id);

    return sendSuccess(reply, {
      indexerId: id,
      snapshot,
    });
  });

  app.get('/api/indexers/catalog', async (_request, reply) => {
    if (!deps.indexerRepository?.findAll) {
      throw new ValidationError('Indexer repository is not configured');
    }

    if (!deps.catalogCache?.get) {
      throw new ValidationError('Catalog cache is not configured');
    }

    const catalog = deps.catalogCache.get();

    const existingIndexers = await deps.indexerRepository.findAll();

    function isConfigured(entry: CatalogEntry): boolean {
      return existingIndexers.some(indexer => {
        // Name-based fallback (backwards compatibility)
        if (indexer.name.toLowerCase() === entry.name.toLowerCase()) {
          return true;
        }

        const settings = (() => {
          try {
            return JSON.parse(indexer.settings) as Record<string, unknown>;
          } catch {
            return {};
          }
        })();

        // Cardigann: match by definitionId
        if (
          indexer.implementation === 'Cardigann' &&
          entry.implementation === 'Cardigann' &&
          settings.definitionId === entry.id
        ) {
          return true;
        }

        // Torznab / Newznab: match by baseUrl / url / host
        if (
          (indexer.implementation === 'Torznab' || indexer.implementation === 'Newznab') &&
          (entry.implementation === 'Torznab' || entry.implementation === 'Newznab')
        ) {
          const indexerUrl =
            typeof settings.baseUrl === 'string'
              ? settings.baseUrl
              : typeof settings.url === 'string'
                ? settings.url
                : typeof settings.host === 'string'
                  ? settings.host
                  : null;
          if (indexerUrl && indexerUrl === entry.baseUrl) {
            return true;
          }
        }

        return false;
      });
    }

    const result = catalog.map(entry => ({
      ...entry,
      isConfigured: isConfigured(entry),
    }));

    return sendSuccess(reply, result);
  });

  app.post('/api/indexers/catalog/:id/add', {
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
          apiKey: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.indexerRepository?.findAll || !deps.indexerRepository?.create) {
      throw new ValidationError('Indexer repository is not configured');
    }

    if (!deps.catalogCache?.get) {
      throw new ValidationError('Catalog cache is not configured');
    }

    const { id } = request.params as { id: string };
    const { apiKey } = (request.body as { apiKey?: string } | undefined) ?? {};

    const catalog = deps.catalogCache.get();
    const entry = catalog.find(e => e.id === id);
    if (!entry) {
      throw new NotFoundError(`Catalog entry '${id}' not found`);
    }

    const validation = validateCatalogEntry(entry, apiKey);
    if (!validation.valid) {
      throw new ValidationError(validation.message ?? 'API key is required');
    }

    const settings = buildSettingsFromEntry(entry, apiKey);

    const created = await deps.indexerRepository.create({
      name: entry.name,
      implementation: entry.implementation,
      configContract: entry.configContract,
      settings: JSON.stringify(settings),
      protocol: entry.type === 'newznab' ? 'nzb' : 'torrent',
      supportedMediaTypes: JSON.stringify(entry.supportedMediaTypes),
      enabled: true,
      supportsRss: entry.supportsRss,
      supportsSearch: entry.supportsSearch,
      priority: 25,
    });

    return sendSuccess(reply, created, 201);
  });

  app.post('/api/indexers/catalog/reload', async (_request, reply) => {
    if (!deps.catalogCache?.load) {
      throw new ValidationError('Catalog cache is not configured');
    }

    await deps.catalogCache.load();
    return sendSuccess(reply, { reloaded: true });
  });

  app.get('/api/indexers/detect', async (_request, reply) => {
    const discovery = new IndexerServiceDiscovery({
      probeTimeoutMs: 2000,
    });

    const discovered = await discovery.detect();
    return sendSuccess(reply, discovered);
  });

  app.post('/api/indexers/import-from/:type', {
    schema: {
      params: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string' },
          apiKey: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.indexerRepository?.create) {
      throw new ValidationError('Indexer repository is not configured');
    }

    const { type } = request.params as { type: string };
    const { url, apiKey } = request.body as { url: string; apiKey?: string };

    if (type !== 'prowlarr' && type !== 'jackett') {
      throw new ValidationError('type must be "prowlarr" or "jackett"');
    }

    let indexerConfigs: Array<{
      name: string;
      implementation: string;
      configContract: string;
      settings: Record<string, string>;
      protocol: string;
      supportedMediaTypes: string[];
      supportsSearch: boolean;
      supportsRss: boolean;
    }> = [];

    try {
      const statusUrl = type === 'prowlarr'
        ? `${url}/api/v1/system/status`
        : `${url}/api/v2.0/indexers`;

      const response = await fetch(statusUrl, {
        headers: {
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new ValidationError(`Failed to connect to ${type}: ${response.statusText}`);
      }

      if (type === 'prowlarr') {
        const data = await response.json() as {
          name?: string;
          version?: string;
        };
        indexerConfigs = [{
          name: data.name ?? `Prowlarr (${url})`,
          implementation: 'Torznab',
          configContract: 'TorznabSettings',
          settings: {
            url: `${url}/api/v1/search`,
            apiKey: apiKey ?? '',
          } as Record<string, string>,
          protocol: 'torrent',
          supportedMediaTypes: ['TV', 'MOVIE'],
          supportsSearch: true,
          supportsRss: true,
        }];
      } else {
        const data = await response.json() as { indexers?: Array<{ id: string; name: string }> };
        indexerConfigs = (data.indexers ?? []).map(idx => ({
          name: idx.name,
          implementation: 'Torznab',
          configContract: 'TorznabSettings',
          settings: {
            url: `${url}/api/v1/search?query=`,
            apiKey: apiKey ?? '',
          } as Record<string, string>,
          protocol: 'torrent',
          supportedMediaTypes: ['TV', 'MOVIE'],
          supportsSearch: true,
          supportsRss: true,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new ValidationError(`Failed to import from ${type}: ${message}`);
    }

    const created: unknown[] = [];
    for (const config of indexerConfigs) {
      const entry = await deps.indexerRepository.create({
        name: config.name,
        implementation: config.implementation,
        configContract: config.configContract,
        settings: JSON.stringify(config.settings),
        protocol: config.protocol,
        supportedMediaTypes: Array.isArray(config.supportedMediaTypes) ? config.supportedMediaTypes.join(',') : config.supportedMediaTypes,
        enabled: true,
        supportsRss: config.supportsRss,
        supportsSearch: config.supportsSearch,
        priority: 25,
      });
      created.push(entry);
    }

    return sendSuccess(reply, {
      imported: created.length,
      indexers: created,
    }, 201);
  });
}

function buildSettingsFromEntry(entry: CatalogEntry, apiKey?: string): Record<string, string> {
  if (entry.configContract === 'CardigannSettings') {
    const settings: Record<string, string> = {
      definitionId: entry.id,
    };
    if (apiKey) {
      settings.apiKey = apiKey;
    }
    return settings;
  }

  if (entry.configContract === 'TorznabSettings') {
    return {
      url: entry.baseUrl,
      apiKey: apiKey ?? '',
    };
  }

  if (entry.configContract === 'NewznabSettings') {
    return {
      host: entry.baseUrl,
      apiKey: apiKey ?? '',
    };
  }

  return {};
}
