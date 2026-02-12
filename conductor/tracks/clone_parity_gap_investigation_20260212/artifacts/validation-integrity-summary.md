# Validation Integrity Analyzer Output (Phase 4)

## Analyzer Inputs
- Test sources: `tests/**/*.test.*`, `app/src/**/*.test.*`
- Matrix source: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/parity-matrix.json`
- Runtime evidence sources:
  - `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/`
  - `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/`

## Output Artifact
- `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/validation-integrity-report.json`

## Key Results
- Surface mock-ratio highlights:
  - `add`: `1.0` (all observed tests mocked)
  - `library`: `1.0` (all observed tests mocked)
  - `queue`: `0.5`
  - `indexers`: `0.1111`
- Backend route-group coverage signals:
  - `indexers`: contract test files `2`, runtime evidence files `2`
  - `releases`: contract test files `3`, runtime evidence files `0` (runtime evidence exists but naming is not group-prefixed)
  - `operations`: contract test files `3`, runtime evidence files `0` (evidence mapped via supplemental flow links)
- Critical flow non-mocked path coverage:
  - All tracked flows currently resolve to at least one non-mocked path via runtime or contract evidence.
- Capability confidence:
  - High confidence where matrix entries have both tests and runtime artifacts.
  - Medium confidence where runtime artifacts are missing but contract/unit tests exist.

## Policy Gate
- Parity claim policy requires: `unit`, `contract`, `integration_or_runtime`.
- Rule: parity-implemented status cannot be claimed without a non-mocked verification class.
