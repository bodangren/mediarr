/**
 * Notification types for the UI layer.
 * Re-exports types from the API layer for convenience.
 */
import type { NotificationItem as ApiNotificationItem, NotificationType as ApiNotificationType, TriggerType as ApiTriggerType, CreateNotificationInput, UpdateNotificationInput, NotificationTestResult } from '@/lib/api/notificationsApi';
export type Notification = ApiNotificationItem;
export type NotificationType = ApiNotificationType;
export type NotificationTrigger = ApiTriggerType;
export type NotificationFormData = CreateNotificationInput;
export type NotificationUpdateData = UpdateNotificationInput;
export { type NotificationTestResult };
/**
 * Get display label for notification type.
 */
export declare function getNotificationTypeLabel(type: NotificationType): string;
/**
 * Get display label for notification trigger.
 */
export declare function getNotificationTriggerLabel(trigger: NotificationTrigger): string;
/**
 * Get icon name for notification type.
 */
export declare function getNotificationTypeIcon(type: NotificationType): string;
//# sourceMappingURL=notification.d.ts.map