# Implementation Plan: Smart Defaults

## Phase 1 — Expanded Baseline Seeding

- [x] Task: Expand `ensureBaselineData()` in server startup to auto-configure: naming patterns (movie + series), RSS sync interval (15 min), wanted search interval (60 min), default subtitle language (English)
- [x] Task: Auto-configure built-in WebTorrent as default download client when no download client exists — set paths to `/data/downloads/incomplete` and `/data/downloads/complete`
- [x] Task: Implement idempotency guard — each auto-config step checks if the setting is already non-default before writing
- [x] Task: Write tests for expanded `ensureBaselineData` — fresh install sets all defaults, existing settings are preserved, re-running is idempotent
- [x] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Settings Inference & Import Behavior

- [ ] Task: Implement root folder type inference — when adding a root folder, infer movie vs series from path convention (`/data/media/movies` → movies, `/data/media/tv` → series); store type in root folder metadata
- [ ] Task: Implement same-volume detection for import behavior — compare `fs.statSync().dev` of source and destination; if same device, default to "move"; if different, default to "copy"
- [ ] Task: Write tests for type inference and volume detection — path conventions, same-volume move, cross-volume copy
- [ ] Task: Conductor - Checkpoint Phase 2

## Phase 3 — Integration & Validation

- [ ] Task: End-to-end test: fresh install → setup wizard "Just Work" → system is fully configured → trigger wanted search → verify search executes with correct naming, paths, and download client
- [ ] Task: Run `CI=true bun test` — all tests pass
- [ ] Task: Conductor - Checkpoint Phase 3
