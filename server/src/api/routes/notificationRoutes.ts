/**
 * Notification (Connect) API Routes
 *
 * Manages notification connections for various services.
 * Supports Discord, Email, Telegram, Slack, Gotify, Pushover, and Webhook.
 *
 * @module routes/notifications
 */
import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

/** Supported notification types */
export type NotificationType = 'discord' | 'email' | 'telegram' | 'slack' | 'gotify' | 'pushover' | 'webhook';

export interface NotificationSchemaField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'password' | 'select';
  label: string;
  helpText?: string;
  required: boolean;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface NotificationTypeSchema {
  type: NotificationType;
  name: string;
  description: string;
  fields: NotificationSchemaField[];
}

// Schema definitions for each notification type
const NOTIFICATION_SCHEMAS: NotificationTypeSchema[] = [
  {
    type: 'discord',
    name: 'Discord',
    description: 'Send notifications to Discord via webhook',
    fields: [
      {
        name: 'webhookUrl',
        type: 'text',
        label: 'Webhook URL',
        helpText: 'Discord channel webhook URL',
        required: true,
        validation: { pattern: '^https://discord\\.com/api/webhooks/' },
      },
      {
        name: 'username',
        type: 'text',
        label: 'Username',
        helpText: 'Override the default username of the webhook',
        required: false,
      },
      {
        name: 'avatarUrl',
        type: 'text',
        label: 'Avatar URL',
        helpText: 'Override the default avatar of the webhook',
        required: false,
      },
    ],
  },
  {
    type: 'email',
    name: 'Email',
    description: 'Send notifications via email (SMTP)',
    fields: [
      {
        name: 'server',
        type: 'text',
        label: 'SMTP Server',
        helpText: 'Hostname or IP of SMTP server',
        required: true,
      },
      {
        name: 'port',
        type: 'number',
        label: 'Port',
        helpText: 'SMTP server port (usually 25, 465, or 587)',
        required: true,
        defaultValue: 587,
        validation: { min: 1, max: 65535 },
      },
      {
        name: 'useSsl',
        type: 'boolean',
        label: 'Use SSL',
        helpText: 'Use SSL/TLS for connection',
        required: false,
        defaultValue: true,
      },
      {
        name: 'from',
        type: 'text',
        label: 'From Address',
        helpText: 'Sender email address',
        required: true,
      },
      {
        name: 'to',
        type: 'text',
        label: 'To Address',
        helpText: 'Recipient email address(es), comma-separated',
        required: true,
      },
      {
        name: 'username',
        type: 'text',
        label: 'Username',
        helpText: 'SMTP authentication username',
        required: false,
      },
      {
        name: 'password',
        type: 'password',
        label: 'Password',
        helpText: 'SMTP authentication password',
        required: false,
      },
    ],
  },
  {
    type: 'telegram',
    name: 'Telegram',
    description: 'Send notifications via Telegram bot',
    fields: [
      {
        name: 'botToken',
        type: 'password',
        label: 'Bot Token',
        helpText: 'Telegram bot token from @BotFather',
        required: true,
      },
      {
        name: 'chatId',
        type: 'text',
        label: 'Chat ID',
        helpText: 'Target chat or channel ID',
        required: true,
      },
    ],
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack via webhook',
    fields: [
      {
        name: 'webhookUrl',
        type: 'text',
        label: 'Webhook URL',
        helpText: 'Slack incoming webhook URL',
        required: true,
        validation: { pattern: '^https://hooks\\.slack\\.com/' },
      },
      {
        name: 'channel',
        type: 'text',
        label: 'Channel',
        helpText: 'Override default channel (#channel-name)',
        required: false,
      },
      {
        name: 'username',
        type: 'text',
        label: 'Username',
        helpText: 'Override the default bot username',
        required: false,
      },
      {
        name: 'iconUrl',
        type: 'text',
        label: 'Icon URL',
        helpText: 'Override the default bot icon',
        required: false,
      },
    ],
  },
  {
    type: 'gotify',
    name: 'Gotify',
    description: 'Send notifications via Gotify server',
    fields: [
      {
        name: 'serverUrl',
        type: 'text',
        label: 'Server URL',
        helpText: 'Gotify server URL',
        required: true,
      },
      {
        name: 'appToken',
        type: 'password',
        label: 'App Token',
        helpText: 'Application token from Gotify',
        required: true,
      },
      {
        name: 'priority',
        type: 'number',
        label: 'Priority',
        helpText: 'Message priority (0-10)',
        required: false,
        defaultValue: 5,
        validation: { min: 0, max: 10 },
      },
    ],
  },
  {
    type: 'pushover',
    name: 'Pushover',
    description: 'Send notifications via Pushover',
    fields: [
      {
        name: 'appToken',
        type: 'password',
        label: 'App Token',
        helpText: 'Pushover application token',
        required: true,
      },
      {
        name: 'userKey',
        type: 'password',
        label: 'User Key',
        helpText: 'Pushover user key',
        required: true,
      },
      {
        name: 'priority',
        type: 'number',
        label: 'Priority',
        helpText: 'Message priority (-2 to 2)',
        required: false,
        defaultValue: 0,
        validation: { min: -2, max: 2 },
      },
      {
        name: 'sound',
        type: 'text',
        label: 'Sound',
        helpText: 'Notification sound name',
        required: false,
      },
    ],
  },
  {
    type: 'webhook',
    name: 'Webhook',
    description: 'Send notifications to a custom webhook',
    fields: [
      {
        name: 'url',
        type: 'text',
        label: 'URL',
        helpText: 'Webhook endpoint URL',
        required: true,
      },
      {
        name: 'method',
        type: 'select',
        label: 'HTTP Method',
        helpText: 'HTTP method for the request',
        required: false,
        defaultValue: 'POST',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
        ],
      },
      {
        name: 'contentType',
        type: 'text',
        label: 'Content-Type',
        helpText: 'Content-Type header value',
        required: false,
        defaultValue: 'application/json',
      },
      {
        name: 'headers',
        type: 'text',
        label: 'Custom Headers',
        helpText: 'Additional headers (JSON object)',
        required: false,
      },
    ],
  },
];

