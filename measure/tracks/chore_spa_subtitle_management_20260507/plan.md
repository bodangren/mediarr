# SPA Subtitle Management Parity Plan

## Phase 1: Backend API Audit & Contract

- [x] Audit existing subtitle-related tables in Drizzle schema
- [x] Audit existing subtitle API endpoints (if any) in server routes
- [x] Design `GET /api/movies/:id/subtitles` — list subtitle files for a movie
- [x] Design `GET /api/episodes/:id/subtitles` — list subtitle files for an episode
- [x] Design `POST /api/subtitles/search` — search external providers by mediaId + type (movie/episode)
- [x] Design `POST /api/subtitles/download` — download selected subtitle and link to media
- [x] Design `DELETE /api/subtitles/:id` — delete subtitle file and DB record
- [x] Write unit tests for delete endpoint (server workspace)
- [x] Run tests — GREEN (53 subtitle tests passing)

## Phase 2: Backend Implementation

- [x] Implement inventory endpoints using Drizzle relational queries
- [x] Implement search endpoint integrating with existing subtitle provider clients
- [x] Implement download endpoint: fetch from provider, save to disk, create DB record, link to media
- [x] Implement delete endpoint: unlink from media, delete file, remove DB record
- [x] Add zod request validation for search/download params
- [x] Wire routes into Fastify server
- [x] Run server tests — GREEN

## Phase 3: Frontend Components (TDD)

- [x] Write tests for `SubtitleTrackList` — renders rows, delete triggers callback
- [x] Write tests for `ManualSearchModal` — search input, results list, download action
- [x] Implement `SubtitleTrackList` using shadcn Table with action dropdowns
- [x] Implement `ManualSearchModal` with search form + result list
- [x] Implement `LanguageBadge` component
- [x] Implement subtitle coverage utilities
- [x] Run component tests — GREEN

## Phase 4: Detail Page Integration

- [x] Add subtitle section to `MovieDetailPage`
- [x] Add subtitle section to `SeriesDetailPage`
- [x] Wire "Search Subtitles" button to open `ManualSearchModal`
- [x] Connect delete action to mutation with toast feedback
- [x] Connect download action to mutation with inventory reload
- [x] Add season-level subtitle search
- [x] Add episode-level subtitle management

## Phase 5: Verification & Cross-Platform Parity

- [~] Compare SPA subtitle flow against Flutter subtitle flow for feature parity gaps
- [~] Ensure wanted languages from `/api/settings` are pre-selected in search modal
- [ ] Manual smoke test: search, download, and delete subtitles for both movie and episode
- [ ] Run `CI=true npm test` — full suite green
- [ ] Run `npm run build --workspace=app` — clean
- [ ] Commit and push
