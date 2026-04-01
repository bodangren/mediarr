# Plan: Cleanup Uncommitted Work

## Phase 1 — Stage and commit deletions + artifact update
- [~] Stage the deleted track folder files and artifact change
- [ ] Commit with descriptive message
- [ ] Run test suite to confirm baseline (1 pre-existing failure in legacy test)

## Phase 2 — Clean up untracked files
- [ ] Add `conductor/opencode-cron.log` to `.gitignore`
- [ ] Commit `.gitignore` update
- [ ] Verify `git status` is clean
