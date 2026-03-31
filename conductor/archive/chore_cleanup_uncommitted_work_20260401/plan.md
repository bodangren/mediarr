# Plan: Cleanup Uncommitted Work

## Phase 1 — Revert secrets, remove junk, sort conductor state

- [x] Revert `.env` to HEAD (API keys must not be tracked) — 2cf5b28
- [x] Delete junk files: `conductor/opencode-cron.log`, `conductor/opencode-last-run.log`, `conductor/test-errors.txt`, `server/test-real-batch.ts` — 2cf5b28
- [x] Delete `mediarr.db.prisma.bak` (database backup, not source) — 2cf5b28
- [x] Commit conductor track archival moves (deleted from `tracks/`, added to `archive/`) — 2cf5b28
- [x] Verify test suite green: `CI=true npx vitest run server/` — 94 files, 682 passed

## Phase 2 — Commit frontend form migration

- [x] Stage and commit all `app/` changes as a single descriptive commit — 6eba8f1
- [x] Verify frontend build: `cd app && npm run build` — passes
- [x] Verify test suite green: `CI=true npx vitest run server/` — 94 files, 682 passed

## Phase 3 — Commit Flutter client changes

- [x] Stage and commit all `clients/mediarr-client/` changes as a single descriptive commit — dd4e4ed
- [x] Verify test suite green: `CI=true npx vitest run server/` — 94 files, 682 passed
- [x] Final verification: test suite + frontend build both green
