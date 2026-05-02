# Dashboard Statistics & Analytics Plan

## Phase 1: Backend Statistics API

- [ ] Create `statisticsRoutes.ts` with stats aggregation endpoints
- [ ] Implement `GET /api/stats/library` - movie/episode counts, storage, genres
- [ ] Implement `GET /api/stats/downloads` - success rates, indexer performance, bandwidth
- [ ] Implement `GET /api/stats/system` - DB size, disk space, uptime, torrent counts
- [ ] Add date range query parameter support for historical data
- [ ] Implement efficient SQL aggregations for large libraries
- [ ] Add unit tests for each stats endpoint
- [ ] Wire stats routes into main.ts Fastify server

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
