# Implementation Plan: Prowlarr Feature Parity

## Phase 1: Search Execution (Critical Path)
> **NO CROSS-TRACK DEPENDENCIES** — this phase is the critical path that unblocks Sonarr Phase 1 and Radarr Phase 2 interactive search.
> **SOFT DEPENDENCY**: Per-indexer error reporting in search response benefits from `cross_cutting_parity Phase 4` resilience improvements, but is not blocked by it.

- [x] Task: Build Search Aggregation Backend
    - [x] Sub-task: Write tests — verify `POST /api/releases/search` queries all enabled indexers and aggregates results.
    - [x] Sub-task: Write tests — verify search handles indexer timeouts gracefully (30s max).
    - [x] Sub-task: Write tests — verify deduplication by info hash.
    - [x] Sub-task: Write tests — verify multi-type search (generic, tvsearch, movie, music, book) passes correct params to indexers.
    - [x] Sub-task: Implement SearchAggregationService: iterate enabled indexers, call `search()` in parallel with Promise.allSettled, normalize results, deduplicate by infoHash.
    - [x] Sub-task: Wire `POST /api/releases/search` to SearchAggregationService (replace stub response).
    - [x] Sub-task: Add pagination support (offset/limit) to search results.
    - [x] Sub-task: Add indexer-specific error reporting in response (which indexers failed and why).
- [x] Task: Build Release Grab Backend
    - [x] Sub-task: Write tests — verify `POST /api/releases/grab` sends torrent to download client and creates history event.
    - [x] Sub-task: Write tests — verify grab handles magnet links and .torrent URLs.
    - [x] Sub-task: Wire `POST /api/releases/grab` to: resolve download client, add torrent/nzb, record history event.
    - [x] Sub-task: Support download client selection param (use default if not specified).
- [x] Task: Complete Search Page UI
    - [x] Sub-task: Write tests — verify search form executes query and displays results.
    - [x] Sub-task: Write tests — verify grab button sends release to download client with toast feedback.
    - [x] Sub-task: Wire search form submission to `POST /api/releases/search`.
    - [x] Sub-task: Display results table: title, indexer, size, seeders/peers, age, category, protocol.
    - [x] Sub-task: Add grab button per release calling `POST /api/releases/grab`.
    - [x] Sub-task: Add download client selector dropdown (optional, defaults to primary).
    - [x] Sub-task: Add pagination controls for results.
    - [x] Sub-task: Add sort controls (seeders, size, age).
    - [x] Sub-task: Add filter controls (indexer, category, quality).
- [x] Task: Build Advanced Query Parameter Modal
    - [x] Sub-task: Write tests — verify modal renders type-specific fields and passes to search.
    - [x] Sub-task: Create QueryParameterModal: type-specific fields (TV: season/episode/TVDB ID; Movie: IMDB ID/year; Music: artist/album; Book: author/title).
    - [x] Sub-task: Wire modal output to search form params.
- [x] Task: Build Release Override Modal
    - [x] Sub-task: Write tests — verify override modal allows manual category/quality assignment.
    - [x] Sub-task: Create ReleaseOverrideModal: manual title, category, quality, language override.
    - [x] Sub-task: Wire overridden values to grab request.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: App Profiles, Application Integration & Notifications
> **SOFT DEPENDENCY**: Notification provider dynamic forms benefit from `cross_cutting_parity Phase 4` DynamicForm conditional field rendering. Can proceed with static forms first.

- [x] Task: Build App Profiles Backend
    - [x] Sub-task: Write tests — verify CRUD for app profiles (create, read, update, delete).
    - [x] Sub-task: Write tests — verify profile clone duplicates all fields with new name.
    - [x] Sub-task: Add Prisma model: AppProfile (id, name, enableRss, enableInteractiveSearch, enableAutomaticSearch, minimumSeeders).
    - [x] Sub-task: Run migration.
    - [x] Sub-task: Implement `GET/POST/PUT/DELETE /api/profiles/app` endpoints.
    - [x] Sub-task: Implement `POST /api/profiles/app/:id/clone` endpoint.
    - [x] Sub-task: Add appProfileId foreign key to Indexer model, run migration.
- [x] Task: Build App Profiles Settings UI
    - [x] Sub-task: Write tests — verify profiles page renders list with CRUD operations.
    - [x] Sub-task: Create `/settings/profiles` page (or extend existing).
    - [x] Sub-task: List profiles with edit/clone/delete actions.
    - [x] Sub-task: Create/edit modal: name, RSS toggle, interactive search toggle, auto search toggle, min seeders input.
    - [x] Sub-task: Wire all operations to API.
    - [x] Sub-task: Add profile selector to indexer add/edit modal.
