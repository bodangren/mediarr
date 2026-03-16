# Spec: seriesRoutes — import/apply & rescan corner cases

## Problem Statement

`server/src/api/routes/seriesRoutes.ts` contains three file-system-touching endpoints with zero test coverage and several known or suspected bugs:

1. **`POST /api/series/:id/rescan`** — has an unstaged bug: the `episode.upsert` update clause was missing `seriesId: id`, meaning a rescan could fail to re-link an episode to its series when the tvdbId already existed across series. Adjacent corner cases (empty episodes list, missing metadata provider, scan folder unreadable) are also untested.

2. **`POST /api/series/import/apply`** — a 5th import path completely outside `ImportManager`. It loops over user-submitted files, moves them to a destination folder, then creates `MediaFileVariant` DB rows. Multiple corner cases are untested:
   - Empty files array (silent no-op)
   - Series not found / no path / episode not found → partial failures
   - Path traversal via `series.title` (safePath should throw but this is untested)
   - `fs.rename` failure (EXDEV, permissions)
   - `mediaFileVariant.create` unique-constraint violation
   - Mixed success/failure in a batch

3. **`POST /api/series/import/scan`** — the path-validation guard (not a directory, path doesn't exist) is untested.

## Acceptance Criteria

- All three endpoints have Vitest test coverage for every branch listed above.
- The `seriesId: id` fix in the rescan upsert is committed and covered by a test.
- No regressions in existing test suite.

## Subsystem Scope

- `server/src/api/routes/seriesRoutes.ts`
- New test file: `server/src/api/routes/seriesRoutes.importRescan.test.ts`
