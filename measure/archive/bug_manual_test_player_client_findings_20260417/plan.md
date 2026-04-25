# Implementation Plan: Manual Test Findings and Player-First Client Debugging

## Phase 1 — Reproduce and Instrument Manual Failures

- [x] Task: Capture reproducible commands and UI steps for the April 17 failures.
- [x] Task: Add targeted logging or temporary diagnostics for movie search and TV add paths.
- [x] Task: Verify setup/database seed state used by the manual smoke pass.
- [x] Task: Document baseline API responses for `/api/search`, TV add, movie add, `/api/events/stream`, and discovery endpoints.
- [x] Task: Measure - Checkpoint Phase 1

## Phase 2 — Movie Search and TV Add Fixes

- [x] Task: Write failing regression tests for movie search returning zero results when provider data is available.
- [x] Task: Fix movie search routing/provider handling without regressing TV search.
- [x] Task: Write failing regression tests for TV show add foreign-key constraint failure.
- [x] Task: Fix TV add persistence so required related rows exist before insert, or validate cleanly before database write.
- [x] Task: Run `CI=true npm test`.
- [x] Task: Measure - Checkpoint Phase 2

## Phase 3 — Flutter Discovery and SSE Contract

- [x] Task: Write or update Flutter discovery tests for same-machine/manual-localhost behavior.
- [x] Task: Fix Flutter automatic discovery where supported, preserving manual URL fallback.
- [x] Task: Decide canonical torrent SSE event name and update server/client/docs to match.
- [x] Task: Add SSE contract coverage for torrent stats and activity events.
- [x] Task: Run `cd clients/mediarr-client && flutter test`.
- [x] Task: Measure - Checkpoint Phase 3

## Phase 4 — Player-First Flutter Shell Decision

- [x] Task: Audit current Flutter screens and navigation against the media-player-first product goal.
- [x] Task: Draft the target player-first navigation model and identify which admin surfaces should be secondary.
- [x] Task: Update or create follow-on Measure work for Home/Continue Watching/default-route changes.
- [x] Task: Record manual verification notes from the Flutter client after the decision.
- [x] Task: Measure - Checkpoint Phase 4
