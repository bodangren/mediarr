# Music playback + resume regression on the TV (2026-11-09, 1.3.58 / code 82)

Fresh device check after the coverage/queue/movie-detail changes (workstream 4 must not regress).

1. Music rail → screen shows **12 artists**, a **Continue listening · Pour Some Sugar On Me — at 2:32**
   banner, and artist cards with album/song counts (`tv-music-screen-20261109.png`).
2. AC/DC → Albums (Back in Black, POWER UP) → Back in Black → track list → OK: playback starts, the
   now-playing bar shows **Back in Black 0:05 / 4:13** with pause/prev/next and the resume banner is
   replaced (`tv-music-playing-20261109.png`).
3. Played ~25 s, then **force-stop** and relaunch → Music screen shows
   **Continue listening · Back in Black — at 0:44** (`tv-music-resume-20261109.png`) — the
   SharedPreferences snapshot survived a kill and restored the position.

Note: this test replaced the previous demo resume snapshot (Pour Some Sugar On Me 2:32) with the newly
played track; the banner now reflects what was actually last played.
