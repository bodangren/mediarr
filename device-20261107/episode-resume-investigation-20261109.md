# Episode resume — investigation and current state (2026-11-09)

## Symptom
Resuming an **episode** from Home's Continue Watching starts at 0:00 even when the caller passes the
stored position (movie resume works; fixed earlier with 1.3.39 and device-verified at 38:45).

## What the telemetry proved
- The requested offset **does reach the playback service** (`resume requested` records:
  `requestedStartSeconds: 600, mediaId: 321, mediaType: episode`).
- Playback still begins at 0:00 (HUD `01:16` after ~76 s in `episode-resume-still-broken-20261109.png`),
  while the stored bookmark survives at 600 s because the progress-regression guard suppresses writes
  — so the guard works, the resume does not.
- **Root cause found:** one TV interaction reaches the service **twice** with identical parameters
  (two stack traces, both `_PlaybackScreen._playCurrentItem` → `PlaybackService.play`). Two overlapping
  `open(start:)` calls make mpv drop the start offset.

## Changes tried
1. `openFullscreenPlayback` debounce (duplicate selects within 800 ms ignored) — test-covered, but the
   duplicate comes from two screen instances, so it did not fix it.
2. `PlaybackService.play` now collapses **in-flight duplicate starts** (same media + resume offset
   returns the pending future). 1.3.45 device run then resumed at **10:10** (600 s + 10) and advanced
   the bookmark to 615 — evidence the race is the mechanism.
3. Resume retry window widened (20 attempts / 2 s, 120 s progress guard) — but a later reproduction
   still started at 0:00, so the fix is **not yet deterministic**.

## Honest status
- The pre-fix regression is understood and the bookmark can no longer be destroyed (guard + retries).
- Movie resume is verified. Episode resume worked once after the in-flight collapse and failed again
  on a later launch: there is still a second path that opens playback with an offset that lands as 0.
- Next step: log which two call sites start playback (stack + screen identity) and serialise at the
  service boundary instead of relying on key equality; then re-run the two-launch device check.

## Update — telemetry-corrected (2026-11-09 04:5x)
A latent bug in the retry logic explained the missing diagnostics: `_maybeRetryResume` returned from the
throttle branch *before* the exhaustion branch, so "resume seek did not take effect" could never be
reported once the budget was spent. Fixed:
- exhaustion is checked first and reports once with `target/actual/attempts/seekError`;
- the first thrown seek error is captured (`seekError`) so future reports say *why* seeking failed;
- retry interval/attempt cap are constructor-injectable, and a behaviour test pins "re-seeks when the
  player ignores startAt" plus "reports exactly once on exhaustion" (166 playback tests).

Device run with 1.3.48 (code 72) resumed at **10:46** (position 646 after 46 s) and wrote the bookmark
forward, so resume **can** still succeed; the failure is intermittent. The new `seekError` field will
tell us whether failed episodes throw on seek or simply keep reporting 0.
