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
  'Pushbullet',
]);

const baseNotificationSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: notificationTypeSchema,
  triggers: z.array(triggerSchema),
  enabled: z.boolean(),
});

const discordNotificationSchema = baseNotificationSchema.merge(
  z.object({
    type: z.literal('Discord'),
    webhookUrl: z.string().url(),
  }),
);

const telegramNotificationSchema = baseNotificationSchema.merge(
  z.object({
    type: z.literal('Telegram'),
    botToken: z.string(),
    chatId: z.string(),
  }),
);

const emailNotificationSchema = baseNotificationSchema.merge(
  z.object({
    type: z.literal('Email'),
    smtpServer: z.string(),
    smtpPort: z.number(),
    smtpUser: z.string(),
    smtpPassword: z.string(),
    fromAddress: z.string(),
    toAddress: z.string(),
  }),
);

const webhookNotificationSchema = baseNotificationSchema.merge(
  z.object({
    type: z.literal('Webhook'),
    webhookUrl: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT']),
    headers: z.record(z.string()).optional(),
  }),
);

const notificationSchema = z.discriminatedUnion('type', [
  discordNotificationSchema,
  telegramNotificationSchema,
  emailNotificationSchema,
  webhookNotificationSchema,
]);

const testResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type TriggerType = z.infer<typeof triggerSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationItem = z.infer<typeof notificationSchema>;
export type NotificationTestResult = z.infer<typeof testResultSchema>;

export interface CreateNotificationInput {
  name: string;
  type: NotificationType;
  triggers: TriggerType[];
  enabled: boolean;
  // Discord specific
  webhookUrl?: string;
  // Telegram specific
  botToken?: string;
  chatId?: string;
  // Email specific
  smtpServer?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromAddress?: string;
  toAddress?: string;
  // Webhook specific
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
}

export interface UpdateNotificationInput {
  name?: string;
  triggers?: TriggerType[];
  enabled?: boolean;
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

export function createNotificationsApi(client: ApiHttpClient) {
  return {
    list(): Promise<NotificationItem[]> {
      return client.request(
        {
          path: routeMap.notifications,
        },
        z.array(notificationSchema),
      );
    },

    create(input: CreateNotificationInput): Promise<NotificationItem> {
      return client.request(
        {
          path: routeMap.notifications,
          method: 'POST',
          body: input,
        },
        notificationSchema,
      );
    },

    update(id: number, input: UpdateNotificationInput): Promise<NotificationItem> {
      return client.request(
        {
          path: routeMap.notificationUpdate(id),
          method: 'PUT',
          body: input,
        },
        notificationSchema,
      );
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
          body: input,
        },
        testResultSchema,
      );
    },
  };
}
