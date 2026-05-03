# Dashboard Statistics & Analytics Plan

## Phase 1: Backend Statistics API [x]

- [x] Extend existing `statsRoutes.ts` with additional endpoints
- [x] `GET /api/system/stats` already provides library stats (totalMovies, totalSeries, totalEpisodes, monitored counts, file sizes, quality breakdown, missing items, activity counts)
- [x] Implement `GET /api/stats/downloads` - torrent counts, active/completed/failed, total downloaded/uploaded bytes, average speed
- [x] Implement `GET /api/stats/system` - DB size, uptime, disk space
- [x] Add unit tests for download and system stats endpoints (15 tests total, all green)
- [x] Endpoints already wired into Fastify server via existing `registerStatsRoutes`

## Phase 2: Frontend Statistics Dashboard

- [ ] Install Chart.js as project dependency
- [ ] Create `StatisticsDashboard.tsx` as main stats page
- [ ] Implement `LibraryStats.tsx` with pie chart for genre distribution
- [ ] Implement `DownloadStats.tsx` with bar charts for indexer performance
- [ ] Implement `SystemHealth.tsx` with disk usage and status indicators
- [ ] Add date range picker component for filtering
- [ ] Create responsive grid layout for stat cards
- [ ] Add loading states and error handling for stats fetches

## Phase 3: Integration & Polish

- [ ] Add statistics route to React Router configuration
- [ ] Create navigation link to statistics dashboard
- [ ] Implement export functionality (JSON/CSV download)
- [ ] Add unit tests for stats chart components
- [ ] Add integration test for full statistics flow
- [ ] Optimize chart rendering for large datasets
- [ ] Manual smoke test: verify charts render correctly with sample data
