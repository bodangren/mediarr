# Implementation Plan: Monolith Unification Refactor

## Phase 1: Backend Pruning (The "Un-Prowlarr" Phase)
> **Goal:** Remove microservice artifacts from the monolith. Destroy `AppProfile` and `Application` sync constructs.

- [x] Task: Clean up Prisma Schema 8b69484
    - [x] Sub-task: Drop `Application` and `AppProfile` models from `schema.prisma`.
    - [x] Sub-task: Remove `appProfileId` from `Indexer`. Add `supportedMediaTypes` (JSON or simple String array) to `Indexer` if necessary for filtering.
    - [x] Sub-task: Run Prisma migration and write data-preserving migration script if necessary.
- [x] Task: Delete Sync API Routes and Services 663beb9
    - [x] Sub-task: Delete `/api/applications` route and associated controllers/services.
    - [x] Sub-task: Delete `/api/profiles/app` route and associated controllers/services.
    - [x] Sub-task: Remove tests specific to app sync and profiles.
- [x] Task: Rewire Domain Search Services
    - [x] Sub-task: Update TV Search Controller to inject and invoke `SearchAggregationService` directly.
    - [x] Sub-task: Update Movie Search Controller to inject and invoke `SearchAggregationService` directly.
    - [x] Sub-task: Verify tests for domain search logic against the refactored endpoints.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Global UI Navigation Consolidation
> **Goal:** Replace the sprawling app-specific sidebar with a single unified hierarchy.

- [x] Task: Restructure Sidebar Layout
    - [x] Sub-task: Delete/Deprecate the Prowlarr, Sonarr, Radarr, and Bazarr specific layout files or sidebar components.
    - [x] Sub-task: Create unified `Sidebar` component.
    - [x] Sub-task: Wire Dashboard, Library (Movies/TV), Calendar, Activity, Settings, and System links.
- [x] Task: Consolidate Route Structure (App Router)
    - [x] Sub-task: Move relevant page components to the new simplified route tree (e.g., `/library/movies`, `/library/tv`, `/settings/indexers`).
    - [x] Sub-task: Delete obsolete sub-app route groups if they exist.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Unified Settings Interface
> **Goal:** Consolidate isolated domain settings pages into a single global settings interface.

- [x] Task: Unify Indexer & Client Settings
    - [x] Sub-task: Build/move single `Indexers` settings page. Ensure CRUD operations interact with the global `Indexer` model.
    - [x] Sub-task: Build/move single `Download Clients` settings page.
- [x] Task: Unify Media Management Settings
    - [x] Sub-task: Combine TV and Movie naming conventions onto a single `Media Management` page.
    - [x] Sub-task: Combine Root Folder configuration.
- [x] Task: Unify Quality & Profiles
    - [x] Sub-task: Combine Quality Definitions, Custom Formats, and Quality Profiles onto a single `Profiles` settings page.
- [x] Task: Unify Subtitle Settings
    - [x] Sub-task: Move subtitle provider and specific rules (hi-tags, etc.) to a unified `Subtitles` settings page.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
