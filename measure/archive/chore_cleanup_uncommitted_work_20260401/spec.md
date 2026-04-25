# Spec: Cleanup Uncommitted Work

## Problem
62 uncommitted files exist in the working tree from multiple prior tracks. These include:
- Frontend form migration (legacy `form-compat` → shadcn `Input`/`Label`/`Checkbox`)
- Flutter client mDNS fixes and model updates
- Measure track archival moves (deletions + new archive entries)
- Pre-planned track folders from the roadmap
- Junk/temp files (cron logs, test artifacts, DB backup, test-real-batch.ts)

## Acceptance Criteria
1. All source code changes committed in logical, descriptive commits (NOT one giant commit)
2. `.env` changes reverted (API keys must not be committed)
3. Junk/temp files removed from the working tree
4. Measure track archival state is consistent
5. Full test suite passes (`CI=true npx vitest run server/`)
6. Frontend build passes (`cd app && npm run build`)
