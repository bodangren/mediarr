# SPA Subtitle Management Parity Plan

## Phase 1: Backend API Audit & Contract

- [ ] Audit existing subtitle-related tables in Drizzle schema
- [ ] Audit existing subtitle API endpoints (if any) in server routes
- [ ] Design `GET /api/movies/:id/subtitles` — list subtitle files for a movie
- [ ] Design `GET /api/episodes/:id/subtitles` — list subtitle files for an episode
- [ ] Design `POST /api/subtitles/search` — search external providers by mediaId + type (movie/episode)
- [ ] Design `POST /api/subtitles/download` — download selected subtitle and link to media
- [ ] Design `DELETE /api/subtitles/:id` — delete subtitle file and DB record
- [ ] Write unit tests for all endpoints (server workspace)
- [ ] Run tests — expect RED

## Phase 2: Backend Implementation

- [ ] Implement inventory endpoints using Drizzle relational queries
- [ ] Implement search endpoint integrating with existing subtitle provider clients
- [ ] Implement download endpoint: fetch from provider, save to disk, create DB record, link to media
- [ ] Implement delete endpoint: unlink from media, delete file, remove DB record
- [ ] Add zod request validation for search/download params
- [ ] Wire routes into Fastify server
- [ ] Run server tests — expect GREEN

## Phase 3: Frontend Components (TDD)

- [ ] Write tests for `SubtitleInventory` — renders rows, delete triggers callback
- [ ] Write tests for `SubtitleSearchModal` — search input, results list, download action
- [ ] Write tests for `SubtitleSearchResultRow` — displays provider, language, score, download button
- [ ] Write tests for `SubtitleUploadDropzone` — file select triggers upload callback
- [ ] Implement `SubtitleInventory` using shadcn Table with action dropdowns
- [ ] Implement `SubtitleSearchModal` with search form + result list
- [ ] Implement `SubtitleSearchResultRow` with download progress state
- [ ] Implement `SubtitleUploadDropzone` with basic file picker (optional Phase 3 stretch)
- [ ] Run component tests — expect GREEN

## Phase 4: Detail Page Integration

- [ ] Add `SubtitleInventory` section to `MovieDetailPage`
- [ ] Add `SubtitleInventory` section to `EpisodeDetailPage` / `SeriesDetailPage`
- [ ] Wire "Search Subtitles" button to open `SubtitleSearchModal`
- [ ] Connect delete action to mutation with optimistic UI update
- [ ] Connect download action to mutation with optimistic inventory append
- [ ] Write integration test: open movie detail → subtitles load → search → download → inventory updates
- [ ] Run integration tests — expect GREEN

## Phase 5: Verification & Cross-Platform Parity

- [ ] Compare SPA subtitle flow against Flutter subtitle flow for feature parity gaps
- [ ] Ensure wanted languages from `/api/settings` are pre-selected in search modal
- [ ] Manual smoke test: search, download, and delete subtitles for both movie and episode
- [ ] Run `CI=true npm test` — full suite green
- [ ] Run `npm run build --workspace=app` — clean
- [ ] Commit and push
