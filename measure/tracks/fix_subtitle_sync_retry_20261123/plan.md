# Plan — Re-check repaired subtitles (gave_up retry)

- [x] **P1.1 (Red/Green)** Failing test: a `gave_up` entry whose sidecar hash changed must be re-run; a
      legacy `gave_up` entry with no hash is retried once; an unchanged one is skipped.
      Evidence: the three new cases were red (3 failed) before the change and are green after;
      `SubtitleSyncService.test.ts` **17/17**.
- [x] **P1.2** Implement the skip rule + store `srtSha256`/`videoSize` on failure. Evidence: `run()`
      now skips gave_up only when the stored hash+video size prove the pair is unchanged; repaired or
      legacy entries are retried once (attempts seeded at the cap so one failure re-marks gave_up) and
      the failure branch records the hash/size proof for next time.
- [~] **P1.3** Deploy, confirm HIMYM S01E08 flips `gave_up` → `ok` on a real cycle, TV in sync; ledger.
