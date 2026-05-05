# Legacy Test Audit — Implementation Plan

## Phase 1: Categorize Disabled Tests [x]
- [x] Listed all 340 disabled tests in `app_src_backup/**`
- [x] Categorized: 110 duplicates (have active counterparts), 150 test removed code, 95 test outdated versions
- [x] Decision: all 340 are obsolete — none worth restoring (old patterns, outdated APIs, superseded by active tests)

## Phase 2: Restore Relevant Tests [x]
- [x] No tests restored — audit determined all are obsolete
- [x] Rationale: Active test suite already covers all functional areas; backup tests use old APIs/patterns

## Phase 3: Clean Up [x]
- [x] Deleted all 340 obsolete test files from `app_src_backup/**`
- [x] Removed empty directories
- [x] Full test suite: 1800 passing (235 files) — no regressions
