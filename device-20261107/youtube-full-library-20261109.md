# The YouTube library no longer hides ~100 videos (2026-11-09)

## Finding
The TV header said `YouTube · 200 videos` while the queue line said `299 available`. Both clients used
the API's default limit of **200**, so 99 downloaded videos were simply not rendered — and per-channel
counts were understated (CodeStoic 81 instead of 132).

## Fix
- TV `YoutubeLibraryScreen` requests `getYoutubeVideos(limit: 500)` (the API caps at 500).
- SPA `YoutubeLibraryPage` requests `api.youtubeApi.listVideos(500)`.

## Verification
- **Device (1.3.58 / code 82):** header `YouTube · 299 videos`, `CodeStoic · 132 videos` (was 81),
  `Codevelution · 92` (was 63) — queue line unchanged.
- **SPA `/youtube`:** `DAVE GRAY (74)` (was 55) with the 299/316/40/1 queue strip.
- tsc, SPA build, SPA page test and the TV widget test are green.
