# Implementation Plan: Flutter Activity & Queue

## Phase 1 — Queue & History Screens

- [ ] Task: Add `getTorrents()`, `getActivity()`, `pauseTorrent(hash)`, `resumeTorrent(hash)`, `removeTorrent(hash, deleteData)` methods to `ApiClient`
- [ ] Task: Create `ActivityScreen` with `TabBar` — Queue tab and History tab
- [ ] Task: Implement Queue tab — list of active torrents with progress bar, speed, ETA, media poster; each item tappable for detail sheet
- [ ] Task: Implement History tab — chronological list of activity events with icon/type, title, timestamp
- [ ] Task: Add `ActivityScreen` to router at `/activity` and to `LeanbackScaffold` nav
- [ ] Task: Write tests for `ActivityScreen` — renders both tabs, shows items, handles empty state
- [ ] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Detail Sheet & Actions

- [ ] Task: Create `QueueItemDetailSheet` — torrent metadata (name, hash, progress, speed, seeders, peers), associated media info, action buttons (pause/resume/remove)
- [ ] Task: Wire action buttons to `ApiClient` torrent methods; show confirmation dialog for remove; update UI on success
- [ ] Task: Write tests for `QueueItemDetailSheet` — renders metadata, action buttons call API, remove shows confirmation
- [ ] Task: Conductor - Checkpoint Phase 2

## Phase 3 — Real-Time SSE Updates

- [ ] Task: Implement SSE client in `ApiClient` — connect to server SSE stream, listen for `torrent:progress` and `activity:new` events
- [ ] Task: Wire SSE events to `ActivityScreen` state — update progress bars and list in real-time without manual refresh
- [ ] Task: Write tests for SSE integration — mock SSE stream, verify UI updates on events
- [ ] Task: Run `cd clients/mediarr-client && flutter test` — all pass
- [ ] Task: Conductor - Checkpoint Phase 3
