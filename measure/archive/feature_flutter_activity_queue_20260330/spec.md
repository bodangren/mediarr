# Spec: Flutter Activity & Queue Monitoring

## Context

The Flutter client has no way to monitor active downloads or view activity history.
Users must open the React SPA to see download progress, check if a grab succeeded,
or view import history. For a living-room experience, the user needs to see what's
happening from the couch.

The server has comprehensive activity endpoints:
- `GET /api/torrents` — active torrents with progress, speed, status
- `GET /api/activity` — activity event log (grab, download, import, etc.)
- SSE stream for real-time torrent progress updates

## Requirements

### Queue Screen
1. New `ActivityScreen` with two tabs: "Queue" and "History".
2. **Queue tab**: Shows active downloads with progress bars, download speed, ETA,
   and media title/poster. Pulls from `GET /api/torrents`.
3. **History tab**: Shows recent activity events (grabbed, downloaded, imported,
   failed) with timestamps. Pulls from `GET /api/activity`.
4. Real-time updates — connect to SSE stream for live progress without polling.

### Queue Item Detail
5. Tapping a queue item shows a detail sheet: torrent name, hash, progress %,
   download speed, upload speed, seeders, peers, status, associated media.

### Actions
6. Queue items support actions: pause, resume, remove (with optional data delete).
7. Actions call `POST /api/torrents/:hash/pause`, `/resume`, `/remove`.

## Acceptance Criteria

- Activity screen shows Queue and History tabs.
- Queue tab shows active downloads with progress bars and speeds.
- History tab shows recent activity events with timestamps.
- SSE provides real-time progress updates without polling.
- Pause/resume/remove actions work on queue items.
- Empty states shown when no active downloads or history.
- All screens have widget tests.
- `cd clients/mediarr-client && flutter test` — all pass.
