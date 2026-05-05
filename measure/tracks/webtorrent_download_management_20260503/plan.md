# WebTorrent Download Management UI Plan

## Phase 1: Backend API Endpoints

- [x] Create `torrentRoutes.ts` with comprehensive torrent management endpoints
- [x] Implement `GET /api/torrents` - list all torrents with progress/speed/peers
- [x] Implement `POST /api/torrents/:id/pause` - pause torrent download
- [x] Implement `POST /api/torrents/:id/resume` - resume torrent download
- [x] Implement `DELETE /api/torrents/:id` - remove torrent (with optional data removal query param)
- [x] Implement `PATCH /api/torrents/:id/priority` - update torrent priority
- [x] Add unit tests for each endpoint with mock WebTorrent client (25 tests)
- [x] Wire SSE events for real-time torrent stats updates (pollTorrentStats in createApiServer.ts)

## Phase 2: Frontend Download List

- [x] Enhanced `ActivityQueuePage` with sortable columns (name, progress, seeders, size, speed, ETA)
- [x] Added search by torrent name and filter by status (downloading/seeding/paused/queued/error)
- [x] Implemented row-level pause/resume/remove/retry-import controls
- [x] Added bulk selection with batch pause/resume/retry/remove operations
- [x] Added global speed limits panel (download/upload in KB/s)
- [x] Wired SSE `torrent:stats` events for real-time progress updates with connection indicator
- [x] TypeScript typecheck clean

## Phase 3: Integration & Testing

- [ ] Connect DownloadList to API via TanStack Query
- [ ] Add optimistic updates for pause/resume/remove actions
- [ ] Implement download list in Queue screen or as new tab
- [ ] Add unit tests for torrent row rendering and control actions
- [ ] Add integration test for download list with mocked API
- [ ] Test mobile layout and touch interactions
- [ ] Manual smoke test: verify real-time updates with active download
