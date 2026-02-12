# Validation Integrity Findings (Phase 4)

## Primary Evidence
- `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/validation-integrity-report.json`
- `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/validation-integrity-summary.md`

## High-Risk False-Confidence Zones

1. **Add-media surface (`mockRatio=1.0`)**
- Risk: unit/UI tests can pass while runtime metadata integration fails (`TMDB` key/runtime prerequisites).
- Impact: frontend appears functional but core add workflow breaks at runtime.

2. **Library surfaces (`mockRatio=1.0`)**
- Risk: route/component tests are mock-heavy; import lifecycle parity may be overstated.
- Impact: regressions in real import-state transitions can escape test gates.

3. **Release path split confidence**
- Contract tests and direct-grab runtime probes pass, but release-search runtime path fails under definition wiring.
- Impact: partial success in tests can mask end-to-end workflow failure.

4. **Operations route-group runtime evidence undercount**
- Contract coverage exists for activity/settings, but analyzer route-group evidence is sparse without explicit operations-prefixed runtime probes.
- Impact: parity claims may rely too heavily on contract tests.

## Minimum Validation Gates for Future Parity Claims

1. Require at least one **non-mocked runtime or integration probe** per clone-critical flow.
2. Require **contract test + runtime probe** pairing for any route that mutates operational state.
3. Block `PARITY_IMPLEMENTED` status when only unit tests exist or when runtime evidence is stale/missing.
4. Require explicit **failure-mode probes** for external dependencies (metadata providers, indexer definitions, auth keys).
5. Require frontend parity claims to include at least one **live route/API walkthrough** artifact per critical surface.

## Additional Required Test Layers by Critical Flow

| Flow | Current Confidence | Missing Layer | Required Additions |
| --- | --- | --- | --- |
| `prowlarr.indexer.definition-ingestion` | high for failure detection | successful integration path | Integration test bootstrapping runtime with non-empty definition set and passing Cardigann search/test |
| `radarr.metadata.movie-search` | high for failure detection | validated-success contract | Runtime probe with valid TMDB key and expected response schema assertions |
| `sonarr.metadata.tv-search` | medium | resilient fallback behavior | Integration test for upstream 404 handling strategy and user-facing error normalization |
| `core.release.search-grab-side-effects` | high partial | full search-to-grab success path | Runtime journey test from wanted search -> candidate list -> grab -> queue -> activity |
| `bazarr.variant.subtitle-operations` | high partial | UI + backend ambiguity handling | Integration/e2e test ensuring variant ambiguity returns normalized validation and actionable UI prompt |
| `core.queue.operations` | medium | frontend control parity | UI/runtime test validating pause/resume/remove controls are present and mapped to endpoints |
| `core.settings.persistence` | medium | stale-state parity | Runtime UI test for stale-state detection and validation error rendering |

## Claim Policy
- Parity status upgrades must respect: `unit` + `contract` + `integration_or_runtime` coverage classes.
- Any missing class keeps status at `PARTIAL_IMPLEMENTATION` or lower regardless of unit pass rate.
