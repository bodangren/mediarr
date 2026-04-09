# Implementation Plan: Setup Wizard

## Phase 1 — Server: Setup Detection & API

- [x] Task: Add `setupCompleted` boolean field to `AppSettings` (Prisma schema migration or JSON settings key)
- [x] Task: Create `server/src/routes/setupRoutes.ts` with `GET /api/setup/status` — check if root folders exist AND at least one indexer configured AND `setupCompleted !== true`; return `{ isConfigured, completedSteps }`
- [x] Task: Add `POST /api/setup/complete` — set `setupCompleted: true` in AppSettings
- [x] Task: Register `setupRoutes` in `createApiServer.ts`
- [x] Task: Ensure all GET endpoints return empty/defaults gracefully when system is unconfigured (no 500s on empty libraries, missing root folders)
- [x] Task: Write tests for `GET /api/setup/status` — fresh install returns `isConfigured: false`, configured system returns `true`, after POST complete returns `true`
- [x] Task: Conductor - Checkpoint Phase 1

## Phase 2 — SPA: Setup Wizard UI

- [x] Task: Create `app/src/pages/SetupWizardPage.tsx` — multi-step wizard with step indicator, back/next buttons, and 5 steps (Welcome, Root Folders, Indexers, Quality, Done)
- [x] Task: Implement Step 1 (Welcome) — welcome text + "Just Work" button that auto-fills defaults and skips to Step 5
- [x] Task: Implement Step 2 (Root Folders) — two path inputs pre-filled with `/data/media/movies` and `/data/media/tv`; uses existing `FilesystemBrowser` component for path selection
- [x] Task: Implement Step 3 (Indexers) — show top 5 Cardigann definitions with one-click add; optional API key input per indexer
- [x] Task: Implement Step 4 (Quality Profile) — radio list of existing quality profiles, pre-select first
- [x] Task: Implement Step 5 (Done) — success message, "Go to Dashboard" button calls `POST /api/setup/complete` then navigates to `/dashboard`
- [x] Task: Add route guard in `App.tsx` — if `GET /api/setup/status` returns `isConfigured: false`, redirect to `/setup`; skip if already on `/setup`
- [x] Task: Write tests for `SetupWizardPage` — renders all 5 steps, "Just Work" auto-fills, step navigation, completion redirects to dashboard
- [x] Task: Run `cd app && npm run build` — zero TS errors
- [x] Task: Run `CI=true npm test` — all tests pass
- [x] Task: Conductor - Checkpoint Phase 2
