# Client-error triage loop bookkeeping — Plan

Spec: `spec.md`.

## Phase 1 — Keep the high-water mark honest [checkpoint: TBD]

- [~] Task: Keep the triage loop's bookkeeping under Measure. Advance
      `device-20261107/client-errors-seen.txt` to the newest triaged `receivedAt` whenever the log
      grows, record each new fingerprint's disposition in the plan, and route any P0/P1 fix to the
      track that owns it.
- [ ] Task: When the scheduled triage loop is retired, close this track (mark the mark-file
      hand-off in the scheduled task's own docs) and archive it.

## Triage ledger

| Date | Fingerprint | Severity | Disposition |
|---|---|---|---|
| 2026-11-27 22:09 | `resume seek did not take effect (enforceResume)` | playback | P2 fixed in `6fe5c1fa`, shipped APK 1.3.97/155 — owned by `feature_tv_home_redesign_20260924` |
| 2026-11-28 10:37 | `Health check failed: server unreachable` (route `/discovery`) | network | P2, transient engine stall (loop stalls 0.3–0.8 s during sidecar/embedded sweeps); no code change; residual follow-up owned by `fix_engine_stall_playback_20261126` |
| 2026-11-28 12:11 | 24 × `HTTP network GET /api/youtube/{queue,latest,videos}` / `GET /api/music/artists` :: receiveTimeout after 30 s | http | P1, engine starved by ffsubsync (event loop stalled 392 s) — fixed in `449b5fa`, track `fix_subtitle_sync_cpu_starvation_20261128` archived |
| 2026-11-28 12:20 | Found during triage: `YoutubeVideo` 1069 AVAILABLE but audio-only → TV blank picture at 4.9 fps | playback-quality | P1, transcode-output validation added in `7bf155ee`, row repaired (720p re-fetch + profile transcode); track `fix_youtube_audioonly_available_20261128` archived |
