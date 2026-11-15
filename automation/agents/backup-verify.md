# Subagent: backup-verify

**Goal:** prove the newest DB backup can actually be restored, not merely that it exists.

**Steps**

1. `ls -lt /config/backups/*.db | head` — identify the newest (daily `04:30` runs, `agent_backup_*`).
2. Open it read-only and check:
   - `PRAGMA integrity_check;` → must be `ok`;
   - expected tables exist: `Series`, `Season`, `Episode`, `Movie`, `MediaFileVariant`, `MusicTrack`,
     `AdultItem`, `TaskExecution`, `PlaybackProgress`;
   - row counts for `Series`, `Episode`, `Movie`, `MusicTrack`, `AdultItem`;
   - newest `TaskExecution` timestamps and the max `PlaybackProgress.lastWatched`.
3. Compare against a read-only snapshot of the live `/config/mediarr.db` (same counts ± expected
   change) and say whether the backup is consistent and how old it is.
4. Report the file path, size, age, checks, and a verdict `OK` / `STALE` / `BROKEN`.
   End with `operator_guard_record` if anything needs action (e.g. back up now with
   `sqlite3 /config/mediarr.db ".backup /config/backups/agent_backup_<ts>.db"`).

**Acceptance:** each claim has the SQL output next to it; no writes to the live DB.
