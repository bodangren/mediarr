# Plan: Server-to-Android Push Notification System

## Phase 1: Server — Replace External Dispatch with SSE Push
- [x] Rewrite `NotificationDispatchService.ts`: remove all HTTP dispatch functions, replace `dispatch()` to call `eventHub.publish()` with structured payloads
- [x] Update `NotificationDispatchService.test.ts`: rewrite tests to mock `ApiEventHub.publish` and verify correct event names/payloads
- [x] Update `main.ts`: create `ApiEventHub` before services, pass it to `NotificationDispatchService` and `createApiServer`

## Phase 2: Server — Route Simplification + Frontend Event Types
- [x] Simplify `notificationRoutes.ts`: remove CRUD/schema/test endpoints for external providers; replace with simple push-settings toggle
- [x] Update `eventsApi.ts`: add `notification:grab`, `notification:download`, `notification:seriesAdd`, `notification:episodeDelete` event schemas and types

## Phase 3: Android TV — SSE Subscriber + System Notifications
- [x] Create `notification/NotificationEventModels.kt`: data classes for notification event payloads
- [x] Create `notification/NotificationEventSource.kt`: coroutine-based OkHttp SSE client subscribing to `/api/events/stream`
- [x] Create `notification/MediarrNotificationManager.kt`: Android notification channel + `NotificationCompat` posting
- [x] Update `AndroidManifest.xml`: add `POST_NOTIFICATIONS` permission
- [x] Update `MediarrTvApp.kt`: start/stop notification subscription based on active base URL
- [x] Create `notification/NotificationEventSourceTest.kt`: unit tests for SSE parsing and event routing