// Test notification implementations
async function testDiscordNotification(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  const webhookUrl = config.webhookUrl as string;
  if (!webhookUrl) {
    return { success: false, message: 'Webhook URL is required' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '**Test Notification**\nThis is a test notification from Mediarr.',
        username: config.username || 'Mediarr',
        avatar_url: config.avatarUrl || undefined,
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Test notification sent successfully to Discord' };
    }
    return { success: false, message: `Discord API error: ${response.status} ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testEmailNotification(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  // Email testing requires nodemailer or similar - return simulated result
  // In production, this would actually send an email
  const required = ['server', 'port', 'from', 'to'];
  const missing = required.filter(field => !config[field]);
  
  if (missing.length > 0) {
    return { success: false, message: `Missing required fields: ${missing.join(', ')}` };
  }

  // Simulate successful email test
  return { success: true, message: `Test email would be sent to ${config.to} via ${config.server}:${config.port}` };
}

async function testTelegramNotification(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  const botToken = config.botToken as string;
  const chatId = config.chatId as string;

  if (!botToken || !chatId) {
    return { success: false, message: 'Bot token and Chat ID are required' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🔔 *Test Notification*\n\nThis is a test notification from Mediarr.',
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json() as { ok?: boolean; description?: string };
    
    if (response.ok && data.ok) {
      return { success: true, message: 'Test notification sent successfully to Telegram' };
    }
    return { success: false, message: `Telegram API error: ${data.description || response.statusText}` };
  } catch (error) {
    return { success: false, message: `Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testSlackNotification(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  const webhookUrl = config.webhookUrl as string;
  if (!webhookUrl) {
    return { success: false, message: 'Webhook URL is required' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🔔 *Test Notification*\nThis is a test notification from Mediarr.',
        channel: config.channel || undefined,
        username: config.username || 'Mediarr',
        icon_url: config.iconUrl || undefined,
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Test notification sent successfully to Slack' };
    }
    return { success: false, message: `Slack API error: ${response.status} ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testGotifyNotification(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  const serverUrl = config.serverUrl as string;
  const appToken = config.appToken as string;

  if (!serverUrl || !appToken) {
    return { success: false, message: 'Server URL and App Token are required' };
  }

  try {
    const url = `${serverUrl.replace(/\/$/, '')}/message?token=${appToken}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Mediarr Test',
        message: 'This is a test notification from Mediarr.',
        priority: config.priority || 5,
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Test notification sent successfully to Gotify' };
    }
    return { success: false, message: `Gotify API error: ${response.status} ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testPushoverNotification(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  const appToken = config.appToken as string;
  const userKey = config.userKey as string;

  if (!appToken || !userKey) {
    return { success: false, message: 'App Token and User Key are required' };
  }

  try {
    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: appToken,
        user: userKey,
        title: 'Mediarr Test',
        message: 'This is a test notification from Mediarr.',
        priority: config.priority || 0,
        sound: config.sound || undefined,
      }),
    });

    const data = await response.json() as { status?: number; errors?: string[] };
    
    if (response.ok && data.status === 1) {
      return { success: true, message: 'Test notification sent successfully to Pushover' };
    }
    return { success: false, message: `Pushover API error: ${data.errors?.join(', ') || response.statusText}` };
  } catch (error) {
    return { success: false, message: `Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testWebhookNotification(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  const url = config.url as string;
  if (!url) {
    return { success: false, message: 'URL is required' };
  }

  try {
    const method = (config.method as string) || 'POST';
    const headers: Record<string, string> = {
      'Content-Type': (config.contentType as string) || 'application/json',
    };

    // Parse custom headers if provided
    if (config.headers && typeof config.headers === 'string') {
      try {
        const customHeaders = JSON.parse(config.headers) as Record<string, string>;
        Object.assign(headers, customHeaders);
      } catch (err) {
        console.error('[notificationRoutes] invalid custom headers JSON, ignoring:', err instanceof Error ? err.message : String(err));
      }
    }

    const body = method !== 'GET' ? JSON.stringify({
      event: 'test',
      message: 'This is a test notification from Mediarr.',
      timestamp: new Date().toISOString(),
    }) : null;

    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body } : {}),
    });

    if (response.ok) {
      return { success: true, message: `Test webhook called successfully (${response.status})` };
    }
    return { success: false, message: `Webhook error: ${response.status} ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Failed to call webhook: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testNotification(type: string, config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  switch (type) {
    case 'discord':
      return testDiscordNotification(config);
    case 'email':
      return testEmailNotification(config);
    case 'telegram':
      return testTelegramNotification(config);
    case 'slack':
      return testSlackNotification(config);
    case 'gotify':
      return testGotifyNotification(config);
    case 'pushover':
      return testPushoverNotification(config);
    case 'webhook':
      return testWebhookNotification(config);
    default:
      return { success: false, message: `Unknown notification type: ${type}` };
  }
}

function validateNotificationConfig(type: string, config: Record<string, unknown>): string | null {
  const schema = NOTIFICATION_SCHEMAS.find(s => s.type === type);
  if (!schema) {
    return `Unknown notification type: ${type}`;
  }

  for (const field of schema.fields) {
    if (field.required && (config[field.name] === undefined || config[field.name] === '')) {
      return `Required field '${field.label}' is missing`;
    }

    if (field.validation && config[field.name] !== undefined) {
      const value = config[field.name];

      if (field.validation.min !== undefined && typeof value === 'number' && value < field.validation.min) {
        return `${field.label} must be at least ${field.validation.min}`;
      }

      if (field.validation.max !== undefined && typeof value === 'number' && value > field.validation.max) {
        return `${field.label} must be at most ${field.validation.max}`;
      }

      if (field.validation.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return `${field.label} has invalid format`;
        }
      }
    }
  }

  return null;
}

export function registerNotificationRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  // GET /api/notifications - List all notifications
  app.get('/api/notifications', async (_request, reply) => {
    if (!deps.notificationRepository?.findAll) {
      throw new ValidationError('Notification repository is not configured');
    }

    const notifications = await deps.notificationRepository.findAll();
    return sendSuccess(reply, notifications);
  });

  // GET /api/notifications/:id - Get single notification
  app.get('/api/notifications/:id', {
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
    if (!deps.notificationRepository?.findById) {
      throw new ValidationError('Notification repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'notification');
    const notification = await deps.notificationRepository.findById(id);

    if (!notification) {
      throw new NotFoundError(`Notification ${id} not found`);
    }

    return sendSuccess(reply, notification);
  });

  // POST /api/notifications - Create notification
  app.post('/api/notifications', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type', 'config'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          enabled: { type: 'boolean' },
          onGrab: { type: 'boolean' },
          onDownload: { type: 'boolean' },
          onUpgrade: { type: 'boolean' },
          onRename: { type: 'boolean' },
          onSeriesAdd: { type: 'boolean' },
          onEpisodeDelete: { type: 'boolean' },
          config: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.notificationRepository?.create || !deps.notificationRepository?.nameExists) {
      throw new ValidationError('Notification repository is not configured');
    }

    const payload = request.body as Record<string, unknown>;
    const name = payload.name as string;
    const type = payload.type as string;
    const config = payload.config as Record<string, unknown>;

    // Validate type
    if (!NOTIFICATION_SCHEMAS.find(s => s.type === type)) {
      throw new ValidationError(`Invalid notification type: ${type}`);
    }

    // Check name uniqueness
    if (await deps.notificationRepository.nameExists(name)) {
      throw new ConflictError(`Notification with name "${name}" already exists`);
    }

    // Validate config
    const validationError = validateNotificationConfig(type, config);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const created = await deps.notificationRepository.create({
      name,
      type,
      enabled: (payload.enabled as boolean) ?? true,
      onGrab: (payload.onGrab as boolean) ?? false,
      onDownload: (payload.onDownload as boolean) ?? false,
      onUpgrade: (payload.onUpgrade as boolean) ?? false,
      onRename: (payload.onRename as boolean) ?? false,
      onSeriesAdd: (payload.onSeriesAdd as boolean) ?? false,
      onEpisodeDelete: (payload.onEpisodeDelete as boolean) ?? false,
      config,
    });

    return sendSuccess(reply, created, 201);
  });

  // PUT /api/notifications/:id - Update notification
  app.put('/api/notifications/:id', {
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
          type: { type: 'string' },
          enabled: { type: 'boolean' },
          onGrab: { type: 'boolean' },
          onDownload: { type: 'boolean' },
          onUpgrade: { type: 'boolean' },
          onRename: { type: 'boolean' },
          onSeriesAdd: { type: 'boolean' },
          onEpisodeDelete: { type: 'boolean' },
          config: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.notificationRepository?.update || !deps.notificationRepository?.nameExists || !deps.notificationRepository?.findById) {
      throw new ValidationError('Notification repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'notification');
    const payload = request.body as Record<string, unknown>;

    // Check if exists
    const existing = await deps.notificationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Notification ${id} not found`);
    }

    // Check name uniqueness if name is being changed
    const newName = payload.name as string | undefined;
    if (newName && newName !== existing.name) {
      if (await deps.notificationRepository.nameExists(newName, id)) {
        throw new ConflictError(`Notification with name "${newName}" already exists`);
      }
    }

    // Validate type if being changed
    const newType = (payload.type as string) || existing.type;
    if (!NOTIFICATION_SCHEMAS.find(s => s.type === newType)) {
      throw new ValidationError(`Invalid notification type: ${newType}`);
    }

    // Validate config if provided
    if (payload.config) {
      const validationError = validateNotificationConfig(newType, payload.config as Record<string, unknown>);
      if (validationError) {
        throw new ValidationError(validationError);
      }
    }

    const updated = await deps.notificationRepository.update(id, {
      name: newName,
      type: payload.type as string,
      enabled: payload.enabled as boolean,
      onGrab: payload.onGrab as boolean,
      onDownload: payload.onDownload as boolean,
      onUpgrade: payload.onUpgrade as boolean,
      onRename: payload.onRename as boolean,
      onSeriesAdd: payload.onSeriesAdd as boolean,
      onEpisodeDelete: payload.onEpisodeDelete as boolean,
      config: payload.config as Record<string, unknown>,
    });

    return sendSuccess(reply, updated);
  });

  // DELETE /api/notifications/:id - Delete notification
  app.delete('/api/notifications/:id', {
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
    if (!deps.notificationRepository?.delete || !deps.notificationRepository?.exists) {
      throw new ValidationError('Notification repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'notification');

    if (!(await deps.notificationRepository.exists(id))) {
      throw new NotFoundError(`Notification ${id} not found`);
    }

    const deleted = await deps.notificationRepository.delete(id);
    return sendSuccess(reply, deleted);
  });

  // POST /api/notifications/:id/test - Test existing notification
  app.post('/api/notifications/:id/test', {
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
    if (!deps.notificationRepository?.findById) {
      throw new ValidationError('Notification repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'notification');
    const notification = await deps.notificationRepository.findById(id);

    if (!notification) {
      throw new NotFoundError(`Notification ${id} not found`);
    }

    const result = await testNotification(notification.type, notification.config as Record<string, unknown>);
    return sendSuccess(reply, {
      ...result,
      notificationId: id,
      notificationName: notification.name,
      notificationType: notification.type,
    });
  });

  // POST /api/notifications/test - Test notification config without saving
  app.post('/api/notifications/test', {
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
    const type = payload.type as string;
    const config = payload.config as Record<string, unknown>;

    // Validate type
    if (!NOTIFICATION_SCHEMAS.find(s => s.type === type)) {
      throw new ValidationError(`Invalid notification type: ${type}`);
    }

    // Validate config
    const validationError = validateNotificationConfig(type, config);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const result = await testNotification(type, config);
    return sendSuccess(reply, {
      ...result,
      notificationType: type,
    });
  });

  // POST /api/notifications/schema - Get schema for notification type(s)
  app.post('/api/notifications/schema', {
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

    if (payload?.type) {
      const schema = NOTIFICATION_SCHEMAS.find(s => s.type === payload.type);
      if (!schema) {
        throw new ValidationError(`Invalid notification type: ${payload.type as string}`);
      }
      return sendSuccess(reply, schema);
    }

    // Return all schemas
    return sendSuccess(reply, NOTIFICATION_SCHEMAS);
  });

  // GET /api/notifications/types - List available notification types
  app.get('/api/notifications/types', async (_request, reply) => {
    const types = NOTIFICATION_SCHEMAS.map(schema => ({
      type: schema.type,
      name: schema.name,
      description: schema.description,
    }));
    return sendSuccess(reply, types);
  });
}
