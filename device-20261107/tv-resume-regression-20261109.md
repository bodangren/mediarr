# Resume regression check after the client changes (2026-11-09, TV 1.3.56 / code 80)

Purpose: prove the episode-resume path still works after the coverage screen, YouTube queue and detail
chip changes (workstream 6: resume never regresses).

## Steps
1. Recorded a fresh playback position for one episode with no prior state:
   `POST /api/playback/progress {type: episode, mediaId: 4152 (American Dad! S01E07), position: 600, duration: 2100}`.
2. Force-stopped and relaunched the client.
3. Home hero and Continue Watching both showed **American Dad! S01E07 · 29% · Resume at 10:00**
   (`tv-resume-home-20261109.png`).
4. Pressed DOWN then OK on the Continue Watching card.
5. Playback started; the server row then read **position 653 s** (10:53), duration 1313 s — i.e. playback
   continued from 10:00 instead of restarting at 0:00. No HUD screenshot was captured before auto-hide,
   but the persisted position is the authoritative measurement.

## Cleanup
The test row was deleted afterwards (`select count(*) ... = 0`), so no owner state was left changed.

## Also green in this window
SPA full suite: **exit 0** (589 s), after the YouTube queue strip and movie-detail chip changes.
