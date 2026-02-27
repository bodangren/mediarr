import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const triggerSchema = z.enum([
  'OnGrab',
  'OnDownload',
  'OnImport',
  'OnUpgrade',
  'OnHealthIssue',
  'OnDelete',
]);

const notificationTypeSchema = z.enum([
  'Discord',
  'Telegram',
  'Email',
  'Webhook',
  'Slack',
  'Pushover',
]);

const backendNotificationSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  enabled: z.boolean(),
  onGrab: z.boolean(),
  onDownload: z.boolean(),
  onUpgrade: z.boolean(),
  onRename: z.boolean(),
  onSeriesAdd: z.boolean(),
  onEpisodeDelete: z.boolean(),
  config: z.record(z.unknown()),
});

const testResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type TriggerType = z.infer<typeof triggerSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export interface NotificationItem {
  id: number;
  name: string;
  type: NotificationType;
  triggers: TriggerType[];
  enabled: boolean;
  webhookUrl?: string;
  botToken?: string;
  chatId?: string;
  smtpServer?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromAddress?: string;
  toAddress?: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
}

export type NotificationTestResult = z.infer<typeof testResultSchema>;

export interface CreateNotificationInput {
  name: string;
  type: NotificationType;
  triggers: TriggerType[];
  enabled: boolean;
  webhookUrl?: string;
  botToken?: string;
  chatId?: string;
  smtpServer?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromAddress?: string;
  toAddress?: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
}

export type UpdateNotificationInput = Partial<CreateNotificationInput>;

function mapTypeToBackend(type: NotificationType): string {
  return type.toLowerCase();
}

function mapTypeFromBackend(type: string): NotificationType {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case 'discord':
      return 'Discord';
    case 'telegram':
      return 'Telegram';
    case 'email':
      return 'Email';
    case 'webhook':
      return 'Webhook';
    case 'slack':
      return 'Slack';
    case 'pushover':
      return 'Pushover';
    default:
      return 'Webhook';
  }
}

function mapTriggersToBackend(triggers: TriggerType[]) {
  const has = (trigger: TriggerType) => triggers.includes(trigger);
  return {
    onGrab: has('OnGrab'),
    onDownload: has('OnDownload') || has('OnImport'),
    onUpgrade: has('OnUpgrade'),
    onRename: false,
    onSeriesAdd: has('OnHealthIssue'),
    onEpisodeDelete: has('OnDelete'),
  };
}

function mapTriggersFromBackend(item: z.infer<typeof backendNotificationSchema>): TriggerType[] {
  const triggers: TriggerType[] = [];
  if (item.onGrab) triggers.push('OnGrab');
  if (item.onDownload) triggers.push('OnDownload');
  if (item.onUpgrade) triggers.push('OnUpgrade');
  if (item.onSeriesAdd) triggers.push('OnHealthIssue');
  if (item.onEpisodeDelete) triggers.push('OnDelete');
  return triggers;
}

function mapConfigToBackend(input: CreateNotificationInput | UpdateNotificationInput): Record<string, unknown> {
  const type = input.type;
  if (type === 'Discord') {
    return { webhookUrl: input.webhookUrl };
  }
  if (type === 'Slack') {
    return { webhookUrl: input.webhookUrl };
  }
  if (type === 'Telegram') {
    return { botToken: input.botToken, chatId: input.chatId };
  }
  if (type === 'Email') {
    return {
      server: input.smtpServer,
      port: input.smtpPort,
      username: input.smtpUser,
      password: input.smtpPassword,
      from: input.fromAddress,
      to: input.toAddress,
      useSsl: true,
    };
  }
  if (type === 'Pushover') {
    return {
      appToken: input.smtpUser,
      userKey: input.smtpPassword,
    };
  }

  return {
    url: input.webhookUrl,
    method: input.method ?? 'POST',
    headers: input.headers ? JSON.stringify(input.headers) : undefined,
  };
}

function mapConfigFromBackend(
  type: NotificationType,
  config: Record<string, unknown>,
): Omit<NotificationItem, 'id' | 'name' | 'type' | 'triggers' | 'enabled'> {
  if (type === 'Discord' || type === 'Slack') {
    return {
      webhookUrl: typeof config.webhookUrl === 'string' ? config.webhookUrl : '',
    };
  }

  if (type === 'Telegram') {
    return {
      botToken: typeof config.botToken === 'string' ? config.botToken : '',
      chatId: typeof config.chatId === 'string' ? config.chatId : '',
    };
  }

  if (type === 'Email') {
    return {
      smtpServer: typeof config.server === 'string' ? config.server : '',
      smtpPort: typeof config.port === 'number' ? config.port : 587,
      smtpUser: typeof config.username === 'string' ? config.username : '',
      smtpPassword: typeof config.password === 'string' ? config.password : '',
      fromAddress: typeof config.from === 'string' ? config.from : '',
      toAddress: typeof config.to === 'string' ? config.to : '',
    };
  }

  if (type === 'Webhook') {
    return {
      webhookUrl: typeof config.url === 'string' ? config.url : '',
      method:
        config.method === 'GET' || config.method === 'PUT'
          ? config.method
          : 'POST',
      headers: undefined,
    };
  }

  return {};
}

function mapBackendNotification(item: z.infer<typeof backendNotificationSchema>): NotificationItem {
  const type = mapTypeFromBackend(item.type);
  return {
    id: item.id,
    name: item.name,
    type,
    triggers: mapTriggersFromBackend(item),
    enabled: item.enabled,
    ...mapConfigFromBackend(type, item.config),
  };
}

function mapInputToBackend(input: CreateNotificationInput | UpdateNotificationInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.type !== undefined ? { type: mapTypeToBackend(input.type) } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
  };

  if (input.triggers !== undefined) {
    Object.assign(payload, mapTriggersToBackend(input.triggers));
  }

  if (input.type !== undefined) {
    payload.config = mapConfigToBackend(input);
  }

  return payload;
}

export function createNotificationsApi(client: ApiHttpClient) {
  return {
    async list(): Promise<NotificationItem[]> {
      const items = await client.request(
        {
          path: routeMap.notifications,
        },
        z.array(backendNotificationSchema),
      );

      return items.map(mapBackendNotification);
    },

    async create(input: CreateNotificationInput): Promise<NotificationItem> {
      const created = await client.request(
        {
          path: routeMap.notifications,
          method: 'POST',
          body: mapInputToBackend(input),
        },
        backendNotificationSchema,
      );

      return mapBackendNotification(created);
    },

    async update(id: number, input: UpdateNotificationInput): Promise<NotificationItem> {
      const updated = await client.request(
        {
          path: routeMap.notificationUpdate(id),
          method: 'PUT',
          body: mapInputToBackend(input),
        },
        backendNotificationSchema,
      );

      return mapBackendNotification(updated);
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.notificationDelete(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    test(id: number): Promise<NotificationTestResult> {
      return client.request(
        {
          path: routeMap.notificationTest(id),
          method: 'POST',
        },
        testResultSchema,
      );
    },

    testDraft(input: CreateNotificationInput): Promise<NotificationTestResult> {
      return client.request(
        {
          path: routeMap.notificationTestDraft,
          method: 'POST',
          body: {
            type: mapTypeToBackend(input.type),
            config: mapConfigToBackend(input),
          },
        },
        testResultSchema,
      );
    },
  };
}
