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

- [ ] Create `DownloadList.tsx` component with sortable table
- [ ] Implement `TorrentRow.tsx` with progress bar, speeds, ETA display
- [ ] Add `TorrentControls.tsx` for pause/resume/remove/priority buttons
- [ ] Create `BulkActions.tsx` for batch selection and operations
- [ ] Implement sort/filter/search controls above the list
- [ ] Add CSS styles for download list with responsive design
- [ ] Wire up SSE listener for real-time speed/progress updates

## Phase 3: Integration & Testing

- [ ] Connect DownloadList to API via TanStack Query
- [ ] Add optimistic updates for pause/resume/remove actions
- [ ] Implement download list in Queue screen or as new tab
- [ ] Add unit tests for torrent row rendering and control actions
- [ ] Add integration test for download list with mocked API
- [ ] Test mobile layout and touch interactions
- [ ] Manual smoke test: verify real-time updates with active download
