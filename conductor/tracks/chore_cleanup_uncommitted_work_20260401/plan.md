# Plan: Cleanup Uncommitted Work

## Phase 1 — Revert secrets, remove junk, sort conductor state

- [ ] Revert `.env` to HEAD (API keys must not be tracked)
- [ ] Delete junk files: `conductor/opencode-cron.log`, `conductor/opencode-last-run.log`, `conductor/test-errors.txt`, `server/test-real-batch.ts`
- [ ] Delete `mediarr.db.prisma.bak` (database backup, not source)
- [ ] Commit conductor track archival moves (deleted from `tracks/`, added to `archive/`)
- [ ] Verify test suite green: `CI=true npx vitest run server/`

## Phase 2 — Commit frontend form migration

- [ ] Stage and commit all `app/` changes as a single descriptive commit
- [ ] Verify frontend build: `cd app && npm run build`
- [ ] Verify test suite green: `CI=true npx vitest run server/`

## Phase 3 — Commit Flutter client changes

- [ ] Stage and commit all `clients/mediarr-client/` changes as a single descriptive commit
- [ ] Verify test suite green: `CI=true npx vitest run server/`
- [ ] Final verification: test suite + frontend build both green
