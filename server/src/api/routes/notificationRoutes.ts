/** Notification management and connected-client push status routes. */
import type { FastifyInstance, FastifyReply } from 'fastify';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/domainErrors';
import type {
  CreateNotificationData,
  UpdateNotificationData,
} from '../../repositories/NotificationRepository';
import { NotificationTransportRegistry } from '../../services/notifications/NotificationTransportRegistry';
import type { NotificationEvent } from '../../services/notifications/transport';
import type { Notification } from '../../types/modelTypes';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

const MASKED_SECRET = '********';
const SUPPORTED_TYPES = new Set(['discord', 'telegram', 'email', 'slack', 'webhook', 'pushover']);
const SENSITIVE_CONFIG_FIELDS: Record<string, string[]> = {
  email: ['password'],
  telegram: ['botToken'],
  pushover: ['appToken', 'userKey'],
};
const TEST_EVENT: NotificationEvent = {
  type: 'health',
  title: 'Mediarr notification test',
  message: 'This is a test notification from Mediarr.',
  data: { test: true },
};

type NotificationRepositoryDependency = NonNullable<ApiDependencies['notificationRepository']>;

function requireRepository(deps: ApiDependencies): NotificationRepositoryDependency {
  if (!deps.notificationRepository) {
    throw new ValidationError('Notification repository is not configured');
  }
  return deps.notificationRepository;
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${field} must be a boolean`);
  }
  return value;
}

function normalizeType(value: unknown): string {
  const type = requireNonEmptyString(value, 'type').toLowerCase();
  if (!SUPPORTED_TYPES.has(type)) {
    throw new ValidationError(`Unsupported notification type '${type}'`);
  }
  return type;
}

function requireConfigString(config: Record<string, unknown>, field: string, label: string): void {
  if (typeof config[field] !== 'string' || config[field].trim().length === 0) {
    throw new ValidationError(`${label} is required`);
  }
}

function validateWebhookUrl(config: Record<string, unknown>, allowUrlAlias = false): void {
  const field = typeof config.webhookUrl === 'string'
    ? 'webhookUrl'
    : allowUrlAlias
      ? 'url'
      : 'webhookUrl';
  requireConfigString(config, field, 'Webhook URL');
  try {
    const parsed = new URL(config[field] as string);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new ValidationError('Webhook URL must be a valid HTTP or HTTPS URL');
  }
}

function validateConfig(type: string, config: Record<string, unknown>, allowMaskedSecrets: boolean): void {
  const requireSecret = (field: string, label: string) => {
    requireConfigString(config, field, label);
    if (!allowMaskedSecrets && config[field] === MASKED_SECRET) {
      throw new ValidationError(`${label} must be provided`);
    }
  };

  if (type === 'discord' || type === 'slack') {
    validateWebhookUrl(config);
    return;
  }
  if (type === 'webhook') {
    validateWebhookUrl(config, true);
    return;
  }
  if (type === 'telegram') {
    requireSecret('botToken', 'Telegram bot token');
    requireConfigString(config, 'chatId', 'Telegram chat ID');
    return;
  }
  if (type === 'email') {
    requireConfigString(config, 'server', 'SMTP server');
    requireConfigString(config, 'from', 'From address');
    requireConfigString(config, 'to', 'To address');
    return;
  }
  if (type === 'pushover') {
    requireSecret('appToken', 'Pushover application token');
    requireSecret('userKey', 'Pushover user key');
  }
}

function notificationBooleans(body: Record<string, unknown>) {
  return {
    enabled: optionalBoolean(body.enabled, 'enabled'),
    onGrab: optionalBoolean(body.onGrab, 'onGrab'),
    onDownload: optionalBoolean(body.onDownload, 'onDownload'),
    onUpgrade: optionalBoolean(body.onUpgrade, 'onUpgrade'),
    onRename: optionalBoolean(body.onRename, 'onRename'),
    onSeriesAdd: optionalBoolean(body.onSeriesAdd, 'onSeriesAdd'),
    onEpisodeDelete: optionalBoolean(body.onEpisodeDelete, 'onEpisodeDelete'),
  };
}

function compactUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function parseCreateBody(value: unknown): CreateNotificationData {
  const body = requireRecord(value, 'Request body');
  const type = normalizeType(body.type);
  const config = requireRecord(body.config, 'config');
  validateConfig(type, config, false);

  return compactUndefined({
    name: requireNonEmptyString(body.name, 'name'),
    type,
    config,
    ...notificationBooleans(body),
  }) as CreateNotificationData;
}

function preserveMaskedSecrets(
  type: string,
  incoming: Record<string, unknown>,
  current: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...incoming };
  for (const field of SENSITIVE_CONFIG_FIELDS[type] ?? []) {
    if (merged[field] === MASKED_SECRET) {
      merged[field] = current[field];
    }
  }
  return merged;
}

function parseUpdateBody(value: unknown, existing: Notification): UpdateNotificationData {
  const body = requireRecord(value, 'Request body');
  const requestedType = body.type === undefined ? existing.type : normalizeType(body.type);
  if (requestedType !== existing.type.toLowerCase()) {
    throw new ValidationError('Notification type cannot be changed');
  }

  let config: Record<string, unknown> | undefined;
  if (body.config !== undefined) {
    const incoming = requireRecord(body.config, 'config');
    config = preserveMaskedSecrets(
      requestedType,
      incoming,
      requireRecord(existing.config, 'existing notification config'),
    );
    validateConfig(requestedType, config, false);
  }

  const name = body.name === undefined ? undefined : requireNonEmptyString(body.name, 'name');
  return compactUndefined({
    name,
    type: requestedType,
    config,
    ...notificationBooleans(body),
  }) as UpdateNotificationData;
}

function serializeNotification(notification: Notification): Notification {
  const config = { ...requireRecord(notification.config, 'notification config') };
  for (const field of SENSITIVE_CONFIG_FIELDS[notification.type.toLowerCase()] ?? []) {
    if (typeof config[field] === 'string' && config[field].length > 0) {
      config[field] = MASKED_SECRET;
    }
  }
  return { ...notification, config };
}

async function requireNotification(
  repository: NotificationRepositoryDependency,
  id: number,
): Promise<Notification> {
  const notification = await repository.findById(id);
  if (!notification) {
    throw new NotFoundError(`Notification ${id} not found`);
  }
  return notification;
}

async function sendTest(
  notification: Notification,
  deps: ApiDependencies,
  reply: FastifyReply,
) {
  const registry = deps.notificationTransportRegistry ?? new NotificationTransportRegistry();
  const transport = registry.getTransport(notification.type);
  if (!transport) {
    throw new ValidationError(`Notification type '${notification.type}' has no configured transport`);
  }

  try {
    await transport.send(notification, TEST_EVENT);
    return sendSuccess(reply, {
      success: true,
      message: 'Test notification sent successfully.',
    });
  } catch (error) {
    return sendSuccess(reply, {
      success: false,
      message: error instanceof Error ? error.message : 'Notification transport failed',
    });
  }
}

export function registerNotificationRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  app.get('/api/notifications', async (_request, reply) => {
    const notifications = await requireRepository(deps).findAll();
    return sendSuccess(reply, notifications.map(serializeNotification));
  });

  app.post('/api/notifications', async (request, reply) => {
    const repository = requireRepository(deps);
    const input = parseCreateBody(request.body);
    if (await repository.nameExists(input.name)) {
      throw new ConflictError(`Notification named '${input.name}' already exists`);
    }
    const created = await repository.create(input);
    return sendSuccess(reply, serializeNotification(created), 201);
  });

  app.post('/api/notifications/test', async (request, reply) => {
    const body = requireRecord(request.body, 'Request body');
    const type = normalizeType(body.type);
    const config = requireRecord(body.config, 'config');
    validateConfig(type, config, false);
    const now = new Date();
    const draft: Notification = {
      id: 0,
      name: 'Notification test',
      type,
      enabled: true,
      onGrab: false,
      onDownload: false,
      onUpgrade: false,
      onRename: false,
      onSeriesAdd: false,
      onEpisodeDelete: false,
      config,
      createdAt: now,
      updatedAt: now,
    };
    return sendTest(draft, deps, reply);
  });

  app.put('/api/notifications/:id', async (request, reply) => {
    const repository = requireRepository(deps);
    const id = parseIdParam((request.params as { id: string }).id, 'notification');
    const existing = await requireNotification(repository, id);
    const input = parseUpdateBody(request.body, existing);
    if (input.name && await repository.nameExists(input.name, id)) {
      throw new ConflictError(`Notification named '${input.name}' already exists`);
    }
    const updated = await repository.update(id, input);
    return sendSuccess(reply, serializeNotification(updated));
  });

  app.delete('/api/notifications/:id', async (request, reply) => {
    const repository = requireRepository(deps);
    const id = parseIdParam((request.params as { id: string }).id, 'notification');
    await requireNotification(repository, id);
    await repository.delete(id);
    return sendSuccess(reply, { id });
  });

  app.post('/api/notifications/:id/test', async (request, reply) => {
    const repository = requireRepository(deps);
    const id = parseIdParam((request.params as { id: string }).id, 'notification');
    const notification = await requireNotification(repository, id);
    return sendTest(notification, deps, reply);
  });

  app.get('/api/notifications/push-status', async (_request, reply) => {
    const connectedClients = deps.eventHub?.clientCount ?? 0;
    return sendSuccess(reply, {
      enabled: true,
      transport: 'sse',
      connectedClients,
      description: 'Notifications are pushed via SSE to connected Mediarr clients.',
    });
  });
}
