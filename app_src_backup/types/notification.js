/**
 * Notification types for the UI layer.
 * Re-exports types from the API layer for convenience.
 */
export {};
/**
 * Get display label for notification type.
 */
export function getNotificationTypeLabel(type) {
    const labels = {
        Discord: 'Discord',
        Telegram: 'Telegram',
        Email: 'Email',
        Webhook: 'Webhook',
        Slack: 'Slack',
        Pushover: 'Pushover',
    };
    return labels[type];
}
/**
 * Get display label for notification trigger.
 */
export function getNotificationTriggerLabel(trigger) {
    const labels = {
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
export function getNotificationTypeIcon(type) {
    const icons = {
        Discord: 'message-circle',
        Telegram: 'send',
        Email: 'mail',
        Webhook: 'link',
        Slack: 'message-square',
        Pushover: 'smartphone',
    };
    return icons[type];
}
//# sourceMappingURL=notification.js.map