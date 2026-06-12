# Plan: MSW Mock Coverage for Backend Routes

## How to add MSW handlers

All handlers go in `app/src/lib/msw/handlers.ts`. The file uses `http` from `msw` and returns `HttpResponse.json()`.

### Pattern

```ts
// In handlers.ts array:
http.get('/api/example', () => {
  return HttpResponse.json({ data: [/* mock */] });
}),
http.post('/api/example', async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json({ id: 1, ...body });
}),
```

For parameterized routes: `http.get('/api/example/:id', ({ params }) => { ... })`

---

## Phase S1: Core domain MSW handlers

> **Red-phase status (2026-06-12, mid-attempt-2):** 18 missing endpoints identified via
> `build-graph search /api/... --type=route`. Failing tests for the gaps live in
> `app/src/lib/msw/handlers.s1.test.ts`. Run only the new test file with:
> `npx vitest run --config app/vitest.config.ts app/src/lib/msw/handlers.s1.test.ts`
> The full `CI=true npm test --workspace=app` suite times out at 900s (12+ min)
> due to pre-existing failures in unrelated suites — do NOT run the full suite
> in the Red phase.

- [x] Read `app/src/lib/msw/handlers.ts` to understand current structure
- [~] Add handlers for movie routes:
  - `GET /api/movies` — return mock movie list *(exists)*
  - `GET /api/movies/:id` — return single mock movie *(exists)*
  - `POST /api/movies` — return created movie *(MISSING — Red test in handlers.s1.test.ts)*
  - `PUT /api/movies/:id` — return updated movie *(MISSING)*
  - `DELETE /api/movies/:id` — return 200 *(exists)*
  - `PATCH /api/movies/:id/monitored` — return updated monitored state *(exists)*
  - `GET /api/movies/missing` — return missing movies list *(exists)*
  - `GET /api/movies/root-folders` — return root folders *(MISSING)*
  - `POST /api/movies/import/scan` — return scan results *(MISSING)*
  - `POST /api/movies/import/apply` — return import results *(MISSING)*
  - `PUT /api/movies/bulk` — return bulk update result *(MISSING)*
- [~] Add handlers for series routes:
  - `GET /api/series` — return mock series list *(exists)*
  - `GET /api/series/:id` — return single mock series *(exists)*
  - `DELETE /api/series/:id` — return 200 *(exists)*
  - `PATCH /api/series/:id/monitored` — return updated *(exists)*
  - `GET /api/series/root-folders` — return root folders *(MISSING)*
  - `GET /api/episodes/missing` — return missing episodes *(MISSING)*
  - `POST /api/series/import/scan` — return scan results *(MISSING)*
  - `POST /api/series/import/apply` — return import results *(MISSING)*
  - `PUT /api/series/bulk` — return bulk update result *(MISSING)*
- [~] Add handlers for indexer routes (some already exist, add missing):
  - `GET /api/indexers/catalog` — return catalog entries *(MISSING)*
  - `GET /api/indexers/detect` — return detected services *(MISSING)*
  - `GET /api/indexers/schema/:configContract` — return schema fields *(MISSING)*
  - `POST /api/indexers/test` — return test result *(exists)*
  - `POST /api/indexers/:id/test` — return test result *(exists)*
  - `POST /api/indexers/:id/clone` — return cloned indexer *(MISSING)*
  - `POST /api/indexers/catalog/:id/add` — return added indexer *(MISSING)*
  - `POST /api/indexers/catalog/reload` — return 200 *(MISSING)*
  - `POST /api/indexers/import-from/:type` — return import result *(MISSING)*
- [ ] Run `npx vitest run --config app/vitest.config.ts app/src/lib/msw/handlers.s1.test.ts` — expect RED for 18 missing handlers, GREEN for the 9 that exist
- [ ] Commit: `test(msw): add core domain MSW handlers (movies, series, indexers)`

## Phase S2: Settings & config MSW handlers

- [ ] Add handlers for settings routes:
  - `GET /api/settings` — return full settings object
  - `PATCH /api/settings` — return updated settings
  - `GET /api/settings/media` — return media settings
  - `PUT /api/settings/media` — return updated media settings
  - `GET /api/settings/categories` — return categories
  - `POST /api/settings/categories` — return created category
  - `PUT /api/settings/categories/:id` — return updated category
  - `DELETE /api/settings/categories/:id` — return 200
  - `GET /api/settings/proxies` — return proxies
  - `POST /api/settings/proxies` — return created proxy
  - `PUT /api/settings/proxies/:id` — return updated proxy
  - `DELETE /api/settings/proxies/:id` — return 200
