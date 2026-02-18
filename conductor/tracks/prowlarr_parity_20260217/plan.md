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
    - [ ] Sub-task: Add download client selector dropdown (optional, defaults to primary).
    - [x] Sub-task: Add pagination controls for results.
    - [x] Sub-task: Add sort controls (seeders, size, age).
    - [ ] Sub-task: Add filter controls (indexer, category, quality).
- [ ] Task: Build Advanced Query Parameter Modal
    - [ ] Sub-task: Write tests — verify modal renders type-specific fields and passes to search.
    - [ ] Sub-task: Create QueryParameterModal: type-specific fields (TV: season/episode/TVDB ID; Movie: IMDB ID/year; Music: artist/album; Book: author/title).
    - [ ] Sub-task: Wire modal output to search form params.
- [ ] Task: Build Release Override Modal
    - [ ] Sub-task: Write tests — verify override modal allows manual category/quality assignment.
    - [ ] Sub-task: Create ReleaseOverrideModal: manual title, category, quality, language override.
    - [ ] Sub-task: Wire overridden values to grab request.
- [~] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) - PENDING

## Phase 2: App Profiles, Application Integration & Notifications - PENDING
> **SOFT DEPENDENCY**: Notification provider dynamic forms benefit from `cross_cutting_parity Phase 4` DynamicForm conditional field rendering. Can proceed with static forms first.

- [ ] Task: Build App Profiles Backend
    - [ ] Sub-task: Write tests — verify CRUD for app profiles (create, read, update, delete).
    - [ ] Sub-task: Write tests — verify profile clone duplicates all fields with new name.
    - [ ] Sub-task: Add Prisma model: AppProfile (id, name, enableRss, enableInteractiveSearch, enableAutomaticSearch, minimumSeeders).
    - [ ] Sub-task: Run migration.
    - [ ] Sub-task: Implement `GET/POST/PUT/DELETE /api/profiles/app` endpoints.
    - [ ] Sub-task: Implement `POST /api/profiles/app/:id/clone` endpoint.
    - [ ] Sub-task: Add appProfileId foreign key to Indexer model, run migration.
- [ ] Task: Build App Profiles Settings UI
    - [ ] Sub-task: Write tests — verify profiles page renders list with CRUD operations.
    - [ ] Sub-task: Create `/settings/profiles` page (or extend existing).
    - [ ] Sub-task: List profiles with edit/clone/delete actions.
    - [ ] Sub-task: Create/edit modal: name, RSS toggle, interactive search toggle, auto search toggle, min seeders input.
    - [ ] Sub-task: Wire all operations to API.
    - [ ] Sub-task: Add profile selector to indexer add/edit modal.
- [ ] Task: Build Application Integration Backend
    - [ ] Sub-task: Write tests — verify CRUD for application configs.
    - [ ] Sub-task: Write tests — verify test endpoint validates connectivity.
    - [ ] Sub-task: Write tests — verify sync endpoint pushes indexer config to application.
    - [ ] Sub-task: Add Prisma model: Application (id, name, type, baseUrl, apiKey, syncCategories, tags).
    - [ ] Sub-task: Run migration.
    - [ ] Sub-task: Implement `GET/POST/PUT/DELETE /api/applications` endpoints.
    - [ ] Sub-task: Implement `POST /api/applications/:id/test` — validate URL/key.
    - [ ] Sub-task: Implement `POST /api/applications/sync` — push indexer configs to applications.
- [ ] Task: Build Application Integration Settings UI
    - [ ] Sub-task: Write tests — verify applications page renders with CRUD and test.
    - [ ] Sub-task: Create `/settings/applications` page (or section).
    - [ ] Sub-task: List applications with edit/delete/test actions.
    - [ ] Sub-task: Create/edit modal: name, type, base URL, API key, sync categories.
    - [ ] Sub-task: Wire test button to test endpoint.
    - [ ] Sub-task: Add "Sync All" button calling sync endpoint.
- [ ] Task: Verify & Extend Notification Configuration
    - [ ] Sub-task: Write tests — verify notification CRUD works end-to-end.
    - [ ] Sub-task: Write tests — verify test notification delivers.
    - [ ] Sub-task: Verify existing `notificationRoutes.ts` supports full CRUD and test.
    - [ ] Sub-task: Add any missing provider schemas (Discord, Slack, Telegram, Email, Webhook).
    - [ ] Sub-task: Build/verify Settings > Notifications UI page with provider list, add/edit/delete, test button.
    - [ ] Sub-task: Dynamic form generation from notification provider schema.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) - PENDING

## Phase 3: Persistence, Cloning, Filters & Info - PENDING

- [ ] Task: Persist Proxy Settings to Database
    - [ ] Sub-task: Write tests — verify proxy CRUD API stores/retrieves from DB.
    - [ ] Sub-task: Add Prisma model: Proxy (id, name, type, hostname, port, username, password).
    - [ ] Sub-task: Run migration.
    - [ ] Sub-task: Implement `GET/POST/PUT/DELETE /api/settings/proxies` endpoints.
    - [ ] Sub-task: Update frontend proxy management to use API instead of localStorage.
    - [ ] Sub-task: Add migration utility to import existing localStorage proxies on first load.
- [ ] Task: Persist Category Settings to Database
    - [ ] Sub-task: Write tests — verify category CRUD API stores/retrieves from DB.
    - [ ] Sub-task: Add Prisma model: IndexerCategory (id, name, minSize, maxSize).
    - [ ] Sub-task: Run migration.
    - [ ] Sub-task: Implement `GET/POST/PUT/DELETE /api/settings/categories` endpoints.
    - [ ] Sub-task: Seed default categories on first boot.
    - [ ] Sub-task: Update frontend category management to use API instead of localStorage.
- [ ] Task: Implement Indexer Cloning
    - [ ] Sub-task: Write tests — verify clone creates duplicate with "(Copy)" suffix.
    - [ ] Sub-task: Implement `POST /api/indexers/:id/clone` — copy all fields, append "(Copy)" to name, save as new.
    - [ ] Sub-task: Add "Clone" button to indexer row actions in UI.
- [ ] Task: Implement Custom Filters
    - [ ] Sub-task: Write tests — verify filter CRUD and application to indexer list.
    - [ ] Sub-task: Add Prisma model: CustomFilter (id, name, type, conditions JSON).
    - [ ] Sub-task: Run migration.
    - [ ] Sub-task: Implement `GET/POST/PUT/DELETE /api/filters/custom` endpoints.
    - [ ] Sub-task: Build filter dropdown on indexer list: saved filters list, create/edit filter modal.
    - [ ] Sub-task: Filter conditions: protocol, enabled status, capabilities, priority range, tags.
    - [ ] Sub-task: Apply selected filter to indexer list query.
- [ ] Task: Build Indexer Info Modal & Capabilities Display
    - [ ] Sub-task: Write tests — verify capabilities display in indexer table and info modal.
    - [ ] Sub-task: Add capability badges to indexer table rows (RSS, Search, Privacy, Protocol).
    - [ ] Sub-task: Build IndexerInfoModal: full details, capabilities, categories, health history.
    - [ ] Sub-task: Add "Info" button to indexer row actions.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) - PENDING
