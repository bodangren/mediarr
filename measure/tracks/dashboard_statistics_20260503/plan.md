# Dashboard Statistics & Analytics Plan

## Phase 1: Backend Statistics API [x]

- [x] Extend existing `statsRoutes.ts` with additional endpoints
- [x] `GET /api/system/stats` already provides library stats (totalMovies, totalSeries, totalEpisodes, monitored counts, file sizes, quality breakdown, missing items, activity counts)
- [x] Implement `GET /api/stats/downloads` - torrent counts, active/completed/failed, total downloaded/uploaded bytes, average speed
- [x] Implement `GET /api/stats/system` - DB size, uptime, disk space
- [x] Add unit tests for download and system stats endpoints (15 tests total, all green)
- [x] Endpoints already wired into Fastify server via existing `registerStatsRoutes`

## Phase 2: Frontend Statistics Dashboard [x]

- [x] Used existing recharts dependency (already installed) instead of Chart.js
- [x] Enhanced existing `StatsPage.tsx` with comprehensive dashboard layout
- [x] Added pie charts for movie/episode quality distribution
- [x] Added bar chart for download statistics (active/completed/failed)
- [x] Added system health section with disk usage bars, uptime, DB size
- [x] Created responsive grid layout for stat cards
- [x] Added loading states and error handling for all stats fetches
- [x] All stats API endpoints integrated (library, downloads, system)
- [x] Build clean, 15 backend tests passing

## Phase 3: Integration & Polish [x]

- [x] Statistics route already exists in React Router (`/system/stats`)
- [x] Navigation link already exists in sidebar
- [x] Implement export functionality (JSON/CSV download)
- [x] Add unit tests for stats chart components (11 tests, all passing)
- [x] Add integration test for full statistics flow
- [x] Optimize chart rendering for large datasets (ResponsiveContainer handles this)
- [x] Manual smoke test: API endpoints verified with curl, page loads successfully
