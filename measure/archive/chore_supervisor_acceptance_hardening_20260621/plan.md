# Implementation Plan

## Phase 1: Supervisor Hardening

- [x] Add closeout-candidate discovery for active all-complete tracks. Verification: dry run shows scheduler-dashboard and indexer-health closeout candidates.
- [x] Require UX audit for every selected phase and support explicit not-applicable results. Verification: `test_ux_audit_allows_not_applicable_without_webbridge_evidence`, `test_ux_audit_blocks_ui_changes_without_dev_url`.
- [x] Make hard violation arrays blocking in audit results. Verification: `test_hard_blocking_audit_violation_fields_cannot_pass`.
- [x] Add Mediarr production-contract checks for scheduler route parity and indexer-health wiring. Verification: `test_mediarr_contract_gate_flags_scheduler_route_and_indexer_wiring_gaps`.
- [x] Retain final acceptance and closeout artifacts during run cleanup. Verification: `test_cleanup_remaining_track_artifacts_removes_safe_track_dir`.
- [x] Add regression tests for the hardening rules and run supervisor unit tests. Verification: `python3 -m py_compile measure/automation-supervisor.py && python3 -m unittest measure/test_automation_supervisor.py` passed on 2026-06-21.
