# TV Phase 4 — YouTube: device evidence (2026-11-10)

Build **1.3.73 / code 97**, installed on X96Max `192.168.10.60:5555` (`adb install -r` → Success),
published to `client-updates` (97). Server healthy, `/api/youtube/videos` reports 347 available.

## Measured on device

| Check | Result |
| --- | --- |
| Channels view | 347 videos; page-wide **Play all** + per-channel **Play all** / See all (`tv-youtube-channels-playall-20261110.png`) |
| All videos view | search field, **Play all**, View menu; first card shows progress bar + `Resume · 10:26` (`tv-youtube-all-videos-state-20261110.png`) |
| Play all starts the shown list | opened **Nest.js REST API with Prisma ORM, Neon Postgres** (server id 341, first item of `sort=added`) |
| Queue advance | HUD next → **NestJS Fundamentals - Providers tutorial** (id 343, 27:35, resumed 00:05) — `tv-youtube-playall-next-20261110.png` |
| Stop/exit | MEDIA_STOP returns to the library with focus back on **Play all**, not the first card |

The grid card fix (`ca12d868`) is what made the watched/resume row visible in the 5-column All
videos grid; before it the fixed-width card clipped that row off the card bottom (caught on device,
2026-11-10 08:15).

## Tests

- `flutter test --no-pub test/features/playback test/features/library/youtube_*` → **174 passed**
  (includes new `youtube_queue_test.dart`: queue builder + player advance to the YouTube stream
  endpoint, and `youtube_all_videos_test.dart`: Play all sends the filtered order / channel order,
  indicators in both views).
- `flutter analyze --no-pub` → **No issues found**.

## Open in this phase

Nothing functional. Autoplay of the next YouTube video at end-of-stream uses the same Up Next
countdown as episodes (15 s, any key cancels); verified by unit/widget test, not by waiting out a
40-minute video on the TV.
