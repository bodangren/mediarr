# Supervisor Acceptance Hardening

## Objective

Close the Measure automation-supervisor escape paths surfaced by the 2026-06-21 fleet completion audit:

- active tracks with every task marked complete must still receive final acceptance and closeout;
- UX audit must run for every phase, with a fast not-applicable result for non-UX work;
- live-contract, route-parity, production-wiring, and test-strategy violations must be blocking;
- final audit artifacts must remain inspectable after bulky run artifacts are cleaned.

## Acceptance Criteria

- [x] Active all-complete tracks under `measure/tracks/` are discovered as closeout candidates.
- [x] UX audit runs for every selected phase unless explicitly disabled, and UI changes without `PROJECT_DEV_URL` cannot pass.
- [x] Passing audit JSON cannot include hard-blocking violation arrays.
- [x] Mediarr-specific production-contract gates catch scheduler route parity and indexer-health runtime wiring gaps.
- [x] Cleanup retains final acceptance and closeout artifacts while removing bulky phase directories.
- [x] `python3 -m unittest measure/test_automation_supervisor.py` passes.
