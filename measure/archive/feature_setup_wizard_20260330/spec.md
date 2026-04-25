# Spec: Setup Wizard & First-Run Experience

## Context

When Mediarr starts for the first time, it seeds baseline data (quality profiles,
categories, quality definitions) and redirects the user to `/dashboard` with empty
libraries. There is no onboarding, no guidance, no indication that configuration is
needed. A user who opens Mediarr for the first time sees an empty dashboard and must
figure out indexers, root folders, and download paths on their own.

This directly contradicts the zero-config vision. The first-run experience should
detect a fresh install and present a guided setup flow, culminating in a working
system with minimal user input.

## Requirements

### Server — First-Run Detection
1. `GET /api/setup/status` — returns `{ isConfigured: boolean, completedSteps: string[] }`.
   `isConfigured` is false when no root folders exist and no indexers are configured.
2. `POST /api/setup/complete` — marks setup as done (sets a flag in AppSettings).
3. All `GET` endpoints that read media/library return empty gracefully during setup
   (no errors, no 500s).

### SPA — Setup Wizard
4. If `isConfigured === false`, redirect all routes to `/setup` instead of `/dashboard`.
5. `/setup` is a multi-step wizard:
   - **Step 1: Welcome** — "Welcome to Mediarr. Let's get your media server running."
   - **Step 2: Root Folders** — add at least one root folder for movies and one for TV.
     Pre-fill with `/data/media/movies` and `/data/media/tv` (Docker convention).
   - **Step 3: Indexers** — show curated list of popular public indexers (from bundled
       Cardigann definitions). One-click add with optional API key fields.
   - **Step 4: Quality Profile** — select default quality profile (pre-select "Any").
   - **Step 5: Done** — "Mediarr is ready. It will start scanning and searching
       automatically." Button: "Go to Dashboard".
6. **Zero-Config Mode**: A "Just Work" button on Step 1 that auto-fills all steps with
   defaults and completes setup in one click.

### Defaults for Zero-Config Mode
- Root folders: `/data/media/movies`, `/data/media/tv`
- Quality profile: first available (usually "Any")
- Indexers: none (user adds later) or top 3 public indexers if API keys are provided
- Download path: `/data/downloads/complete`

## Acceptance Criteria

- Fresh install redirects to `/setup` wizard.
- Wizard guides through root folders, indexers, quality profile.
- "Just Work" button completes setup with defaults in one click.
- After setup, redirects to `/dashboard` with configured system.
- `GET /api/setup/status` returns `isConfigured: true` after completion.
- Returning to app after setup skips wizard.
- All setup endpoints have tests.
- `CI=true bun test` — all tests pass.
- `cd app && npm run build` — builds clean.
- `CI=true npm test` — all SPA tests pass.
