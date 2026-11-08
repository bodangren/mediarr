# Daily staging tidy (B7 "tidy 04:30", 2026-11-09)

`server/src/services/StagingTidyService.ts` + scheduler task `staging-tidy` (daily 04:30):

- removes only **abandoned tool artefacts** older than 6 h in the download staging areas
  (`/data/Music/_incoming`, `/data/Youtube/Uncategorized`): `.part`, `.ytdl`, `.tmp`, `.temp`, plus
  empty files older than 6 h;
- never touches media by extension policy (a `.m4a`/`.mp4` is only removed if it is 0 bytes and old);
- plan and apply are separate, so a dry run is just `planTidy()`.

## Live verification
1. First trigger on the real filesystem: task SUCCESS, nothing to delete.
2. Created a synthetic abandoned file `/data/Music/_incoming/tidy-test.part` back-dated to 2026-11-08.
3. Trigger again → journal: **`Staging tidy: deleted 1 abandoned file(s), 8 bytes`**, and the file is
   gone.

Tests: 2 unit tests (classification incl. age gate; real temp dir keeps media and deletes the partial).

## Remaining B7 timers
- `music-nightly-receipt` 05:10 already exists (server side).
- `youtube-retention` 05:45 already exists.
- **Nightly receipt 05:00 aggregate + weekly backup timer** are still open; backup scheduling is
  deliberately unimplemented in `BackupService.getSchedule()` (`supported:false`) until the host
  cutover, so a timer there would currently have nothing honest to do.
