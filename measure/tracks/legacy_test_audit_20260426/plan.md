# Legacy Test Audit — Implementation Plan

## Phase 1: Categorize Disabled Tests [ ]
- [ ] List all disabled tests in `app_src_backup/**`
- [ ] Categorize each as "restore" (still relevant) or "delete" (obsolete)
- [ ] Document rationale for each decision

## Phase 2: Restore Relevant Tests [ ]
- [ ] Move restored tests to active test directories
- [ ] Update imports and fixtures for current codebase
- [ ] Fix any failing restored tests
- [ ] Verify all restored tests pass

## Phase 3: Clean Up [ ]
- [ ] Delete obsolete test files
- [ ] Remove empty `app_src_backup/**` directories
- [ ] Run full test suite to confirm no regressions
