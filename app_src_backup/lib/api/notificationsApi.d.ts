import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const triggerSchema: z.ZodEnum<["OnGrab", "OnDownload", "OnImport", "OnUpgrade", "OnHealthIssue", "OnDelete"]>;
declare const notificationTypeSchema: z.ZodEnum<["Discord", "Telegram", "Email", "Webhook", "Slack", "Pushover"]>;
declare const testResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
}, {
    message: string;
    success: boolean;
}>;
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
export declare function createNotificationsApi(client: ApiHttpClient): {
    list(): Promise<NotificationItem[]>;
    create(input: CreateNotificationInput): Promise<NotificationItem>;
    update(id: number, input: UpdateNotificationInput): Promise<NotificationItem>;
    remove(id: number): Promise<{
        id: number;
    }>;
    test(id: number): Promise<NotificationTestResult>;
    testDraft(input: CreateNotificationInput): Promise<NotificationTestResult>;
};
export {};
//# sourceMappingURL=notificationsApi.d.ts.map