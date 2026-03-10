# Spec: Notification Event Dispatch Service

## Problem
Notifications are fully configurable via the UI (Discord, Slack, Telegram, Gotify, Pushover, Webhook, Email) and persisted in the database, but are **never dispatched**. The `notificationRoutes.ts` has test-send logic as module-level functions, and `NotificationRepository.findAllEnabled()` exists but is never called from any service. Users who configure Discord/Slack notifications see nothing happen when media is grabbed or downloaded.

## Solution
Create a `NotificationDispatchService` that:
1. Takes `NotificationRepository` as a constructor dependency
2. Exposes typed event dispatch methods: `notifyGrab`, `notifyDownload`, `notifyUpgrade`, `notifySeriesAdd`, `notifyEpisodeDelete`
3. Each method fetches all enabled notifications, filters by the relevant boolean flag, and sends to each matching notification
4. Wire into `MediaSearchService.grabRelease()` (onGrab) and `ImportManager.handleTorrentCompleted()` (onDownload/onUpgrade)
5. Extract the per-type HTTP dispatch logic from `notificationRoutes.ts` into the service (DRY)

## Acceptance Criteria
- [ ] `NotificationDispatchService` exists with `notifyGrab`, `notifyDownload`, `notifySeriesAdd` methods
- [ ] Each method fires all enabled, flag-matching notifications with a rich message body
- [ ] `MediaSearchService.grabRelease()` calls `notifyGrab` on successful grab
- [ ] `ImportManager` calls `notifyDownload` on successful movie/episode import
- [ ] `notificationRoutes.ts` uses the service's send logic (no duplication)
- [ ] Unit tests: dispatch calls correct notifications, skips disabled ones, swallows errors gracefully
- [ ] All existing tests continue to pass

## Out of Scope
- Email SMTP sending (remains simulated as before)
- `onRename` and `onEpisodeDelete` hooks (no current rename/delete service code to wire into)
- Frontend notification history UI
