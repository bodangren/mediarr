# Track Realignment Recommendations (Phase 5)

## Execution Order Realignment
1. `track9-followup-prowlarr-definition-runtime` (P0)
2. `track9-followup-metadata-provider-hardening` (P0)
3. `track9-followup-indexer-contract-normalization` (P1)
4. `track9-followup-release-lifecycle-stabilization` (P1)
5. `track9-followup-subtitle-variant-console` (P1)
6. Resume Track 7D/7E feature closure with parity blockers removed.
7. Allow Track 7F hardening completion only after gate criteria pass.

## Hardening Gate Policy
- `7F` completion gate: unresolved `P0/P1` parity findings must be zero.
- `PARITY_IMPLEMENTED` claim gate: each capability requires contract and runtime evidence in matrix and validation integrity report.

## Dependency Changes to Apply in Conductor Registry
- Add explicit dependency from Track 7F to closure of Phase 5 backlog items `RMB-001` through `RMB-005`.
- Annotate Track 7D subtitles scope to require `RMB-005` readiness checks.
- Annotate Track 7E dashboard/activity/settings scope to include metadata/indexer blocker verification from `RMB-001` and `RMB-002`.

## Non-Goal
- These recommendations do not start implementation work for 7D/7E/7F; they only establish gating and sequencing controls.
