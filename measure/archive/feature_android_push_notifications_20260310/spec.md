# Spec: Server-to-Android Push Notification System

## Problem
The existing `NotificationDispatchService` dispatches notifications to external third-party services (Discord webhooks, Telegram bots, Slack, Gotify, Pushover, generic webhooks, and simulated email). These external integrations require user configuration, involve outbound internet calls, and are external to the Mediarr ecosystem. The product direction is to replace all external notification providers with a direct, internal push notification channel from the server to the Android TV client.

## Goal
When Mediarr grabs a release, completes a download, adds a series, or deletes an episode, the Android TV client should display a system notification automatically — with no external service configuration required.

## Solution

### Server
- Strip all external HTTP dispatch logic from `NotificationDispatchService`
- Replace with SSE event publishing via the existing `ApiEventHub`
- New SSE event names: `notification:grab`, `notification:download`, `notification:seriesAdd`, `notification:episodeDelete`
- Wire `ApiEventHub` into `NotificationDispatchService` via constructor dependency
- Simplify `notificationRoutes.ts` to expose a simple push-settings endpoint (on/off toggle)
- Extend `eventsApi.ts` with the new notification event types for completeness

### Android TV Client
- New `NotificationEventSource` — a coroutine-based SSE client using OkHttp streaming that subscribes to `/api/events/stream`
- New `MediarrNotificationManager` — wraps `NotificationManagerCompat` to create a notification channel and post Android system notifications
- Wire both into the app lifecycle so notifications start when a server is found and stop on disconnect
- Add `POST_NOTIFICATIONS` permission to the manifest

## Out of Scope
- Per-notification toggle settings (push is always-on when Android client is connected)
- Notification history or inbox UI in the Android client
- Any external provider integrations
