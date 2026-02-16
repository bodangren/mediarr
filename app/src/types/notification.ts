/**
 * Notification types for the UI layer.
 * Re-exports types from the API layer for convenience.
 */

import type {
  NotificationItem as ApiNotificationItem,
  NotificationType as ApiNotificationType,
  TriggerType as ApiTriggerType,
  CreateNotificationInput,
  UpdateNotificationInput,
  NotificationTestResult,
} from '@/lib/api/notificationsApi';

export type Notification = ApiNotificationItem;
export type NotificationType = ApiNotificationType;
export type NotificationTrigger = ApiTriggerType;
export type NotificationFormData = CreateNotificationInput;
export type NotificationUpdateData = UpdateNotificationInput;
export { type NotificationTestResult };

/**
 * Get display label for notification type.
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    Discord: 'Discord',
    Telegram: 'Telegram',
    Email: 'Email',
    Webhook: 'Webhook',
    Slack: 'Slack',
    Pushover: 'Pushover',
    Pushbullet: 'Pushbullet',
  };
  return labels[type];
}

/**
 * Get display label for notification trigger.
 */
export function getNotificationTriggerLabel(trigger: NotificationTrigger): string {
  const labels: Record<NotificationTrigger, string> = {
    OnGrab: 'On Grab',
    OnDownload: 'On Download',
    OnImport: 'On Import',
    OnUpgrade: 'On Upgrade',
    OnHealthIssue: 'On Health Issue',
    OnDelete: 'On Delete',
  };
  return labels[trigger];
}

/**
 * Get icon name for notification type.
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    Discord: 'message-circle',
    Telegram: 'send',
    Email: 'mail',
    Webhook: 'link',
    Slack: 'message-square',
    Pushover: 'smartphone',
    Pushbullet: 'share-2',
  };
  return icons[type];
}
