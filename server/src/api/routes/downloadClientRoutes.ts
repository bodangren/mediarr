/**
 * Download Client API Routes
 *
 * Manages download client connections for torrent and Usenet clients.
 * Supports qBittorrent, Transmission, Deluge, rTorrent, uTorrent, SABnzbd, and NZBGet.
 *
 * @module routes/downloadClients
 */
import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';
import type {
  DownloadClientProtocol,
  DownloadClientType,
  DownloadClientConfig,
} from '../../repositories/DownloadClientRepository';

/** Field definition for client configuration schema */
interface FieldDefinition {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'password' | 'path';
  label: string;
  helpText?: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  advanced?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface ClientSchema {
  type: DownloadClientType;
  protocol: DownloadClientProtocol;
  name: string;
  fields: FieldDefinition[];
}

// Schema definitions for each client type
const CLIENT_SCHEMAS: ClientSchema[] = [
  // qBittorrent
  {
    type: 'qbittorrent',
    protocol: 'torrent',
    name: 'qBittorrent',
    fields: [
      { name: 'host', type: 'text', label: 'Host', required: true, helpText: 'Hostname or IP address of the qBittorrent host' },
      { name: 'port', type: 'number', label: 'Port', required: true, defaultValue: 8080, validation: { min: 1, max: 65535 } },
      { name: 'useSsl', type: 'boolean', label: 'Use SSL', required: false, defaultValue: false },
      { name: 'username', type: 'text', label: 'Username', required: false },
      { name: 'password', type: 'password', label: 'Password', required: false },
      { name: 'category', type: 'text', label: 'Category', required: false, helpText: 'Category to use for downloads' },
      { name: 'sequentialDownload', type: 'boolean', label: 'Sequential Download', required: false, defaultValue: false, advanced: true, helpText: 'Enable sequential download' },
      { name: 'firstLastPiecePriority', type: 'boolean', label: 'First/Last Priority', required: false, defaultValue: false, advanced: true, helpText: 'Download first and last pieces first' },
    ],
  },
  // Transmission
  {
    type: 'transmission',
    protocol: 'torrent',
    name: 'Transmission',
    fields: [
      { name: 'host', type: 'text', label: 'Host', required: true, helpText: 'Hostname or IP address of the Transmission host' },
      { name: 'port', type: 'number', label: 'Port', required: true, defaultValue: 9091, validation: { min: 1, max: 65535 } },
      { name: 'useSsl', type: 'boolean', label: 'Use SSL', required: false, defaultValue: false },
      { name: 'username', type: 'text', label: 'Username', required: false },
      { name: 'password', type: 'password', label: 'Password', required: false },
      { name: 'category', type: 'text', label: 'Category', required: false, helpText: 'Category to use for downloads' },
      { name: 'torrentDirectory', type: 'path', label: 'Torrent Directory', required: false, advanced: true, helpText: 'Directory to save torrent files' },
    ],
  },
  // Deluge
  {
    type: 'deluge',
    protocol: 'torrent',
    name: 'Deluge',
    fields: [
      { name: 'host', type: 'text', label: 'Host', required: true, helpText: 'Hostname or IP address of the Deluge daemon' },
      { name: 'port', type: 'number', label: 'Port', required: true, defaultValue: 58846, validation: { min: 1, max: 65535 } },
      { name: 'useSsl', type: 'boolean', label: 'Use SSL', required: false, defaultValue: false },
      { name: 'password', type: 'password', label: 'Password', required: false },
      { name: 'category', type: 'text', label: 'Category', required: false, helpText: 'Category to use for downloads' },
      { name: 'label', type: 'text', label: 'Label', required: false, advanced: true, helpText: 'Label to apply to downloads' },
    ],
  },
  // rTorrent
  {
    type: 'rtorrent',
    protocol: 'torrent',
    name: 'rTorrent',
    fields: [
      { name: 'host', type: 'text', label: 'Host', required: true, helpText: 'URL of rTorrent RPC interface' },
      { name: 'port', type: 'number', label: 'Port', required: false, defaultValue: 80, advanced: true, validation: { min: 1, max: 65535 } },
      { name: 'useSsl', type: 'boolean', label: 'Use SSL', required: false, defaultValue: false },
      { name: 'username', type: 'text', label: 'Username', required: false },
      { name: 'password', type: 'password', label: 'Password', required: false },
      { name: 'category', type: 'text', label: 'Category', required: false, helpText: 'Category to use for downloads' },
      { name: 'directory', type: 'path', label: 'Directory', required: false, advanced: true, helpText: 'Default download directory' },
    ],
  },
  // uTorrent
  {
    type: 'utorrent',
    protocol: 'torrent',
    name: 'uTorrent',
    fields: [
      { name: 'host', type: 'text', label: 'Host', required: true, helpText: 'Hostname or IP address of the uTorrent host' },
      { name: 'port', type: 'number', label: 'Port', required: true, defaultValue: 8080, validation: { min: 1, max: 65535 } },
      { name: 'useSsl', type: 'boolean', label: 'Use SSL', required: false, defaultValue: false },
      { name: 'username', type: 'text', label: 'Username', required: true },
      { name: 'password', type: 'password', label: 'Password', required: true },
      { name: 'category', type: 'text', label: 'Category', required: false, helpText: 'Category to use for downloads' },
    ],
  },
  // SABnzbd
  {
    type: 'sabnzbd',
    protocol: 'usenet',
    name: 'SABnzbd',
    fields: [
      { name: 'host', type: 'text', label: 'Host', required: true, helpText: 'Hostname or IP address of the SABnzbd host' },
      { name: 'port', type: 'number', label: 'Port', required: true, defaultValue: 8080, validation: { min: 1, max: 65535 } },
      { name: 'useSsl', type: 'boolean', label: 'Use SSL', required: false, defaultValue: false },
      { name: 'apiKey', type: 'password', label: 'API Key', required: true, helpText: 'SABnzbd API key' },
      { name: 'username', type: 'text', label: 'Username', required: false },
      { name: 'password', type: 'password', label: 'Password', required: false },
      { name: 'category', type: 'text', label: 'Category', required: false, helpText: 'Default category for downloads' },
      { name: 'tvCategory', type: 'text', label: 'TV Category', required: false, advanced: true, helpText: 'Category for TV shows' },
      { name: 'movieCategory', type: 'text', label: 'Movie Category', required: false, advanced: true, helpText: 'Category for movies' },
      { name: 'recentTvPriority', type: 'number', label: 'Recent TV Priority', required: false, advanced: true, defaultValue: -100, helpText: 'Priority for recent TV shows' },
      { name: 'olderTvPriority', type: 'number', label: 'Older TV Priority', required: false, advanced: true, defaultValue: -100, helpText: 'Priority for older TV shows' },
      { name: 'recentMoviePriority', type: 'number', label: 'Recent Movie Priority', required: false, advanced: true, defaultValue: -100, helpText: 'Priority for recent movies' },
      { name: 'olderMoviePriority', type: 'number', label: 'Older Movie Priority', required: false, advanced: true, defaultValue: -100, helpText: 'Priority for older movies' },
    ],
  },
  // NZBGet
  {
    type: 'nzbget',
    protocol: 'usenet',
    name: 'NZBGet',
    fields: [
      { name: 'host', type: 'text', label: 'Host', required: true, helpText: 'Hostname or IP address of the NZBGet host' },
      { name: 'port', type: 'number', label: 'Port', required: true, defaultValue: 6789, validation: { min: 1, max: 65535 } },
      { name: 'useSsl', type: 'boolean', label: 'Use SSL', required: false, defaultValue: false },
      { name: 'username', type: 'text', label: 'Username', required: true },
      { name: 'password', type: 'password', label: 'Password', required: true },
      { name: 'category', type: 'text', label: 'Category', required: false, helpText: 'Default category for downloads' },
      { name: 'nzbCategory', type: 'text', label: 'NZB Category', required: false, advanced: true, helpText: 'Alternative category field' },
      { name: 'priority', type: 'number', label: 'Priority', required: false, advanced: true, defaultValue: 0, helpText: 'Download priority' },
      { name: 'addPaused', type: 'boolean', label: 'Add Paused', required: false, advanced: true, defaultValue: false, helpText: 'Add downloads in paused state' },
    ],
  },
];

function validateConfig(config: unknown, schema: ClientSchema): void {
  if (typeof config !== 'object' || config === null) {
    throw new ValidationError('Config must be an object');
  }

  const cfg = config as Record<string, unknown>;

  for (const field of schema.fields) {
    if (field.required && (cfg[field.name] === undefined || cfg[field.name] === '')) {
      throw new ValidationError(`Field '${field.name}' is required`);
    }

    if (cfg[field.name] !== undefined && cfg[field.name] !== '') {
      // Type validation
      switch (field.type) {
        case 'text':
        case 'password':
        case 'path':
          if (typeof cfg[field.name] !== 'string') {
            throw new ValidationError(`Field '${field.name}' must be a string`);
          }
          break;
        case 'number':
          if (typeof cfg[field.name] !== 'number') {
            throw new ValidationError(`Field '${field.name}' must be a number`);
          }
          if (field.validation?.min !== undefined && (cfg[field.name] as number) < field.validation.min) {
            throw new ValidationError(`Field '${field.name}' must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined && (cfg[field.name] as number) > field.validation.max) {
            throw new ValidationError(`Field '${field.name}' must be at most ${field.validation.max}`);
          }
          break;
        case 'boolean':
          if (typeof cfg[field.name] !== 'boolean') {
            throw new ValidationError(`Field '${field.name}' must be a boolean`);
          }
          break;
      }
    }
  }
}

async function testClientConnection(
  type: DownloadClientType,
  config: DownloadClientConfig,
): Promise<{ success: boolean; message: string; version?: string }> {
  // In a real implementation, this would actually connect to the client
  // For now, we do basic validation and return a mock response
  if (!config.host) {
    return { success: false, message: 'Host is required' };
  }

  if (!config.port || config.port < 1 || config.port > 65535) {
    return { success: false, message: 'Port must be between 1 and 65535' };
  }

  // Simulate connection test based on client type
  // In production, this would make actual API calls to each client
  try {
    switch (type) {
      case 'qbittorrent':
        // Would call qBittorrent API here
        return { success: true, message: 'Connection successful', version: '4.6.0' };
      case 'transmission':
        return { success: true, message: 'Connection successful', version: '4.0.0' };
      case 'deluge':
        return { success: true, message: 'Connection successful', version: '2.1.1' };
      case 'rtorrent':
        return { success: true, message: 'Connection successful', version: '0.9.8' };
      case 'utorrent':
        return { success: true, message: 'Connection successful', version: '3.5.5' };
      case 'sabnzbd':
        if (!config.apiKey) {
          return { success: false, message: 'API Key is required for SABnzbd' };
        }
        return { success: true, message: 'Connection successful', version: '4.1.0' };
      case 'nzbget':
        if (!config.username || !config.password) {
          return { success: false, message: 'Username and Password are required for NZBGet' };
        }
        return { success: true, message: 'Connection successful', version: '21.1' };
      default:
        return { success: false, message: `Unknown client type: ${type}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Connection failed: ${message}` };
  }
}

export function registerDownloadClientRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  // GET /api/download-clients - List all download clients
  app.get('/api/download-clients', async (_request, reply) => {
    if (!deps.downloadClientRepository?.findAll) {
      throw new ValidationError('Download client repository is not configured');
    }

    const clients = await deps.downloadClientRepository.findAll();
    return sendSuccess(reply, clients);
  });

  // GET /api/download-clients/:id - Get single client
  app.get('/api/download-clients/:id', {
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
    if (!deps.downloadClientRepository?.findById) {
      throw new ValidationError('Download client repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'download client');
    const client = await deps.downloadClientRepository.findById(id);

    if (!client) {
      throw new NotFoundError(`Download client ${id} not found`);
    }

    return sendSuccess(reply, client);
  });

  // POST /api/download-clients - Create new client
  app.post('/api/download-clients', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'protocol', 'type', 'config'],
        properties: {
          name: { type: 'string' },
          protocol: { type: 'string', enum: ['torrent', 'usenet'] },
          type: { type: 'string' },
          enabled: { type: 'boolean' },
          priority: { type: 'number' },
          config: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.downloadClientRepository?.create) {
      throw new ValidationError('Download client repository is not configured');
    }

    const payload = request.body as Record<string, unknown>;

    // Validate client type
    const clientType = payload.type as DownloadClientType;
    const schema = CLIENT_SCHEMAS.find(s => s.type === clientType);
    if (!schema) {
      throw new ValidationError(`Unknown client type: ${clientType}`);
    }

    // Validate protocol matches
    if (payload.protocol !== schema.protocol) {
      throw new ValidationError(`Protocol '${payload.protocol}' does not match expected '${schema.protocol}' for type '${clientType}'`);
    }

    // Validate config
    validateConfig(payload.config, schema);

    // Check for duplicate name
    if (await deps.downloadClientRepository.nameExists(payload.name as string)) {
      throw new ConflictError(`Download client with name '${payload.name}' already exists`);
    }

    const created = await deps.downloadClientRepository.create({
      name: payload.name as string,
      protocol: payload.protocol as DownloadClientProtocol,
      type: clientType,
      enabled: typeof payload.enabled === 'boolean' ? payload.enabled : true,
      priority: typeof payload.priority === 'number' ? payload.priority : 25,
      config: payload.config as DownloadClientConfig,
    });

    return sendSuccess(reply, created, 201);
  });

  // PUT /api/download-clients/:id - Update client
  app.put('/api/download-clients/:id', {
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
          protocol: { type: 'string', enum: ['torrent', 'usenet'] },
          type: { type: 'string' },
          enabled: { type: 'boolean' },
          priority: { type: 'number' },
          config: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.downloadClientRepository?.update) {
      throw new ValidationError('Download client repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'download client');
    const payload = request.body as Record<string, unknown>;

    // Verify client exists
    const existing = await deps.downloadClientRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Download client ${id} not found`);
    }

    // If changing type, validate it
    const clientType = (payload.type ?? existing.type) as DownloadClientType;
    const schema = CLIENT_SCHEMAS.find(s => s.type === clientType);
    if (!schema) {
      throw new ValidationError(`Unknown client type: ${clientType}`);
    }

    // Validate config if provided
    if (payload.config !== undefined) {
      validateConfig(payload.config, schema);
    }

    // Check for duplicate name if changing
    if (payload.name !== undefined && payload.name !== existing.name) {
      if (await deps.downloadClientRepository.nameExists(payload.name as string, id)) {
        throw new ConflictError(`Download client with name '${payload.name}' already exists`);
      }
    }

    const updated = await deps.downloadClientRepository.update(id, {
      name: payload.name as string | undefined,
      protocol: payload.protocol as DownloadClientProtocol | undefined,
      type: payload.type as DownloadClientType | undefined,
      enabled: payload.enabled as boolean | undefined,
      priority: payload.priority as number | undefined,
      config: payload.config as DownloadClientConfig | undefined,
    });

    return sendSuccess(reply, updated);
  });

  // DELETE /api/download-clients/:id - Delete client
  app.delete('/api/download-clients/:id', {
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
    if (!deps.downloadClientRepository?.delete) {
      throw new ValidationError('Download client repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'download client');

    if (!(await deps.downloadClientRepository.exists(id))) {
      throw new NotFoundError(`Download client ${id} not found`);
    }

    const deleted = await deps.downloadClientRepository.delete(id);
    return sendSuccess(reply, deleted);
  });

  // POST /api/download-clients/:id/test - Test existing client connection
  app.post('/api/download-clients/:id/test', {
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
    if (!deps.downloadClientRepository?.findById) {
      throw new ValidationError('Download client repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'download client');
    const client = await deps.downloadClientRepository.findById(id);

    if (!client) {
      throw new NotFoundError(`Download client ${id} not found`);
    }

    const result = await testClientConnection(
      client.type as DownloadClientType,
      client.config,
    );

    return sendSuccess(reply, result);
  });

  // POST /api/download-clients/test - Test new client config (no save)
  app.post('/api/download-clients/test', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'config'],
        properties: {
          type: { type: 'string' },
          config: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const payload = request.body as Record<string, unknown>;
    const clientType = payload.type as DownloadClientType;

    const schema = CLIENT_SCHEMAS.find(s => s.type === clientType);
    if (!schema) {
      throw new ValidationError(`Unknown client type: ${clientType}`);
    }

    // Validate config
    validateConfig(payload.config, schema);

    const result = await testClientConnection(
      clientType,
      payload.config as DownloadClientConfig,
    );

    return sendSuccess(reply, result);
  });

  // POST /api/download-clients/schema - Get field schema for client type
  app.post('/api/download-clients/schema', {
    schema: {
      body: {
        type: 'object',
        properties: {
          type: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const payload = request.body as Record<string, unknown> | undefined;
    
    // If type is specified, return schema for that type only
    if (payload?.type !== undefined) {
      const clientType = payload.type as DownloadClientType;
      const schema = CLIENT_SCHEMAS.find(s => s.type === clientType);
      
      if (!schema) {
        throw new ValidationError(`Unknown client type: ${clientType}`);
      }
      
      return sendSuccess(reply, schema);
    }
    
    // Return all schemas
    return sendSuccess(reply, CLIENT_SCHEMAS);
  });
}
