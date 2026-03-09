# Plan: Library Statistics & Analytics Dashboard

## Phase 1: Backend — Stats API Endpoint
- [ ] Create `server/src/api/routes/statsRoutes.ts` with `GET /api/system/stats`
- [ ] Implement Prisma aggregations for library counts, file sizes, quality breakdown, missing counts
- [ ] Implement activity counts from ActivityEvent model (or fallback query)
- [ ] Register `registerStatsRoutes` in `server/src/api/createApiServer.ts`
- [ ] Write `server/src/api/routes/statsRoutes.test.ts` with ≥5 test cases

## Phase 2: Frontend — Stats API Client & Page
- [ ] Create `app/src/lib/api/statsApi.ts` with Zod schema and typed client
- [ ] Register `statsApi` in `app/src/lib/api/client.ts`
- [ ] Create `app/src/components/system/StatsPage.tsx` with full analytics UI
- [ ] Add `/system/stats` route to `app/src/App.tsx`
- [ ] Add "Statistics" nav item to `app/src/lib/navigation.ts` under System section
- [ ] Write `app/src/components/system/StatsPage.test.tsx` with mock data tests

## Phase 3: Verification & Delivery
- [ ] Run server tests: `cd server && CI=true npx vitest run statsRoutes`
- [ ] Run app tests: `cd app && CI=true npx vitest run StatsPage`
- [ ] Run full app build: `cd app && npm run build`
- [ ] Commit all changes with model attribution
- [ ] Archive track to `conductor/archive/`
- [ ] Update `conductor/tracks.md`
- [ ] Update `README.md` with new stats feature
