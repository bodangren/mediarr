# Plan — Re-check repaired subtitles (gave_up retry)

- [x] **P1.1 (Red/Green)** Failing test: a `gave_up` entry whose sidecar hash changed must be re-run; a
      legacy `gave_up` entry with no hash is retried once; an unchanged one is skipped.
      Evidence: the three new cases were red (3 failed) before the change and are green after;
      `SubtitleSyncService.test.ts` **17/17**.
- [x] **P1.2** Implement the skip rule + store `srtSha256`/`videoSize` on failure. Evidence: `run()`
      now skips gave_up only when the stored hash+video size prove the pair is unchanged; repaired or
      legacy entries are retried once (attempts seeded at the cap so one failure re-marks gave_up) and
      the failure branch records the hash/size proof for next time.
- [x] **P1.3** Deploy, confirm HIMYM S01E08 flips `gave_up` → `ok` on a real cycle, TV in sync; ledger.
      Evidence: the 00:42 cycle (first after the deploy) re-verified it — state now
      `status=ok, attempts=4, offsetSeconds=0, scale=1, syncedAt=2026-11-22T16:42:18Z`, i.e. the
      repaired sidecar was picked up and verified in sync. Ledger-wide: 2,621 entries, 2,378 ok,
      243 gave_up (the legacy retry pass re-attempted the old gave_up set once, as designed).
