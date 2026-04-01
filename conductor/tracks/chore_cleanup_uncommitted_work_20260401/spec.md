# Spec: Cleanup Uncommitted Work

## Problem
Uncommitted changes from prior sessions are polluting the working tree:
- Deleted track folder files (leftover from archiving)
- Modified `.env` with new gateway keys (not secrets — local dev config)
- Minor artifact timestamp change
- `conductor/opencode-cron.log` untracked file

## Acceptance Criteria
- Working tree is clean (no modified or untracked files except `.env` local changes)
- No track files remain in `conductor/tracks/` that have been deleted on disk but not staged
- Pre-existing test failure in `tests/import-manager.test.js` is documented as known (already in tech-debt)

## Scope
- Commit the deletion of previously-archived track files
- Commit the artifact timestamp update
- Remove or gitignore `conductor/opencode-cron.log`
- Verify test suite passes at same baseline (1 pre-existing failure)
