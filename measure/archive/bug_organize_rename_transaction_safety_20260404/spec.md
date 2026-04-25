# Spec: SeriesOrganizeService applyRename Transaction Safety

## Problem Statement

`SeriesOrganizeService.applyRename` performs a filesystem rename (`fs.rename`) followed by a database path update. If the DB update fails after the file has been moved on disk, the system is left in an inconsistent state: the file exists at the new location but the database still references the old path. This creates orphaned files and broken import records.

## Acceptance Criteria

1. `applyRename` must perform DB update BEFORE filesystem rename, OR implement rollback if DB update fails
2. If DB update fails, the file must remain at its original location (no partial state)
3. If filesystem rename fails after DB update, the DB path must be rolled back to the original value
4. All existing tests must continue to pass
5. New tests must cover all failure scenarios (DB fail, fs fail, both fail)

## Subsystem Scope

- `server/src/services/organize/SeriesOrganizeService.ts` — `applyRename` method
- `server/src/services/organize/MovieOrganizeService.ts` — verify same pattern exists and fix if present
- Related test files for both services

## Current Behavior (Bug)

```typescript
// Current order (WRONG):
await fs.rename(oldPath, newPath); // File moved on disk
await db.episode.update({ data: { path: newPath } }); // If this fails, file is orphaned
```

## Expected Behavior

```typescript
// Correct order with rollback:
await db.episode.update({ data: { path: newPath } }); // DB first
try {
  await fs.rename(oldPath, newPath); // Then filesystem
} catch (err) {
  await db.episode.update({ data: { path: oldPath } }); // Rollback DB
  throw err;
}
```

## Notes

- MovieOrganizeService may have the same issue — audit and fix if present
- Consider using a transaction wrapper if the database supports it
- The rollback approach ensures atomicity even without database transactions
