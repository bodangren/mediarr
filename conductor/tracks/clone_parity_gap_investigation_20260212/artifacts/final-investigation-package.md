# Final Investigation Package (Track 9)

## Consolidated Counts

### Backend Parity Matrix
- Status counts:
  - `REGRESSION`: 1
  - `MISSING`: 2
  - `PARTIAL_IMPLEMENTATION`: 3
  - `SCAFFOLDED_ONLY`: 2
- Severity counts:
  - `P0`: 2
  - `P1`: 6

### Frontend Surface Classification
- `partially_functional`: 7
- `scaffold_only`: 2
- `placeholder`: 1

## Top Blockers
1. `prowlarr.indexer.definition-ingestion` (`P0`, high confidence)
2. `radarr.metadata.movie-search` (`P0`, high confidence)
3. `core.release.search-grab-side-effects` (`P1`, high confidence)
4. `bazarr.variant.subtitle-operations` (`P1`, high confidence)

## Evidence Index
- Backend findings: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/backend-findings.md`
- Frontend findings: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/frontend-findings.md`
- Validation findings: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/validation-findings.md`
- Gap register: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/gap-register.json`
- Remediation backlog: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/remediation-backlog.json`
- Track realignment recommendations: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/track-realignment-recommendations.md`
- Runtime evidence (backend): `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/`
- Runtime evidence (frontend): `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/`
- Command log: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/command-log.md`

## First Remediation Sprint Recommendation

### Scope
- `RMB-001` Restore definition runtime wiring.
- `RMB-002` Harden metadata provider key/upstream behavior.
- `RMB-003` Normalize indexer contract payload/validation.

### Success Criteria
1. `release search` succeeds with a definition-backed indexer and no `Definition not found` failure.
2. `/api/media/search` movie path succeeds with configured TMDB key and fails with normalized actionable error when missing.
3. Indexer create/update validation returns stable validation envelopes for malformed payloads.
4. Parity matrix updates move targeted findings from `P0/P1` to lower severities with new runtime evidence.

## Hardening Gate Recommendation
- Track 7F must remain blocked until hardening gate `GATE-7F-PARITY-CRITICAL` in `remediation-backlog.json` is fully satisfied.
