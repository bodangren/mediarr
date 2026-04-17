# Spec: Manual Test Findings and Player-First Client Debugging

## Overview

The April 17 manual smoke pass confirmed that Mediarr loads, setup works, dashboard/system/statistics pages work, movie and series pages load, settings pages load, queue/history pages load, the SSE endpoint emits events, and the Flutter client can connect manually to the local server.

The same pass exposed five issues that need a focused debugging track:

1. Movie search returns zero results while TV search works.
2. Adding a TV show fails with `Failed to add FOREIGN KEY constraint failed`.
3. The Flutter client cannot automatically locate the server on the same machine, although manual `localhost` configuration works.
4. The Activity & Queue plan/spec references `torrent:progress`, but the live SSE stream emits `torrent:stats`.
5. The Flutter client currently feels like a native server administration UI instead of a media-player-first living-room client.

## Requirements

### Search and Add Reliability

- Diagnose why movie search returns zero results when TV search returns results.
- Verify whether the issue is frontend query construction, backend media-type routing, metadata provider behavior, or seed/setup state.
- Diagnose the TV add failure and identify the exact missing or invalid foreign-key relationship.
- Fix the root cause without weakening referential integrity.
- Add regression tests for both movie search and TV add flows.

### Flutter Discovery Reliability

- Diagnose why the Flutter client cannot discover the server automatically on the same machine.
- Validate behavior for Linux desktop, Android emulator/device, and manual localhost entry where feasible.
- Preserve manual server URL entry as a fallback.
- Add focused tests around discovery adapter/provider behavior where practical.

### SSE Contract Alignment

- Determine the canonical torrent update event name.
- Align the server event, Flutter client listener, and Conductor Activity & Queue plan/spec wording.
- Add a regression test or contract check that prevents future `torrent:progress` vs. `torrent:stats` drift.

### Player-First Flutter UX

- Reassess the Flutter client information architecture against the product definition: it should be a cross-platform media player for Android TV, Linux desktop, and macOS, not a full replacement for the server SPA.
- Define the player-first shell target:
  - Home/Continue Watching as the default post-discovery route.
  - Movies/Series/library browsing optimized for playback.
  - Search/Add and Activity/Queue as secondary surfaces.
  - Settings limited to client/server connection and playback-relevant options.
- Identify which existing screens should remain, move lower in navigation, or defer to the SPA.
- Produce implementation tasks before changing broad navigation behavior.

## Acceptance Criteria

- Movie search returns expected movie results for the same smoke-test environment where TV search works.
- Adding a TV show succeeds or returns a clear validation error before database write; no raw foreign-key error reaches the UI.
- Flutter automatic discovery works for the supported local-network scenario, or the limitation is explicitly documented with a tested fallback.
- SSE event naming is consistent across server, Flutter client, tests, and Conductor docs.
- A concrete player-first Flutter shell plan exists before further admin-oriented Flutter feature work proceeds.
- Relevant automated tests pass:
  - `CI=true npm test`
  - `cd clients/mediarr-client && flutter test`
- Manual verification notes are captured in the track before closure.

## Out of Scope

- Rebuilding the deprecated Kotlin Android TV app.
- Adding authentication or changing the trusted-LAN security model.
- Implementing subtitle/quality-control Flutter features before the player-first shell decision is resolved.
- Large server SPA redesigns unrelated to the manual test failures.
