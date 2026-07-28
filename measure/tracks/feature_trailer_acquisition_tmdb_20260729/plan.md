> **Track ID:** `feature_trailer_acquisition_tmdb_20260729`
> **Approach:** TDD — write failing tests for fetching, selection, persistence, and API exposure first, then implement.

## Phase 1: TMDB videos fetching

- [ ] Task: Audit how `MetadataProvider` resolves movies/series today and where the TMDB ID is available at resolution time. Evidence: record the call sites and the exact point where a videos fetch can hook in without a second settings lookup.
- [ ] Task: Write Red tests for videos fetching — mock the HTTP layer (follow the existing `MetadataProvider.test.ts` mocking pattern) and assert correct URLs (`/movie/{id}/videos`, `/tv/{id}/videos`), API-key propagation from `settings.apiKeys.tmdbApiKey`, and the missing-key error path matching the existing style.
- [ ] Task: Implement the videos fetch (new method on `MetadataProvider` or a `TrailerService` sibling — decide from the Phase 1 audit) to make the tests Green.
- [ ] Task: Measure — User Manual Verification 'Phase 1'.

## Phase 2: Trailer selection

- [ ] Task: Write Red unit tests over representative TMDB video-list fixtures: official Trailer chosen over Teaser; YouTube preferred over other sites; highest `size` wins within a tier; `published_at` breaks ties; empty list yields `null`; non-Trailer/Teaser types (Behind the Scenes, Clip) are never selected.
- [ ] Task: Implement the pure selection function to make the tests Green. Keep it side-effect free so fixtures alone drive it.
- [ ] Task: Measure — User Manual Verification 'Phase 2'.

## Phase 3: Persistence

- [ ] Task: Write a Red test asserting the media schema carries trailer fields (site, key, name) after migrations run, using the migration runner from `database_migration_strategy_20260713` (additive column(s) only).
- [ ] Task: Generate the additive Drizzle migration and make the schema test Green.
- [ ] Task: Write Red tests that resolving metadata for a movie and a series persists the selected trailer, that re-resolution updates rather than duplicates, and that a `null` selection clears/stays null without error.
- [ ] Task: Implement the persistence wiring in the resolution path to make the tests Green.
- [ ] Task: Measure — User Manual Verification 'Phase 3'.

## Phase 4: API exposure

- [ ] Task: Write Red route tests (integration style, per the `createApiServer` pattern in `dashboard_statistics` lesson) asserting movie and series detail responses include the trailer field, and that items with no trailer return `null` with HTTP 200.
- [ ] Task: Implement the response mapping to make the tests Green.
- [ ] Task: Measure — User Manual Verification 'Phase 4'.

## Phase 5: Client surfacing and verification

- [ ] Task: Surface the trailer on the SPA movie/series detail pages (embed or outbound link from the stored site/key — decide in implementation; no server changes expected).
- [ ] Task: Surface the trailer on the Flutter media detail screen, consistent with the active `feature_flutter_media_detail_20260508` work — coordinate to avoid conflicts.
- [ ] Task: Run the full gates: `CI=true npx vitest run server/src tests`, `CI=true npm test --workspace=app`, `npm run build --workspace=app`, `npx tsc -p server/tsconfig.json --noEmit`. Record results in the Verification section.
- [ ] Task: Measure — User Manual Verification 'Phase 5'.
