# Prowlarr UI Parity Audit (2026-02-15)

Track: `prowlarr_ui_cloning_20260214`

## Goal

Verify that major Prowlarr UI feature areas are implemented and functional in Mediarr, identify parity gaps, and prioritize fixes that reuse existing monolith capabilities.

## Verification Scope

Validated major feature groups:

1. Indexers
2. Search
3. History
4. Settings (Indexers, Applications, Download Clients, Notifications, Tags, General, UI)
5. System (Status, Tasks, Backup, Updates, Events, Logs)
6. Real-time and shortcuts parity slices (Phase 9)

## Automated Verification Run

```bash
CI=true npm run test --workspace=app -- \
  'src/app/(shell)/indexers/page.test.tsx' \
  'src/app/(shell)/search/page.test.tsx' \
  'src/app/(shell)/history/page.test.tsx' \
  'src/app/(shell)/settings/indexers/page.test.tsx' \
  'src/app/(shell)/settings/applications/page.test.tsx' \
  'src/app/(shell)/settings/downloadclients/page.test.tsx' \
  'src/app/(shell)/settings/connect/page.test.tsx' \
  'src/app/(shell)/settings/tags/page.test.tsx' \
  'src/app/(shell)/settings/general/page.test.tsx' \
  'src/app/(shell)/settings/ui/page.test.tsx' \
  'src/app/(shell)/system/status/page.test.tsx' \
  'src/app/(shell)/system/tasks/page.test.tsx' \
  'src/app/(shell)/system/backup/page.test.tsx' \
  'src/app/(shell)/system/updates/page.test.tsx' \
  'src/app/(shell)/system/events/page.test.tsx' \
  'src/app/(shell)/system/logs/files/page.test.tsx'
```

Result: **170/170 tests passed**.

## Parity Matrix

- **Indexers**: Implemented and functional.
- **Search**: Implemented and functional.
- **History**: Implemented and functional.
- **Settings**: Implemented for all major sections; General/UI now dedicated pages and saveable.
- **System**: Implemented and functional across status/tasks/backup/updates/events/logs.
- **Real-time**: In progress. Added indexer lifecycle and command lifecycle event contracts and cache invalidation wiring.
- **Keyboard shortcuts**: In progress. Added shortcut registry, help modal, and save shortcuts.

## Reuse Strategy Applied

Rather than reimplementing new systems, this pass extended existing monolith infrastructure:

- Reused existing SSE event client and cache bridge (`eventsApi`, `useEventsCacheBridge`) for Prowlarr lifecycle events.
- Reused existing shell keydown handling and command palette to add shortcut modal/save shortcut behavior.
- Reused existing settings pages by wiring a generic global save event to page-local save actions.

## Gaps Closed In This Session

1. **Realtime event parity wiring**
   - Added event contracts and listeners for:
     - `indexer:added`
     - `indexer:updated`
     - `indexer:deleted`
     - `indexer:healthChanged`
     - `command:started`
     - `command:completed`
   - Added cache invalidation for impacted query slices (indexers, health, system status, tasks).

2. **Keyboard shortcut parity wiring**
   - Added shortcut registry (`Cmd/Ctrl+K`, `?`, `Esc`, `Cmd/Ctrl+S`).
   - Added keyboard shortcuts help modal in AppShell.
   - Added `Cmd/Ctrl+S` save behavior for:
     - `/settings/general`
     - `/settings/ui`

3. **Realtime connection visibility**
   - Added shell status indicator (`Realtime: Idle/Connecting/Reconnecting/Live/Offline`) driven by event client connection state.

## Remaining Major Parity Work

1. **Responsive hardening (Phase 9.2)**
   - Explicit mobile column-hiding/touch-gesture coverage still pending.

2. **Theme system completion (Phase 9.4)**
   - Baseline theme + color-impaired toggles are in place; full parity sweep for accessibility theme behavior is still pending.

3. **Performance optimization (Phase 9.5)**
   - Virtualization/code-splitting specific work remains open.

4. **Phase 10 E2E and final docs**
   - Dedicated E2E flows and final integration documentation remain open.

## Files Added/Updated For This Audit Pass

- `app/src/lib/api/eventsApi.ts`
- `app/src/lib/api/eventsApi.test.ts`
- `app/src/lib/events/useEventsCacheBridge.ts`
- `app/src/lib/events/useEventsCacheBridge.test.tsx`
- `app/src/lib/shortcuts.ts`
- `app/src/components/shell/AppShell.tsx`
- `app/src/components/shell/app-shell.test.tsx`
- `app/src/app/(shell)/settings/general/page.tsx`
- `app/src/app/(shell)/settings/general/page.test.tsx`
- `app/src/app/(shell)/settings/ui/page.tsx`
- `app/src/app/(shell)/settings/ui/page.test.tsx`
