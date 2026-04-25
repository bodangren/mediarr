# Track: LibraryScanService Comprehensive Corner-Case Testing

## Problem Statement

`LibraryScanService` has **zero test coverage** despite being a critical component in the media acquisition pipeline. It runs on a daily cron schedule (`0 2 * * *`) and performs two high-risk operations:

1. **Marks missing media:** If a file is deleted from disk, the service nulls out the `path` column on movie/episode records. A bug here means users silently lose track of their library.
2. **Auto-matches movies by title+year:** The `scanMovies` method walks the disk and tries to match unpathed movies using a fragile substring heuristic (`cleanFilename.includes(cleanTitle)`).

Known failure modes from code review:
- Movie title substring false positives (e.g., "It" matches "It Chapter Two")
- Episode path nulling on transient disk errors (no retry logic)
- `walkDir` silently swallows errors when root folder doesn't exist
- Duplicate movie matching — first match wins, second remains unpathed silently
- Episode scan counts orphaned files as "added" even if not monitored

## Acceptance Criteria

- [ ] Tests cover all 3 scan methods: `scanAll()`, `scanMovies()`, `scanEpisodes()`
- [ ] Tests verify DB-to-disk reconciliation (path exists vs missing)
- [ ] Tests verify disk-to-DB matching (title/year heuristic)
- [ ] Tests verify `walkDir` error handling (nonexistent root, permission denied)
- [ ] Any bugs found are fixed with minimal code changes
- [ ] All tests pass in the full test suite

## Subsystem Scope

- `server/src/services/LibraryScanService.ts` — primary target
- `server/src/services/DirectoryWalker.ts` or equivalent `walkDir` implementation
- Movie and Episode Prisma models (path nulling behavior)