- [ ] Add handlers for quality profile routes:
  - `GET /api/quality-profiles` — return profiles
  - `GET /api/quality-profiles/:id` — return single profile
  - `POST /api/quality-profiles` — return created profile
  - `PUT /api/quality-profiles/:id` — return updated profile
  - `DELETE /api/quality-profiles/:id` — return 200
  - `GET /api/quality-definitions` — return definitions
- [ ] Add handlers for download client routes:
  - `GET /api/download-client` — return config
  - `PUT /api/download-client` — return updated config
- [ ] Run `CI=true npm test` — expect GREEN
- [ ] Commit: `test(msw): add settings & config MSW handlers`

## Phase S3: System & operations MSW handlers

- [ ] Add handlers for system routes:
  - `GET /api/system/status` — return system status
  - `GET /api/system/events` — return events list
  - `GET /api/system/events/export` — return export blob
  - `DELETE /api/system/events/clear` — return 200
  - `GET /api/tasks/queued` — return queued tasks
  - `GET /api/tasks/scheduled` — return scheduled tasks
  - `GET /api/tasks/history` — return task history
  - `GET /api/tasks/history/:id` — return single task
  - `POST /api/tasks/scheduled/:taskId/run` — return 202
  - `DELETE /api/tasks/queued/:taskId` — return 200
- [ ] Add handlers for operations routes:
  - `GET /api/activity` — return activity events
  - `DELETE /api/activity` — return 200
  - `GET /api/activity/export` — return export blob
  - `GET /api/health` — return health status
  - `PATCH /api/activity/:id/fail` — return 200
  - `POST /api/activity/:id/retry-import` — return 202
- [ ] Add handlers for stats routes:
  - `GET /api/system/stats` — return system stats
  - `GET /api/stats/downloads` — return download stats
  - `GET /api/stats/system` — return system stats
- [ ] Run `CI=true npm test` — expect GREEN
- [ ] Commit: `test(msw): add system & operations MSW handlers`

## Phase S4: Subtitle & playback MSW handlers

- [ ] Add handlers for subtitle routes:
  - `GET /api/subtitles/wanted/movies` — return wanted movies
  - `GET /api/subtitles/wanted/series` — return wanted series
  - `GET /api/subtitles/wanted/count` — return count
  - `POST /api/subtitles/search` — return search results
  - `POST /api/subtitles/download` — return download result
  - `GET /api/subtitles/history` — return history
  - `GET /api/subtitles/history/stats` — return stats
  - `DELETE /api/subtitles/history` — return 200
  - `GET /api/subtitles/providers` — return providers
  - `GET /api/subtitles/providers/:id` — return single provider
  - `PUT /api/subtitles/providers/:id` — return updated
  - `POST /api/subtitles/providers/:id/test` — return test result
  - `POST /api/subtitles/providers/:id/reset` — return 200
  - `GET /api/subtitles/blacklist/movies` — return blacklist
  - `GET /api/subtitles/blacklist/series` — return blacklist
  - `DELETE /api/subtitles/blacklist/:id` — return 200
  - `DELETE /api/subtitles/blacklist/movies` — return 200
  - `DELETE /api/subtitles/blacklist/series` — return 200
- [ ] Add handlers for playback routes:
  - `GET /api/playback/continue-watching` — return continue watching items
  - `GET /api/playback/:id` — return playback manifest
  - `POST /api/playback/progress` — return 200
  - `GET /api/playback/subtitles/:trackId` — return subtitle track
  - `GET /api/stream/:id` — return stream response
- [ ] Run `CI=true npm test` — expect GREEN
- [ ] Commit: `test(msw): add subtitle & playback MSW handlers`

## Phase S5: Remaining domains

- [ ] Add handlers for backup routes:
  - `GET /api/backups` — return backups list
  - `POST /api/backups` — return created backup
  - `DELETE /api/backups/:id` — return 200
  - `POST /api/backups/:id/restore` — return 200
  - `POST /api/backups/:id/download` — return blob
  - `GET /api/backups/schedule` — return schedule
  - `PATCH /api/backups/schedule` — return updated schedule
