# B2c — Chinese subtitle acquisition + synchronization status (2026-11-08)

## Synchronization (unblocked part)
- Aligner: **ffsubsync 0.5.1** (audio-based, no same-language reference needed).
- `SubtitleSyncService` runs as `subtitle-sync` every 30 min, limit 5 per cycle,
  writes atomically and keeps a JSON ledger (`/config/subtitle-sync-state.json`);
  unalignable sidecars are retried and then marked `gave_up`, not churned forever.
- New `GET /api/subtitles/sync/status` (live):
  ```json
  { "attempted": 82, "ok": 80, "gaveUp": 2, "failed": 0, "other": 0,
    "candidates": 1512, "remaining": 1430 }
  ```
  Candidates are the Chinese sidecar tracks that actually have a file (1,512), not
  every media file. **80/82 aligned (97.6%)**, 2 gave up.
- At 5 items per 30-minute cycle the first full-library pass needs about 6 days of
  background work (1430 remaining, ~240/day). It runs on the scheduler and does
  not block playback.
- Earlier device measurement (from the task): a +10 s shifted `.zho.srt` realigned
  in 11 s; a second pass reported offset 0.000 s / scale 1.000, so the operation is
  idempotent.

## Acquisition (blocked, owner-gated)
Fetching *new* Chinese subtitles still requires an enabled provider; the providers
endpoint reports OpenSubtitles and ASSRT both disabled with `apiKey: null`
(see `subtitle-fetch-blocked-20261108.md`). Until a key is added the automation
service idles the fetch cycle by design, so acquisition cannot progress from code.

## Follow-up kept in the plan
Database-backed sync state (currently JSON) and raising the per-cycle limit are
deliberate follow-ups; the JSON ledger is the measured state today.
