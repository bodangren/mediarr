# Spec — Subtitles that failed alignment must be re-checked when the file changes

Owner report 2026-11-22: *"Subs for How I met your mother in season 1 from episode 8 don't match the
video."* Diagnosis: E08's sidecar was **-42.8 s** out of sync; the engine's `subtitle-sync` had recorded
the episode as `gave_up` after 3 attempts and **never re-examined it**, even after the sidecar was
repaired. 219 `gave_up` entries exist in the ledger — the same trap for every one of them.

## Root cause
`SubtitleSyncService.run`: `if (entry && entry.status === 'gave_up') { skipped++; continue; }` skips
unconditionally. A `gave_up` entry also stores no `srtSha256`/`videoSize`, so even the "unchanged" test
used for `ok` entries cannot run.

## Requirements
1. A `gave_up` sidecar is **skipped only when the stored hash proves it is unchanged**.
2. Legacy `gave_up` entries with no stored hash are **re-attempted once** (they may have been repaired);
   a single new failure re-marks `gave_up` rather than churning three more times.
3. Failures store `srtSha256` + `videoSize`, so future skips work exactly like `ok` entries.
4. Tests cover: unchanged gave_up skipped, changed gave_up re-aligned, legacy gave_up retried once.

## Acceptance
- New unit tests green, existing sync tests green, server tsc clean.
- HIMYM S01E08 flips from `gave_up` to `ok` on the next cycle after the repair, verified from the state
  file, and the TV plays it in sync.