- [ ] Add handlers for blocklist routes:
  - `GET /api/blocklist` — return blocklist
  - `DELETE /api/blocklist/:id` — return 200
  - `DELETE /api/blocklist/clear` — return 200
  - `DELETE /api/blocklist/remove` — return 200
- [ ] Add handlers for calendar route:
  - `GET /api/calendar` — return calendar items
- [ ] Add handlers for collection routes:
  - `GET /api/collections` — return collections
  - `GET /api/collections/:id` — return single collection
  - `POST /api/collections` — return created
  - `PUT /api/collections/:id` — return updated
  - `DELETE /api/collections/:id` — return 200
  - `POST /api/collections/:id/search` — return search results
  - `POST /api/collections/:id/sync` — return sync result
- [ ] Add handlers for custom format routes:
  - `GET /api/custom-formats` — return formats
  - `GET /api/custom-formats/:id` — return single format
  - `GET /api/custom-formats/schema` — return schema
  - `POST /api/custom-formats` — return created
  - `PUT /api/custom-formats/:id` — return updated
  - `DELETE /api/custom-formats/:id` — return 200
  - `POST /api/custom-formats/:id/test` — return test result
- [ ] Add handlers for import list routes:
  - `GET /api/import-lists` — return lists
  - `GET /api/import-lists/:id` — return single list
  - `POST /api/import-lists` — return created
  - `PUT /api/import-lists/:id` — return updated
  - `DELETE /api/import-lists/:id` — return 200
  - `POST /api/import-lists/:id/sync` — return sync result
  - `GET /api/import-lists/exclusions` — return exclusions
  - `POST /api/import-lists/exclusions` — return created
  - `DELETE /api/import-lists/exclusions/:id` — return 200
  - `GET /api/import-lists/providers` — return providers
- [ ] Add handlers for remaining routes:
  - `GET /api/logs/files` — return log files
  - `GET /api/logs/files/:filename` — return log content
  - `GET /api/logs/files/:filename/download` — return blob
  - `DELETE /api/logs/files/:filename` — return 200
  - `POST /api/logs/files/:filename/clear` — return 200
  - `GET /api/updates/available` — return update info
  - `GET /api/updates/check` — return check result
  - `GET /api/updates/current` — return current version
  - `GET /api/updates/history` — return update history
  - `POST /api/updates/check` — return check result
  - `POST /api/updates/download` — return download result
  - `POST /api/updates/install` — return install result
  - `GET /api/dashboard/disk-space` — return disk space
  - `GET /api/dashboard/upcoming` — return upcoming items
  - `GET /api/notifications/push-status` — return push status
  - `GET /api/setup/status` — return setup status
  - `POST /api/setup/complete` — return 200
  - `GET /api/filesystem` — return filesystem entries
  - `GET /api/images/proxy` — return proxied image
  - `GET /api/search` — return search results
  - `GET /api/media/library` — return library
  - `GET /api/media/wanted` — return wanted items
  - `POST /api/media/search` — return search results
  - `POST /api/wanted` — return 200
  - `POST /api/wanted/search-all` — return 202
  - `POST /api/library/scan` — return 202
  - `POST /api/releases/search` — return search results
  - `POST /api/releases/grab` — return grab result
  - `POST /api/import/scan` — return scan results
  - `POST /api/import/execute` — return execution results
  - `POST /api/import/search` — return search results
  - `POST /api/import/backfill-posters` — return 200
  - `POST /api/torrents` — return added torrent
  - `POST /api/torrents/bulk` — return bulk result
  - `POST /api/torrents/:infoHash/retry-import` — return 200
  - `PATCH /api/torrents/:infoHash/priority` — return 200
- [ ] Run `CI=true npm test` — full suite GREEN
- [ ] Commit: `test(msw): add remaining domain MSW handlers`

## Phase S6: Verification & Handoff

- [ ] Run `CI=true npm test` — full suite GREEN
- [ ] Verify no unhandled MSW warnings in test output
- [ ] Update `tech-debt.md` — mark "MSW mock coverage incomplete" as Resolved
- [ ] Final commit and push
