# Implementation Plan: Conductor Housekeeping Cleanup

## Phase 1 — Register and Audit Cleanup Scope

- [x] Task: Create the cleanup track artifacts (`metadata.json`, `spec.md`, `plan.md`, `index.md`) and register the track in `conductor/tracks.md`
- [x] Task: Audit the recent archived-plan anomalies identified in the status review and define the normalization rules for each case
- [ ] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Normalize Governance Artifacts

- [ ] Task: Update the targeted archived plans so stale open or in-progress items are recorded as closed historical outcomes with explicit notes where needed
- [ ] Task: Trim `conductor/lessons-learned.md` to 50 lines or fewer while keeping near-term Mediarr guidance intact
- [ ] Task: Conductor - Checkpoint Phase 2

## Phase 3 — Verify and Archive

- [ ] Task: Run a Conductor status audit and confirm the targeted archived-plan anomalies no longer distort the report
- [ ] Task: Archive the cleanup track, update `conductor/tracks.md`, and set cleanup-track metadata to done
- [ ] Task: Commit the cleanup-track archive state with verification evidence
