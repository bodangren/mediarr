# Spec: Prowlarr Feature Parity

## Overview

Close all remaining gaps between the Prowlarr reference application and mediarr's indexer management capabilities. The gap analysis (2026-02-17) identified that core CRUD works but search execution is non-functional, app profiles are missing, notifications aren't configured, proxy/category settings aren't persisted, and several UI features are absent.

## Functional Requirements

### FR-1: Search Execution (Critical)
- Make the search page functional: queries must actually execute against configured indexers.
- Multi-type search support: generic, TV (tvsearch), movie, music, book.
- Display real release results with: title, indexer, size, seeders/peers, age, quality, category.
- Grab/download trigger per release (send to download client).
- Download client selection per release.
- Release override/matching modal for manual category/quality assignment.
- Advanced query parameter modal (QueryParameterModal equivalent).
- Pagination of search results.
- Backend: Wire `POST /api/releases/search` to iterate configured indexers, aggregate results, return normalized releases. `POST /api/releases/grab` to send release to download client.

### FR-2: App Profiles / Sync Profiles
- Full CRUD for app sync profiles (create, edit, clone, delete).
- Profile defines: name, enable RSS, enable interactive search, enable automatic search, minimum seeders.
- Assign profiles to indexers.
- Settings > Profiles page.
- Backend: `GET/POST/PUT/DELETE /api/profiles/app`, schema for AppProfile model.

### FR-3: Application Integration
- Configure connected applications (Sonarr, Radarr, etc. — in mediarr's case, internal modules).
- Test connectivity to applications.
- Sync indexers to applications.
- Settings > Applications page with CRUD.
- Backend: `GET/POST/PUT/DELETE /api/applications`, `POST /api/applications/:id/test`, `POST /api/applications/sync`.

### FR-4: Notification Provider Configuration
- Configure notification providers (email, webhook, Discord, Slack, Telegram, etc.).
- Dynamic form generation from provider schema.
- Test notification delivery.
- Settings > Notifications page.
- Backend: `GET/POST/PUT/DELETE /api/notifications`, `POST /api/notifications/:id/test`. (Note: notificationRoutes.ts already exists — verify and extend.)

### FR-5: Backend Persistence for Proxy & Category Settings
- Move proxy configuration from localStorage to database.
- Move custom category configuration from localStorage to database.
- Backend: `GET/POST/PUT/DELETE /api/settings/proxies`, `GET/POST/PUT/DELETE /api/settings/categories`.
- Prisma schema: add Proxy and Category models.

### FR-6: Indexer Cloning
- Add "Clone" action to indexer context menu.
- Clone creates a copy with name suffixed "(Copy)" and all settings duplicated.
- Backend: `POST /api/indexers/:id/clone`.

### FR-7: Custom Filters
- Create, edit, delete named filter definitions for the indexer list.
- Filters define conditions on: protocol, status, capabilities, priority, tags.
- Apply saved filters from a dropdown on the indexer list page.
- Backend: `GET/POST/PUT/DELETE /api/filters/custom`.

### FR-8: Indexer Info Modal & Capabilities Display
- Show capabilities (RSS support, search support, privacy, protocol) in the main indexer table.
- Indexer info modal showing full details: capabilities, categories, settings, health history.

## Non-Functional Requirements

- Search must aggregate results from all enabled indexers within 30 seconds.
- Search results must be deduplicated by info hash where possible.
- All new endpoints must have >80% test coverage.
- Proxy settings must be encrypted at rest (passwords).

## Acceptance Criteria

1. Search page executes real queries against indexers and displays paginated results.
2. User can grab a release from search results and send to download client.
3. App profiles can be created, edited, cloned, and deleted; assigned to indexers.
4. Application integrations can be configured and tested.
5. Notification providers can be configured, tested, and deliver alerts.
6. Proxy and category settings persist to database (not localStorage).
7. Indexers can be cloned.
8. Custom filters can be saved and applied to indexer list.
9. Indexer table shows capabilities; info modal shows full details.

## Out of Scope

- SignalR real-time updates (SSE covers push needs).
- Multi-instance Prowlarr federation.
- Newznab/Torznab schema endpoint for external consumers.
