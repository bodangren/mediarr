# Plan: Notification Event Dispatch Service

## Phase 1 — Core Service
- [x] Create `server/src/services/NotificationDispatchService.ts`
  - Extract per-type send logic from `notificationRoutes.ts` into `sendSingleNotification(type, config, title, body)`
  - Define payload interfaces: `GrabPayload`, `DownloadPayload`, `SeriesAddPayload`
  - Implement `notifyGrab(payload)`, `notifyDownload(payload)`, `notifySeriesAdd(payload)`, `notifyEpisodeDelete(payload)`
  - Each method: `findAllEnabled()` → filter by flag → send all, swallow errors per notification
- [x] Update `notificationRoutes.ts` test handlers to use shared `sendSingleNotification` from the service

## Phase 2 — Service Wiring
- [x] Add optional `notificationDispatchService` param to `MediaSearchService` constructor
- [x] Call `notifyGrab()` after successful `addTorrent` in `grabRelease()`
- [x] Add optional `notificationDispatchService` param to `ImportManager` constructor
- [x] Call `notifyDownload()` after successful movie/episode import in `importCompletedTorrent()`
- [x] Update `main.ts`: instantiate `NotificationDispatchService`, pass to `MediaSearchService` and `ImportManager`

## Phase 3 — Tests & Verification
- [x] Create `server/src/services/NotificationDispatchService.test.ts`
  - Test: notifyGrab dispatches to matching enabled notifications
  - Test: skips disabled notifications
  - Test: skips notifications where flag is false
  - Test: swallows per-notification send errors without throwing
  - Test: notifyDownload dispatches with correct payload
- [x] Run `cd server && npx vitest run --reporter=verbose 2>&1 | tail -30` to verify — 25/25 pass
- [x] Run production build to verify TypeScript compiles — frontend builds cleanly, server verbatimModuleSyntax errors are pre-existing
