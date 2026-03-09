# Plan: Library Statistics & Analytics Dashboard

## Phase 1: Backend — Stats API Endpoint
- [x] Create `server/src/api/routes/statsRoutes.ts` with `GET /api/system/stats`
- [x] Implement Prisma aggregations for library counts, file sizes, quality breakdown, missing counts
- [x] Implement activity counts from ActivityEvent model (or fallback query)
- [x] Register `registerStatsRoutes` in `server/src/api/createApiServer.ts`
- [x] Write `server/src/api/routes/statsRoutes.test.ts` with ≥5 test cases (12 tests written)

## Phase 2: Frontend — Stats API Client & Page
- [x] Create `app/src/lib/api/statsApi.ts` with Zod schema and typed client
- [x] Register `statsApi` in `app/src/lib/api/index.ts`
- [x] Create `app/src/components/system/StatsPage.tsx` with full analytics UI
- [x] Add `/system/stats` route to `app/src/App.tsx`
- [x] Add "Statistics" nav item to `app/src/lib/navigation.ts` under System section
- [x] Write `app/src/components/system/StatsPage.test.tsx` with mock data tests (6 tests)

## Phase 3: Verification & Delivery
- [x] Run server tests: 12/12 passed
- [x] Run app tests: 6/6 passed
- [x] Run Vite build: success (pre-existing tsc errors in unrelated files)
- [x] Commit all changes with model attribution
- [x] Archive track to `conductor/archive/`
- [x] Update `conductor/tracks.md`
- [x] Update `README.md` with new stats feature
