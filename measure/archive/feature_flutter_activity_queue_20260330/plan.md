# Implementation Plan: Flutter Activity & Queue

## Phase 1 — Queue & History Screens

- [x] Task: Add `getTorrents()`, `getActivity()`, `pauseTorrent(hash)`, `resumeTorrent(hash)`, `removeTorrent(hash, deleteData)` methods to `ApiClient`
- [x] Task: Create `ActivityScreen` with `TabBar` — Queue tab and History tab
- [x] Task: Implement Queue tab — list of active torrents with progress bar, speed, ETA, media poster; each item tappable for detail sheet
- [x] Task: Implement History tab — chronological list of activity events with icon/type, title, timestamp
- [x] Task: Add `ActivityScreen` to router at `/activity` and to `LeanbackScaffold` nav
- [x] Task: Write tests for `ActivityScreen` — renders both tabs, shows items, handles empty state
- [x] Task: Measure - Checkpoint Phase 1

## Phase 2 — Detail Sheet & Actions

- [x] Task: Create `QueueItemDetailSheet` — torrent metadata (name, hash, progress, speed, seeders, peers), associated media info, action buttons (pause/resume/remove)
- [x] Task: Wire action buttons to `ApiClient` torrent methods; show confirmation dialog for remove; update UI on success
- [x] Task: Write tests for `QueueItemDetailSheet` — renders metadata, action buttons call API, remove shows confirmation
- [x] Task: Measure - Checkpoint Phase 2

## Phase 3 — Real-Time SSE Updates

- [x] Task: Implement SSE client in `ApiClient` — connect to server SSE stream, listen for `torrent:stats` and `activity:new` events
- [x] Task: Wire SSE events to `ActivityScreen` state — update progress bars and list in real-time without manual refresh
- [x] Task: Write tests for SSE integration — mock SSE stream, verify UI updates on events
- [x] Task: Run `cd clients/mediarr-client && flutter test` — all pass (183 tests)
- [x] Task: Measure - Checkpoint Phase 3
