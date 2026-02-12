# Backend Parity Findings (Phase 2)

## Scope
- Runtime mode: `live_api_runtime` against `http://127.0.0.1:3901`
- Evidence report: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/backend-probe-report.json`

## Capability Classification

| Capability ID | Parity Status | Severity | Confidence | Evidence Type | Key Evidence |
| --- | --- | --- | --- | --- | --- |
| `prowlarr.indexer.definition-ingestion` | `REGRESSION` | `P0` | `high` | verified | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/definition-wiring-probe.txt`, `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/indexer-cardigann-test-body.v2.json`, `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/release-search-body.v2.json` |
| `prowlarr.indexer.contract-shape` | `PARTIAL_IMPLEMENTATION` | `P1` | `high` | verified | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/indexer-create-invalid-body.v2.json`, `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/indexer-create-valid-body.v2.json`, `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/indexer-test-body.v2.json` |
| `sonarr.metadata.tv-search` | `MISSING` | `P1` | `medium` | verified | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/metadata-tv-search-body.v2.json` |
| `radarr.metadata.movie-search` | `MISSING` | `P0` | `high` | verified + inferred | verified: `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/metadata-movie-search-body.v2.json`; inferred: TMDB upstream behavior variability |
| `core.release.search-grab-side-effects` | `PARTIAL_IMPLEMENTATION` | `P1` | `high` | verified | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/release-search-body.v2.json`, `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/release-grab-body.v2.json`, `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/activity-after-grab-body.v2.json` |
| `bazarr.variant.subtitle-operations` | `PARTIAL_IMPLEMENTATION` | `P1` | `high` | verified | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/subtitles-search-missing-ids-body.json`, `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/subtitles-search-movie-multi-variant-body.json` |

## Core Mismatches

1. **Definition loader/runtime factory disconnect**
- Runtime factory starts with zero definitions while loader can parse available definitions.
- Cardigann indexer test/search fails with `Definition not found`, breaking indexer parity and release search workflows.

2. **Metadata provider readiness gap**
- TV search returns upstream 404 through API (no resilience/fallback).
- Movie search path fails with TMDB invalid key and default fallback key (`demo`) when key is missing.

3. **Contract normalization inconsistency**
- `POST /api/indexers` rejects object `settings` with `INTERNAL_ERROR` instead of normalized validation envelope.
- Subtitle multi-variant ambiguity returns `INTERNAL_ERROR` instead of deterministic validation class.

4. **Release workflow split behavior**
- Direct `grab` route has queue + activity side effects.
- Search+grab end-to-end path is unstable because definition-backed indexers can crash search.

## Top P0/P1 Blockers (Immediate)

### P0
1. `prowlarr.indexer.definition-ingestion`
- Blocking effect: indexer/runtime wiring failure propagates to release search failures.
- Candidate remediation track: `track9-followup-prowlarr-definition-runtime`.

2. `radarr.metadata.movie-search`
- Blocking effect: movie add/search flow cannot reliably retrieve metadata at runtime.
- Candidate remediation track: `track9-followup-metadata-provider-hardening`.

### P1
1. `prowlarr.indexer.contract-shape`
- Major impairment: non-definition-driven payload model and error normalization mismatch.

2. `core.release.search-grab-side-effects`
- Major impairment: side effects work only for direct grab; full search workflow is brittle.

3. `sonarr.metadata.tv-search`
- Major impairment: upstream failures surface as hard runtime failures.

4. `bazarr.variant.subtitle-operations`
- Major impairment: ambiguous variant selection raises internal error class rather than actionable validation error.

## Verification Boundary
- **Verified:** all HTTP response captures under `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/` and the deterministic probe outputs in `backend-probe-report.json`.
- **Inferred:** comparative parity interpretation versus source clone behavior where source runtime was not executed in this repository session.
