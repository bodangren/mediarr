# Implementation Plan: Streaming Settings Panel & DB-backed Configuration

## Phase 1: Settings Model & Persistence
- [x] Task: Add `streaming` settings model to backend settings types/defaults.
- [x] Task: Extend Prisma `AppSettings` with `streaming` JSON column and migration.
- [x] Task: Update repository mapping/create/update/replace logic for `streaming`.
- [x] Task: Add/adjust repository tests for defaults and persistence merge behavior.

## Phase 2: API & Runtime Wiring
- [x] Task: Extend `/api/settings` PATCH schema/validation to include `streaming`.
- [x] Task: Extend frontend settings API schema/types to include `streaming`.
- [x] Task: Wire `PlaybackService` to use DB-backed default user id and watched threshold.
- [x] Task: Wire discovery startup to use DB-backed discovery settings.
- [x] Task: Add/update API/service tests for new runtime behavior.

## Phase 3: Settings UI Panel
- [x] Task: Add `SettingsStreamingPage` in SPA settings routes.
- [x] Task: Add `/settings/streaming` navigation entry and breadcrumb label.
- [x] Task: Implement form load/save states and validation hints.
- [x] Task: Add/update frontend tests for route presence and save payload.
- [x] Task: Run targeted tests for changed server/app files.
- [x] Task: Conductor - User Manual Verification 'Streaming Settings Panel' (deferred to end-of-track)