- [x] Task: Build Application Integration Backend
    - [x] Sub-task: Write tests — verify CRUD for application configs.
    - [x] Sub-task: Write tests — verify test endpoint validates connectivity.
    - [x] Sub-task: Write tests — verify sync endpoint pushes indexer config to application.
    - [x] Sub-task: Add Prisma model: Application (id, name, type, baseUrl, apiKey, syncCategories, tags).
    - [x] Sub-task: Run migration.
    - [x] Sub-task: Implement `GET/POST/PUT/DELETE /api/applications` endpoints.
    - [x] Sub-task: Implement `POST /api/applications/:id/test` — validate URL/key.
    - [x] Sub-task: Implement `POST /api/applications/sync` — push indexer configs to applications.
- [x] Task: Build Application Integration Settings UI
    - [x] Sub-task: Write tests — verify applications page renders with CRUD and test.
    - [x] Sub-task: Create `/settings/applications` page (or section).
    - [x] Sub-task: List applications with edit/delete/test actions.
    - [x] Sub-task: Create/edit modal: name, type, base URL, API key, sync categories.
    - [x] Sub-task: Wire test button to test endpoint.
    - [x] Sub-task: Add "Sync All" button calling sync endpoint.
- [x] Task: Verify & Extend Notification Configuration
    - [x] Sub-task: Write tests — verify notification CRUD works end-to-end.
    - [x] Sub-task: Write tests — verify test notification delivers.
    - [x] Sub-task: Verify existing `notificationRoutes.ts` supports full CRUD and test.
    - [x] Sub-task: Add any missing provider schemas (Discord, Slack, Telegram, Email, Webhook).
    - [x] Sub-task: Build/verify Settings > Notifications UI page with provider list, add/edit/delete, test button.
    - [x] Sub-task: Dynamic form generation from notification provider schema.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Persistence, Cloning, Filters & Info

- [x] Task: Persist Proxy Settings to Database
    - [x] Sub-task: Write tests — verify proxy CRUD API stores/retrieves from DB.
    - [x] Sub-task: Add Prisma model: Proxy (id, name, type, hostname, port, username, password).
    - [x] Sub-task: Run migration.
    - [x] Sub-task: Implement `GET/POST/PUT/DELETE /api/settings/proxies` endpoints.
    - [x] Sub-task: Update frontend proxy management to use API instead of localStorage.
    - [x] Sub-task: Add migration utility to import existing localStorage proxies on first load.
- [x] Task: Persist Category Settings to Database
    - [x] Sub-task: Write tests — verify category CRUD API stores/retrieves from DB.
    - [x] Sub-task: Add Prisma model: IndexerCategory (id, name, minSize, maxSize).
    - [x] Sub-task: Run migration.
    - [x] Sub-task: Implement `GET/POST/PUT/DELETE /api/settings/categories` endpoints.
    - [x] Sub-task: Seed default categories on first boot.
    - [x] Sub-task: Update frontend category management to use API instead of localStorage.
- [x] Task: Implement Indexer Cloning
    - [x] Sub-task: Write tests — verify clone creates duplicate with "(Copy)" suffix.
    - [x] Sub-task: Implement `POST /api/indexers/:id/clone` — copy all fields, append "(Copy)" to name, save as new.
    - [x] Sub-task: Add "Clone" button to indexer row actions in UI.
- [x] Task: Implement Custom Filters
    - [x] Sub-task: Write tests — verify filter CRUD and application to indexer list.
    - [x] Sub-task: Add Prisma model: CustomFilter (id, name, type, conditions JSON).
    - [x] Sub-task: Run migration.
    - [x] Sub-task: Implement `GET/POST/PUT/DELETE /api/filters/custom` endpoints.
    - [x] Sub-task: Build filter dropdown on indexer list: saved filters list, create/edit filter modal.
    - [x] Sub-task: Filter conditions: protocol, enabled status, capabilities, priority range, tags.
    - [x] Sub-task: Apply selected filter to indexer list query.
- [x] Task: Build Indexer Info Modal & Capabilities Display
    - [x] Sub-task: Write tests — verify capabilities display in indexer table and info modal.
    - [x] Sub-task: Add capability badges to indexer table rows (RSS, Search, Privacy, Protocol).
    - [x] Sub-task: Build IndexerInfoModal: full details, capabilities, categories, health history.
    - [x] Sub-task: Add "Info" button to indexer row actions.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
