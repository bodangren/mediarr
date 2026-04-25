# Spec: Monolith Unification Refactor

## Overview
Mediarr was originally architected by cloning multiple individual apps (Sonarr, Radarr, Bazarr, Prowlarr) and their siloed concepts. This resulted in unnecessary microservice patterns running within a single monolithic codebase—most notably, treating indexers as distinct application integrations via "App Profiles" and "Application Sync" from Prowlarr to the others. 

This track aims to pivot Mediarr back to a true monolith. We will strip out redundant sync mechanisms, combine siloed settings pages, and establish shared backend services (e.g., global IndexerService) directly consumed by all domains.

## Functional Requirements

### FR-1: Prowlarr Sync Pruning
- Drop `AppProfile` and `Application` models from the database schema entirely.
- Delete backend API routes related to app sync (`/api/applications/sync`, `/api/profiles/app`).
- Remove any frontend UI pages dedicated to managing these "Application Integration" features.
- Update `Indexer` model to remove references to `AppProfile` and simply rely on standard enabling/disabling and an optional global `supportedMediaTypes` filter (e.g. "TV", "Movie", "Both").

### FR-2: Unified Search Execution
- Sonarr (TV) and Radarr (Movie) search flows should be updated to directly call the shared `SearchAggregationService` instead of expecting indexers to be pushed/synced to their local domains.
- Utilize the `cardigann_runtime_parity` implementation for all indexer searches natively.

### FR-3: Unified Navigation Sidebar
- Consolidate the UI menu structure to represent a single, unified media application.
- Top-level items:
  - Dashboard
  - Library (sub-nav for Movies, TV Shows, Collections)
  - Calendar
  - Activity (Queue, History)
  - Settings
  - System (Tasks, Logs, Backup)

### FR-4: Settings Consolidation
- Consolidate domain-specific settings into a unified global `Settings` area:
  - **Media Management:** Naming patterns and root folders for TV and Movies in one place.
  - **Profiles & Quality:** Shared custom formats and quality definitions.
  - **Indexers:** A single, global list of indexers.
  - **Download Clients:** A single global list of download clients.
  - **Notifications:** One set of notification providers.
  - **Subtitles:** Unified Bazarr-like subtitle configuration.

## Non-Functional Requirements
- Maintain existing test coverage for core domain functionality (searching, grabbing, renaming).
- Zero-downtime migration for users transitioning from the split indexer schema to the unified indexer schema. Ensure existing indexers are preserved when dropping `AppProfile`.

## Acceptance Criteria
1. The codebase is free of `AppProfile` and `Application` concepts.
2. Prisma migration correctly drops the deprecated models while preserving `Indexer` data.
3. Radarr/Sonarr interactive search flows call the global `SearchAggregationService` directly and return correct results.
4. The sidebar is reorganized to a single unified view with no "domain-specific" entry points mimicking individual apps.
5. All application settings exist under a single unified Settings hierarchy.

## Out of Scope
- Rewriting core download client integration logic.
- Rewriting core TV/Movie matching algorithms.