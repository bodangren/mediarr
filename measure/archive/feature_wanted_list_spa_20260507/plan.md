# Wanted List Dashboard (SPA) Plan

## Phase 1: Backend API Contract & Tests

- [x] Audit existing `/api/wanted*` or `/api/missing*` endpoints for current surface
- [x] Design `GET /api/movies/missing` — paginated, filterable (monitored)
- [x] Design `GET /api/episodes/missing` — paginated, filterable (seriesId, season, monitored)
- [x] Design `POST /api/wanted/search-all` — already exists for bulk auto-search
- [x] Write unit tests for missing routes with mock database responses (server workspace)
- [x] Run tests — RED (endpoints don't exist yet)

## Phase 2: Backend Implementation

- [x] Implement `GET /api/movies/missing` with Prisma queries for missing movies
- [x] Implement `GET /api/episodes/missing` with Prisma queries joining episodes → series
- [x] Use existing `POST /api/wanted/search-all` for bulk auto-search
- [x] Add query param validation via Fastify schema
- [x] Wire new routes into Fastify server (movieRoutes.ts + seriesRoutes.ts)
- [x] Run server tests — GREEN

## Phase 3: Frontend Components (TDD)

- [x] Write component tests for `WantedPage` — renders rows, tab switching, pagination, search, monitored toggle (15 tests)
- [x] Implement `WantedPage` with inline Movies/Episodes tables, pagination, and actions
- [x] Run component tests — GREEN

## Phase 4: Page Integration & Routing

- [x] Create `WantedPage.tsx` with Movies / Episodes tabs
- [x] Add `/wanted` route to React Router
- [x] Add sidebar navigation link
- [x] Wire API hooks to new endpoints (`wantedApi.listMissingMovies`, `mediaApi.listMissingEpisodes`)
- [x] Integrate existing `WantedMovieRow` and search triggers for per-item manual search
- [x] Write integration test: route mount → API call → render → filter → re-fetch
- [x] Run integration tests — GREEN

## Phase 5: Polish & Verification

- [x] Manual smoke test: component tests verify load, tab switch, pagination, search, monitored toggle
- [x] Verify responsive layout: tables use overflow-x-auto for horizontal scroll
- [x] Run key app tests — no regressions (pre-existing subtitle test failure unrelated)
- [x] Run `npm run build --workspace=app` — clean
- [x] Commit and push
