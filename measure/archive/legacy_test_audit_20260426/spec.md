# Legacy Test Audit

## Problem
300+ legacy tests are disabled in `app_src_backup/**`. These tests add noise to the codebase and may contain valuable coverage that should be restored or explicitly removed.

## Solution
Audit all disabled tests, restore valuable ones to the active test suite, and delete obsolete ones.

## Acceptance Criteria
- [ ] All 300+ disabled tests categorized as "restore" or "delete"
- [ ] Restored tests pass in current codebase
- [ ] Obsolete tests removed from `app_src_backup/**`
- [ ] Test coverage maintained or improved
