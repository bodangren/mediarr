# Implementation Plan: Monolith Unification Refactor

## Phase 1: Backend Pruning (The "Un-Prowlarr" Phase)
> **Goal:** Remove microservice artifacts from the monolith. Destroy `AppProfile` and `Application` sync constructs.

- [x] Task: Clean up Prisma Schema 8b69484
    - [ ] Sub-task: Drop `Application` and `AppProfile` models from `schema.prisma`.
    - [ ] Sub-task: Remove `appProfileId` from `Indexer`. Add `supportedMediaTypes` (JSON or simple String array) to `Indexer` if necessary for filtering.
    - [ ] Sub-task: Run Prisma migration and write data-preserving migration script if necessary.
- [x] Task: Delete Sync API Routes and Services 663beb9
    - [ ] Sub-task: Delete `/api/applications` route and associated controllers/services.
    - [ ] Sub-task: Delete `/api/profiles/app` route and associated controllers/services.
    - [ ] Sub-task: Remove tests specific to app sync and profiles.
- [ ] Task: Rewire Domain Search Services
    - [ ] Sub-task: Update TV Search Controller to inject and invoke `SearchAggregationService` directly.
    - [ ] Sub-task: Update Movie Search Controller to inject and invoke `SearchAggregationService` directly.
    - [ ] Sub-task: Verify tests for domain search logic against the refactored endpoints.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Global UI Navigation Consolidation
> **Goal:** Replace the sprawling app-specific sidebar with a single unified hierarchy.

- [ ] Task: Restructure Sidebar Layout
    - [ ] Sub-task: Delete/Deprecate the Prowlarr, Sonarr, Radarr, and Bazarr specific layout files or sidebar components.
    - [ ] Sub-task: Create unified `Sidebar` component.
    - [ ] Sub-task: Wire Dashboard, Library (Movies/TV), Calendar, Activity, Settings, and System links.
- [ ] Task: Consolidate Route Structure (App Router)
    - [ ] Sub-task: Move relevant page components to the new simplified route tree (e.g., `/library/movies`, `/library/tv`, `/settings/indexers`).
    - [ ] Sub-task: Delete obsolete sub-app route groups if they exist.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Unified Settings Interface
> **Goal:** Consolidate isolated domain settings pages into a single global settings interface.

- [ ] Task: Unify Indexer & Client Settings
    - [ ] Sub-task: Build/move single `Indexers` settings page. Ensure CRUD operations interact with the global `Indexer` model.
    - [ ] Sub-task: Build/move single `Download Clients` settings page.
- [ ] Task: Unify Media Management Settings
    - [ ] Sub-task: Combine TV and Movie naming conventions onto a single `Media Management` page.
    - [ ] Sub-task: Combine Root Folder configuration.
- [ ] Task: Unify Quality & Profiles
    - [ ] Sub-task: Combine Quality Definitions, Custom Formats, and Quality Profiles onto a single `Profiles` settings page.
- [ ] Task: Unify Subtitle Settings
    - [ ] Sub-task: Move subtitle provider and specific rules (hi-tags, etc.) to a unified `Subtitles` settings page.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)